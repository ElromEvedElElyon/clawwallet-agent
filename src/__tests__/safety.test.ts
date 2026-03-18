import { describe, it, expect, beforeEach } from "vitest";
import { SafetyGuard } from "../safety.js";
import type { TransactionRequest } from "../types.js";

describe("SafetyGuard", () => {
  let guard: SafetyGuard;

  const makeReq = (overrides?: Partial<TransactionRequest>): TransactionRequest => ({
    chain: "ethereum",
    to: "0x742d35Cc6634C0532925a3b844Bc9e7595f8f44",
    amount: "0.01",
    ...overrides,
  });

  beforeEach(() => {
    guard = new SafetyGuard({
      maxSingleTxUsd: 100,
      dailyTxLimitUsd: 500,
      requireConfirmationAboveUsd: 50,
      whitelistedAddresses: ["0xWhitelisted1111111111111111111111111111"],
      blockedAddresses: ["0xBlocked0000000000000000000000000000000"],
    });
  });

  describe("blocked addresses", () => {
    it("should reject transactions to blocked addresses", () => {
      const result = guard.checkTransaction(
        makeReq({ to: "0xBlocked0000000000000000000000000000000" }),
        10,
      );
      expect(result.approved).toBe(false);
      expect(result.reason).toBe("Address is blocked");
      expect(result.requiresConfirmation).toBe(false);
    });

    it("should approve transactions to non-blocked addresses", () => {
      const result = guard.checkTransaction(makeReq(), 10);
      expect(result.approved).toBe(true);
    });
  });

  describe("single transaction limit", () => {
    it("should reject transactions exceeding the single tx limit", () => {
      const result = guard.checkTransaction(makeReq(), 150);
      expect(result.approved).toBe(false);
      expect(result.reason).toContain("exceeds single tx limit");
    });

    it("should approve transactions at exactly the single tx limit", () => {
      const result = guard.checkTransaction(makeReq(), 100);
      expect(result.approved).toBe(true);
    });

    it("should approve transactions below the single tx limit", () => {
      const result = guard.checkTransaction(makeReq(), 50);
      expect(result.approved).toBe(true);
    });
  });

  describe("daily limit", () => {
    it("should reject when daily limit would be exceeded", () => {
      // First tx: $300 — approved
      const r1 = guard.checkTransaction(makeReq(), 90);
      expect(r1.approved).toBe(true);

      // Second tx: $300 — would make daily total $600 > $500
      // But we need to stay under single tx limit of 100 too
      // Spend 90 five times: 90*5=450, then 90 again = 540 > 500
      guard.checkTransaction(makeReq(), 90);
      guard.checkTransaction(makeReq(), 90);
      guard.checkTransaction(makeReq(), 90);
      guard.checkTransaction(makeReq(), 90);

      // Now daily total is 450. Next 90 would be 540 > 500
      const result = guard.checkTransaction(makeReq(), 90);
      expect(result.approved).toBe(false);
      expect(result.reason).toContain("Daily limit");
    });

    it("should track cumulative daily spending correctly", () => {
      guard.checkTransaction(makeReq(), 40);
      guard.checkTransaction(makeReq(), 40);
      guard.checkTransaction(makeReq(), 40);

      const stats = guard.getDailyStats();
      expect(stats.total).toBe(120);
      expect(stats.remaining).toBe(380);
    });
  });

  describe("confirmation requirement", () => {
    it("should require confirmation for amounts above threshold to non-whitelisted addresses", () => {
      const result = guard.checkTransaction(makeReq(), 75);
      expect(result.approved).toBe(true);
      expect(result.requiresConfirmation).toBe(true);
    });

    it("should NOT require confirmation for amounts below threshold", () => {
      const result = guard.checkTransaction(makeReq(), 30);
      expect(result.approved).toBe(true);
      expect(result.requiresConfirmation).toBe(false);
    });

    it("should NOT require confirmation for whitelisted addresses even above threshold", () => {
      const result = guard.checkTransaction(
        makeReq({ to: "0xWhitelisted1111111111111111111111111111" }),
        75,
      );
      expect(result.approved).toBe(true);
      expect(result.requiresConfirmation).toBe(false);
    });

    it("should NOT require confirmation at exactly the threshold", () => {
      const result = guard.checkTransaction(makeReq(), 50);
      expect(result.approved).toBe(true);
      expect(result.requiresConfirmation).toBe(false);
    });
  });

  describe("audit log", () => {
    it("should record approved transactions", () => {
      guard.checkTransaction(makeReq(), 20);
      const log = guard.getAuditLog();
      expect(log).toHaveLength(1);
      expect(log[0].approved).toBe(true);
      expect(log[0].action).toBe("APPROVED");
      expect(log[0].chain).toBe("ethereum");
    });

    it("should record blocked transactions", () => {
      guard.checkTransaction(
        makeReq({ to: "0xBlocked0000000000000000000000000000000" }),
        20,
      );
      const log = guard.getAuditLog();
      expect(log).toHaveLength(1);
      expect(log[0].approved).toBe(false);
      expect(log[0].action).toBe("BLOCKED");
    });

    it("should record limit-exceeded rejections", () => {
      guard.checkTransaction(makeReq(), 200);
      const log = guard.getAuditLog();
      expect(log).toHaveLength(1);
      expect(log[0].approved).toBe(false);
      expect(log[0].action).toBe("LIMIT_EXCEEDED");
    });

    it("should record daily limit rejections", () => {
      // Fill up daily limit
      for (let i = 0; i < 5; i++) {
        guard.checkTransaction(makeReq(), 95);
      }
      // This one pushes over
      guard.checkTransaction(makeReq(), 95);

      const log = guard.getAuditLog();
      const lastEntry = log[log.length - 1];
      expect(lastEntry.approved).toBe(false);
      expect(lastEntry.action).toBe("DAILY_LIMIT");
    });

    it("should return a copy of the audit log (not a reference)", () => {
      guard.checkTransaction(makeReq(), 20);
      const log1 = guard.getAuditLog();
      const log2 = guard.getAuditLog();
      expect(log1).not.toBe(log2);
      expect(log1).toEqual(log2);
    });
  });

  describe("daily stats", () => {
    it("should return correct initial stats", () => {
      const stats = guard.getDailyStats();
      expect(stats.total).toBe(0);
      expect(stats.remaining).toBe(500);
      expect(stats.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should update stats after transactions", () => {
      guard.checkTransaction(makeReq(), 25);
      guard.checkTransaction(makeReq(), 75);
      const stats = guard.getDailyStats();
      expect(stats.total).toBe(100);
      expect(stats.remaining).toBe(400);
    });

    it("should not count rejected transactions in daily total", () => {
      guard.checkTransaction(makeReq(), 25); // approved
      guard.checkTransaction(makeReq(), 200); // rejected (over single limit)
      const stats = guard.getDailyStats();
      expect(stats.total).toBe(25);
      expect(stats.remaining).toBe(475);
    });
  });

  describe("default configuration", () => {
    it("should use sensible defaults when no config provided", () => {
      const defaultGuard = new SafetyGuard();
      // Default maxSingleTxUsd is 100
      const result = defaultGuard.checkTransaction(makeReq(), 99);
      expect(result.approved).toBe(true);

      const result2 = defaultGuard.checkTransaction(makeReq(), 101);
      expect(result2.approved).toBe(false);
    });

    it("should allow partial config overrides", () => {
      const partial = new SafetyGuard({ maxSingleTxUsd: 500 });
      const result = partial.checkTransaction(makeReq(), 250);
      expect(result.approved).toBe(true);
    });
  });

  describe("multi-chain transactions", () => {
    it("should validate transactions across different chains", () => {
      const chains = ["ethereum", "bitcoin", "solana", "polygon"];
      for (const chain of chains) {
        const result = guard.checkTransaction(makeReq({ chain }), 10);
        expect(result.approved).toBe(true);
      }
      const stats = guard.getDailyStats();
      expect(stats.total).toBe(40);
    });
  });

  describe("priority of checks", () => {
    it("should check blocked address before amount limits", () => {
      // Even with $0 amount, blocked address should be rejected
      const result = guard.checkTransaction(
        makeReq({ to: "0xBlocked0000000000000000000000000000000" }),
        0,
      );
      expect(result.approved).toBe(false);
      expect(result.reason).toBe("Address is blocked");
    });

    it("should check single tx limit before daily limit", () => {
      const result = guard.checkTransaction(makeReq(), 150);
      expect(result.approved).toBe(false);
      expect(result.reason).toContain("exceeds single tx limit");
      // Daily total should NOT be affected
      const stats = guard.getDailyStats();
      expect(stats.total).toBe(0);
    });
  });
});
