import { describe, it, expect, beforeEach } from "vitest";
import { ClawWalletAgent } from "../agent.js";
import type { AgentCommand } from "../types.js";

describe("ClawWalletAgent — Command Parser", () => {
  let agent: ClawWalletAgent;

  beforeEach(() => {
    agent = new ClawWalletAgent();
  });

  describe("quit/exit commands", () => {
    it.each(["quit", "exit", "q", ""])("should parse '%s' as quit intent", (input) => {
      const cmd = agent.parseCommand(input);
      expect(cmd.intent).toBe("quit");
    });
  });

  describe("help commands", () => {
    it.each(["help", "h", "?"])("should parse '%s' as help intent", (input) => {
      const cmd = agent.parseCommand(input);
      expect(cmd.intent).toBe("help");
    });
  });

  describe("balance commands", () => {
    it("should parse 'balance' as balance intent with no chain", () => {
      const cmd = agent.parseCommand("balance");
      expect(cmd.intent).toBe("balance");
      expect(cmd.chain).toBeUndefined();
    });

    it("should parse 'balance ethereum' with chain", () => {
      const cmd = agent.parseCommand("balance ethereum");
      expect(cmd.intent).toBe("balance");
      expect(cmd.chain).toBe("ethereum");
    });

    it("should parse 'bal bitcoin' as balance with chain", () => {
      const cmd = agent.parseCommand("bal bitcoin");
      expect(cmd.intent).toBe("balance");
      expect(cmd.chain).toBe("bitcoin");
    });

    it("should parse 'b' as balance intent", () => {
      const cmd = agent.parseCommand("b");
      expect(cmd.intent).toBe("balance");
    });
  });

  describe("portfolio commands", () => {
    it.each(["portfolio", "p", "overview"])("should parse '%s' as portfolio intent", (input) => {
      const cmd = agent.parseCommand(input);
      expect(cmd.intent).toBe("portfolio");
    });
  });

  describe("send commands", () => {
    it("should parse a full send command with 'to' keyword", () => {
      const cmd = agent.parseCommand("send 0.5 ETH to 0xabc123");
      expect(cmd.intent).toBe("send");
      expect(cmd.amount).toBe("0.5");
      expect(cmd.token).toBe("eth");
      expect(cmd.to).toBe("0xabc123");
    });

    it("should parse a full transfer command", () => {
      const cmd = agent.parseCommand("transfer 100 USDT to 0xdef456");
      expect(cmd.intent).toBe("send");
      expect(cmd.amount).toBe("100");
      expect(cmd.token).toBe("usdt");
      expect(cmd.to).toBe("0xdef456");
    });

    it("should parse send without 'to' keyword", () => {
      const cmd = agent.parseCommand("send 1.5 BTC 0xabc123");
      expect(cmd.intent).toBe("send");
      expect(cmd.amount).toBe("1.5");
      expect(cmd.token).toBe("btc");
      expect(cmd.to).toBe("0xabc123");
    });

    it("should handle incomplete send command gracefully", () => {
      const cmd = agent.parseCommand("send");
      expect(cmd.intent).toBe("send");
      expect(cmd.amount).toBeUndefined();
      expect(cmd.to).toBeUndefined();
    });

    it("should infer chain from token for ETH", () => {
      const cmd = agent.parseCommand("send 0.1 ETH to 0xabc");
      expect(cmd.chain).toBe("ethereum");
    });

    it("should infer chain from token for BTC", () => {
      const cmd = agent.parseCommand("send 0.01 BTC to bc1qabc");
      expect(cmd.chain).toBe("bitcoin");
    });

    it("should infer chain from token for SOL", () => {
      const cmd = agent.parseCommand("send 5 SOL to 7xKXabc");
      expect(cmd.chain).toBe("solana");
    });

    it("should infer chain from token for MATIC", () => {
      const cmd = agent.parseCommand("send 100 MATIC to 0xabc");
      expect(cmd.chain).toBe("polygon");
    });
  });

  describe("swap commands", () => {
    it("should parse 'swap' as swap intent", () => {
      const cmd = agent.parseCommand("swap 100 USDT to ETH");
      expect(cmd.intent).toBe("swap");
    });
  });

  describe("strategy commands", () => {
    it("should parse 'strategy list' with strategyName", () => {
      const cmd = agent.parseCommand("strategy list");
      expect(cmd.intent).toBe("strategy");
      expect(cmd.strategyName).toBe("list");
    });

    it("should parse 'strategy' alone", () => {
      const cmd = agent.parseCommand("strategy");
      expect(cmd.intent).toBe("strategy");
      expect(cmd.strategyName).toBeUndefined();
    });

    it("should parse 'strat activate dca' as strategy", () => {
      const cmd = agent.parseCommand("strat activate dca");
      expect(cmd.intent).toBe("strategy");
      expect(cmd.strategyName).toBe("activate");
    });
  });

  describe("history commands", () => {
    it.each(["history", "audit"])("should parse '%s' as history intent", (input) => {
      const cmd = agent.parseCommand(input);
      expect(cmd.intent).toBe("history");
    });
  });

  describe("unknown commands", () => {
    it("should parse unrecognized input as unknown", () => {
      const cmd = agent.parseCommand("do something random");
      expect(cmd.intent).toBe("unknown");
      expect(cmd.raw).toBe("do something random");
    });

    it("should parse nonsense as unknown", () => {
      const cmd = agent.parseCommand("xyzzy");
      expect(cmd.intent).toBe("unknown");
    });
  });

  describe("raw field preservation", () => {
    it("should always store the trimmed lowercase raw input", () => {
      const cmd = agent.parseCommand("  BALANCE Ethereum  ");
      expect(cmd.raw).toBe("balance ethereum");
    });
  });

  describe("whitespace handling", () => {
    it("should handle extra whitespace in commands", () => {
      const cmd = agent.parseCommand("  balance   ethereum  ");
      expect(cmd.intent).toBe("balance");
      expect(cmd.chain).toBe("ethereum");
    });

    it("should handle tabs and mixed whitespace", () => {
      const cmd = agent.parseCommand("\thelp\t");
      expect(cmd.intent).toBe("help");
    });
  });

  describe("executeCommand", () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    it("should return EXIT for quit command", async () => {
      const result = await agent.executeCommand({ intent: "quit", raw: "quit" });
      expect(result).toBe("EXIT");
    });

    it("should return help text for help command", async () => {
      const result = await agent.executeCommand({ intent: "help", raw: "help" });
      expect(result).toContain("Commands");
      expect(result).toContain("balance");
      expect(result).toContain("send");
      expect(result).toContain("portfolio");
    });

    it("should return error message for unknown command", async () => {
      const result = await agent.executeCommand({ intent: "unknown", raw: "gibberish" });
      expect(result).toContain("Unknown command");
      expect(result).toContain("gibberish");
    });

    it("should return balance data for balance command", async () => {
      const result = await agent.executeCommand({ intent: "balance", raw: "balance" });
      expect(result).toContain("Balance");
    });

    it("should return balance for specific chain", async () => {
      const result = await agent.executeCommand({ intent: "balance", chain: "ethereum", raw: "balance ethereum" });
      expect(result).toContain("ETHEREUM");
      expect(result).toContain("ETH");
    });

    it("should return portfolio overview", async () => {
      const result = await agent.executeCommand({ intent: "portfolio", raw: "portfolio" });
      expect(result).toContain("Portfolio");
      expect(result).toContain("Safety");
      expect(result).toContain("Strategies");
    });

    it("should return usage message for incomplete send", async () => {
      const result = await agent.executeCommand({ intent: "send", raw: "send" });
      expect(result).toContain("Usage");
    });

    it("should return strategy list", async () => {
      const result = await agent.executeCommand({ intent: "strategy", strategyName: "list", raw: "strategy list" });
      expect(result).toContain("Strategies");
      expect(result).toContain("DCA");
    });

    it("should return audit log for history command", async () => {
      const result = await agent.executeCommand({ intent: "history", raw: "history" });
      expect(result).toContain("audit log");
    });
  });
});
