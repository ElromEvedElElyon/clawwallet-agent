import type { Strategy } from "./types.js";
import { WalletManager } from "./wallets.js";
import { SafetyGuard } from "./safety.js";

export class StrategyEngine {
  private strategies: Map<string, Strategy> = new Map();
  private wallets: WalletManager;
  private safety: SafetyGuard;

  constructor(wallets: WalletManager, safety: SafetyGuard) {
    this.wallets = wallets;
    this.safety = safety;
    this.registerDefaultStrategies();
  }

  private registerDefaultStrategies(): void {
    this.strategies.set("dca-eth", {
      name: "DCA into ETH",
      type: "dca",
      active: false,
      params: { targetChain: "ethereum", amountUsd: 10, frequency: "daily" },
      intervalMs: 86400000,
    });

    this.strategies.set("rebalance-60-40", {
      name: "Rebalance 60/40 ETH/BTC",
      type: "rebalance",
      params: { ethereum: 0.6, bitcoin: 0.4, threshold: 0.05 },
      active: false,
      intervalMs: 604800000,
    });

    this.strategies.set("yield-stables", {
      name: "Yield on stablecoins",
      type: "yield",
      params: { minApy: 3.0, maxExposure: 0.5, protocols: ["aave", "velora"] },
      active: false,
      intervalMs: 86400000,
    });
  }

  getStrategies(): Strategy[] {
    return Array.from(this.strategies.values());
  }

  async activateStrategy(name: string): Promise<boolean> {
    const strategy = this.strategies.get(name);
    if (!strategy) return false;
    strategy.active = true;
    console.log(`[Strategy] Activated: ${strategy.name}`);
    return true;
  }

  async deactivateStrategy(name: string): Promise<boolean> {
    const strategy = this.strategies.get(name);
    if (!strategy) return false;
    strategy.active = false;
    console.log(`[Strategy] Deactivated: ${strategy.name}`);
    return true;
  }

  async executeActiveStrategies(): Promise<string[]> {
    const results: string[] = [];

    for (const [key, strategy] of this.strategies) {
      if (!strategy.active) continue;

      const now = Date.now();
      if (strategy.lastExecution && now - strategy.lastExecution < strategy.intervalMs) {
        continue;
      }

      try {
        const result = await this.executeStrategy(key, strategy);
        strategy.lastExecution = now;
        results.push(result);
      } catch (e) {
        results.push(`[${strategy.name}] Error: ${e}`);
      }
    }

    return results;
  }

  private async executeStrategy(key: string, strategy: Strategy): Promise<string> {
    switch (strategy.type) {
      case "dca":
        return this.executeDca(strategy);
      case "rebalance":
        return this.executeRebalance(strategy);
      case "yield":
        return this.executeYield(strategy);
      default:
        return `[${strategy.name}] Unknown strategy type`;
    }
  }

  private async executeDca(strategy: Strategy): Promise<string> {
    const { targetChain, amountUsd } = strategy.params as { targetChain: string; amountUsd: number };
    const check = this.safety.checkTransaction(
      { chain: targetChain, to: "self", amount: String(amountUsd) },
      amountUsd,
    );

    if (!check.approved) {
      return `[DCA] Blocked: ${check.reason}`;
    }

    return `[DCA] Would buy $${amountUsd} of ${targetChain} — safety approved, awaiting execution engine`;
  }

  private async executeRebalance(strategy: Strategy): Promise<string> {
    const balances = await this.wallets.getAllBalances();
    const targets = strategy.params as Record<string, number>;
    const threshold = (targets.threshold as number) || 0.05;

    const drifts: string[] = [];
    for (const [chain, targetPct] of Object.entries(targets)) {
      if (chain === "threshold") continue;
      const bal = balances.find((b) => b.chain === chain);
      if (bal) {
        drifts.push(`${chain}: ${bal.native} (target: ${(targetPct * 100).toFixed(0)}%)`);
      }
    }

    return `[Rebalance] Portfolio check: ${drifts.join(", ")}. Threshold: ${(threshold * 100).toFixed(0)}%`;
  }

  private async executeYield(strategy: Strategy): Promise<string> {
    const { minApy, protocols } = strategy.params as { minApy: number; maxExposure: number; protocols: string[] };
    return `[Yield] Scanning ${(protocols as string[]).join(", ")} for >${minApy}% APY opportunities`;
  }
}
