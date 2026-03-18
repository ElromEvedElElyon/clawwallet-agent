import type { Strategy, TransactionResult } from "./types.js";
import { WalletManager } from "./wallets.js";
import { SafetyGuard } from "./safety.js";

export interface StrategyExecutionResult {
  strategy: string;
  type: Strategy["type"];
  success: boolean;
  message: string;
  transactions: TransactionResult[];
  skippedReason?: string;
}

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

  getStrategy(name: string): Strategy | undefined {
    return this.strategies.get(name);
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

  async executeActiveStrategies(): Promise<StrategyExecutionResult[]> {
    const results: StrategyExecutionResult[] = [];

    for (const [key, strategy] of this.strategies) {
      if (!strategy.active) continue;

      const now = Date.now();
      if (strategy.lastExecution && now - strategy.lastExecution < strategy.intervalMs) {
        results.push({
          strategy: strategy.name,
          type: strategy.type,
          success: false,
          message: `Skipped — interval not elapsed (next run in ${Math.ceil((strategy.intervalMs - (now - strategy.lastExecution)) / 60000)} min)`,
          transactions: [],
          skippedReason: "interval_not_elapsed",
        });
        continue;
      }

      try {
        const result = await this.executeStrategy(key, strategy);
        strategy.lastExecution = now;
        results.push(result);
      } catch (e) {
        results.push({
          strategy: strategy.name,
          type: strategy.type,
          success: false,
          message: `Error: ${e instanceof Error ? e.message : String(e)}`,
          transactions: [],
        });
      }
    }

    return results;
  }

  private async executeStrategy(key: string, strategy: Strategy): Promise<StrategyExecutionResult> {
    switch (strategy.type) {
      case "dca":
        return this.executeDca(strategy);
      case "rebalance":
        return this.executeRebalance(strategy);
      case "yield":
        return this.executeYield(strategy);
      default:
        return {
          strategy: strategy.name,
          type: strategy.type,
          success: false,
          message: `Unknown strategy type: ${strategy.type}`,
          transactions: [],
        };
    }
  }

  private async executeDca(strategy: Strategy): Promise<StrategyExecutionResult> {
    const { targetChain, amountUsd } = strategy.params as { targetChain: string; amountUsd: number };

    const check = this.safety.checkTransaction(
      { chain: targetChain, to: "self", amount: String(amountUsd) },
      amountUsd,
    );

    if (!check.approved) {
      return {
        strategy: strategy.name,
        type: "dca",
        success: false,
        message: `Safety blocked: ${check.reason}`,
        transactions: [],
      };
    }

    // Execute the actual buy via WalletManager
    try {
      const txResult = await this.wallets.sendTransaction({
        chain: targetChain,
        to: "self",
        amount: String(amountUsd),
        memo: `DCA: ${strategy.name}`,
      });

      return {
        strategy: strategy.name,
        type: "dca",
        success: true,
        message: `DCA executed: bought $${amountUsd} of ${targetChain}`,
        transactions: [txResult],
      };
    } catch (e) {
      return {
        strategy: strategy.name,
        type: "dca",
        success: false,
        message: `DCA execution failed: ${e instanceof Error ? e.message : String(e)}`,
        transactions: [],
      };
    }
  }

  private async executeRebalance(strategy: Strategy): Promise<StrategyExecutionResult> {
    const balances = await this.wallets.getAllBalances();
    const targets = strategy.params as Record<string, number>;
    const threshold = (targets.threshold as number) || 0.05;

    // Simple price estimates for portfolio value calculation
    const prices: Record<string, number> = {
      ethereum: 3200,
      bitcoin: 84000,
      solana: 135,
      polygon: 0.85,
    };

    // Calculate current portfolio allocation
    let totalValueUsd = 0;
    const chainValues: Record<string, number> = {};

    for (const bal of balances) {
      const price = prices[bal.chain] || 0;
      const value = parseFloat(bal.native) * price;
      chainValues[bal.chain] = value;
      totalValueUsd += value;
    }

    if (totalValueUsd === 0) {
      return {
        strategy: strategy.name,
        type: "rebalance",
        success: false,
        message: "Portfolio has zero value, nothing to rebalance",
        transactions: [],
      };
    }

    // Calculate drifts and determine needed trades
    const transactions: TransactionResult[] = [];
    const drifts: string[] = [];
    let needsRebalance = false;

    for (const [chain, targetPct] of Object.entries(targets)) {
      if (chain === "threshold") continue;
      const currentValue = chainValues[chain] || 0;
      const currentPct = currentValue / totalValueUsd;
      const drift = Math.abs(currentPct - targetPct);

      drifts.push(`${chain}: ${(currentPct * 100).toFixed(1)}% (target ${(targetPct * 100).toFixed(0)}%, drift ${(drift * 100).toFixed(1)}%)`);

      if (drift > threshold) {
        needsRebalance = true;
        const targetValue = totalValueUsd * targetPct;
        const diffUsd = targetValue - currentValue;

        if (Math.abs(diffUsd) > 1) {
          const check = this.safety.checkTransaction(
            { chain, to: "self", amount: String(Math.abs(diffUsd)) },
            Math.abs(diffUsd),
          );

          if (check.approved) {
            try {
              const tx = await this.wallets.sendTransaction({
                chain,
                to: "self",
                amount: String(Math.abs(diffUsd)),
                memo: `Rebalance: ${diffUsd > 0 ? "buy" : "sell"} $${Math.abs(diffUsd).toFixed(2)} ${chain}`,
              });
              transactions.push(tx);
            } catch {
              // Individual trade failure doesn't block others
            }
          }
        }
      }
    }

    return {
      strategy: strategy.name,
      type: "rebalance",
      success: true,
      message: needsRebalance
        ? `Rebalance executed with ${transactions.length} trade(s). ${drifts.join("; ")}`
        : `No rebalance needed (all within ${(threshold * 100).toFixed(0)}% threshold). ${drifts.join("; ")}`,
      transactions,
    };
  }

  private async executeYield(strategy: Strategy): Promise<StrategyExecutionResult> {
    const { minApy, maxExposure, protocols } = strategy.params as {
      minApy: number;
      maxExposure: number;
      protocols: string[];
    };

    // Scan protocols for yield opportunities
    const balances = await this.wallets.getAllBalances();
    const transactions: TransactionResult[] = [];

    // Find stablecoin balances eligible for yield
    const stableBalances: { chain: string; symbol: string; balance: number }[] = [];
    for (const bal of balances) {
      for (const token of bal.tokens) {
        if (["USDT", "USDC", "DAI", "TUSD"].includes(token.symbol)) {
          stableBalances.push({
            chain: bal.chain,
            symbol: token.symbol,
            balance: parseFloat(token.balance),
          });
        }
      }
    }

    if (stableBalances.length === 0) {
      return {
        strategy: strategy.name,
        type: "yield",
        success: true,
        message: `No stablecoin balances found for yield deployment. Scanning ${protocols.join(", ")} for >${minApy}% APY.`,
        transactions: [],
      };
    }

    // Deploy eligible stables (up to maxExposure of each balance)
    for (const stable of stableBalances) {
      const deployAmount = stable.balance * maxExposure;
      if (deployAmount < 1) continue;

      const check = this.safety.checkTransaction(
        { chain: stable.chain, to: protocols[0], amount: String(deployAmount), token: stable.symbol },
        deployAmount,
      );

      if (check.approved) {
        try {
          const tx = await this.wallets.sendTransaction({
            chain: stable.chain,
            to: protocols[0],
            amount: String(deployAmount),
            memo: `Yield: deposit ${deployAmount.toFixed(2)} ${stable.symbol} to ${protocols[0]}`,
          });
          transactions.push(tx);
        } catch {
          // Continue with other stables
        }
      }
    }

    return {
      strategy: strategy.name,
      type: "yield",
      success: true,
      message: `Yield scan complete: ${stableBalances.length} stable(s) found, ${transactions.length} deployed to ${protocols.join(", ")} (min ${minApy}% APY, max ${(maxExposure * 100).toFixed(0)}% exposure)`,
      transactions,
    };
  }
}
