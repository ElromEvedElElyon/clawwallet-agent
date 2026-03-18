export class StrategyEngine {
    strategies = new Map();
    wallets;
    safety;
    constructor(wallets, safety) {
        this.wallets = wallets;
        this.safety = safety;
        this.registerDefaultStrategies();
    }
    registerDefaultStrategies() {
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
    getStrategies() {
        return Array.from(this.strategies.values());
    }
    async activateStrategy(name) {
        const strategy = this.strategies.get(name);
        if (!strategy)
            return false;
        strategy.active = true;
        console.log(`[Strategy] Activated: ${strategy.name}`);
        return true;
    }
    async deactivateStrategy(name) {
        const strategy = this.strategies.get(name);
        if (!strategy)
            return false;
        strategy.active = false;
        console.log(`[Strategy] Deactivated: ${strategy.name}`);
        return true;
    }
    async executeActiveStrategies() {
        const results = [];
        for (const [key, strategy] of this.strategies) {
            if (!strategy.active)
                continue;
            const now = Date.now();
            if (strategy.lastExecution && now - strategy.lastExecution < strategy.intervalMs) {
                continue;
            }
            try {
                const result = await this.executeStrategy(key, strategy);
                strategy.lastExecution = now;
                results.push(result);
            }
            catch (e) {
                results.push(`[${strategy.name}] Error: ${e}`);
            }
        }
        return results;
    }
    async executeStrategy(key, strategy) {
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
    async executeDca(strategy) {
        const { targetChain, amountUsd } = strategy.params;
        const check = this.safety.checkTransaction({ chain: targetChain, to: "self", amount: String(amountUsd) }, amountUsd);
        if (!check.approved) {
            return `[DCA] Blocked: ${check.reason}`;
        }
        return `[DCA] Would buy $${amountUsd} of ${targetChain} — safety approved, awaiting execution engine`;
    }
    async executeRebalance(strategy) {
        const balances = await this.wallets.getAllBalances();
        const targets = strategy.params;
        const threshold = targets.threshold || 0.05;
        const drifts = [];
        for (const [chain, targetPct] of Object.entries(targets)) {
            if (chain === "threshold")
                continue;
            const bal = balances.find((b) => b.chain === chain);
            if (bal) {
                drifts.push(`${chain}: ${bal.native} (target: ${(targetPct * 100).toFixed(0)}%)`);
            }
        }
        return `[Rebalance] Portfolio check: ${drifts.join(", ")}. Threshold: ${(threshold * 100).toFixed(0)}%`;
    }
    async executeYield(strategy) {
        const { minApy, protocols } = strategy.params;
        return `[Yield] Scanning ${protocols.join(", ")} for >${minApy}% APY opportunities`;
    }
}
