import { WalletManager } from "./wallets.js";
import { SafetyGuard } from "./safety.js";
import { StrategyEngine } from "./strategies.js";
export class ClawWalletAgent {
    wallets;
    safety;
    strategies;
    state;
    constructor() {
        this.wallets = new WalletManager();
        this.safety = new SafetyGuard({
            maxSingleTxUsd: Number(process.env.MAX_SINGLE_TX_USD) || 100,
            dailyTxLimitUsd: Number(process.env.DAILY_TX_LIMIT_USD) || 1000,
            requireConfirmationAboveUsd: Number(process.env.REQUIRE_CONFIRMATION_ABOVE_USD) || 50,
        });
        this.strategies = new StrategyEngine(this.wallets, this.safety);
        this.state = {
            initialized: false,
            chains: [],
            totalBalanceUsd: 0,
            activeStrategies: [],
            auditLog: [],
            dailyTxTotal: 0,
            dailyTxDate: new Date().toISOString().split("T")[0],
        };
    }
    async initialize(seedPhrase) {
        console.log("\n  ClawWallet Agent initializing...\n");
        this.state.chains = await this.wallets.initialize(seedPhrase);
        this.state.initialized = true;
        console.log(`  Chains active: ${this.state.chains.join(", ")}`);
        console.log(`  Safety limits: $${process.env.MAX_SINGLE_TX_USD || 100}/tx, $${process.env.DAILY_TX_LIMIT_USD || 1000}/day`);
        console.log("  Agent ready.\n");
    }
    parseCommand(input) {
        const raw = input.trim().toLowerCase();
        if (!raw || raw === "quit" || raw === "exit" || raw === "q") {
            return { intent: "quit", raw };
        }
        if (raw === "help" || raw === "h" || raw === "?") {
            return { intent: "help", raw };
        }
        if (raw.startsWith("balance") || raw.startsWith("bal") || raw === "b") {
            const parts = raw.split(/\s+/);
            return { intent: "balance", chain: parts[1], raw };
        }
        if (raw.startsWith("portfolio") || raw === "p" || raw.startsWith("overview")) {
            return { intent: "portfolio", raw };
        }
        if (raw.startsWith("send") || raw.startsWith("transfer")) {
            const match = raw.match(/(?:send|transfer)\s+(\S+)\s+(\S+)\s+(?:to\s+)?(\S+)/);
            if (match) {
                return {
                    intent: "send",
                    amount: match[1],
                    token: match[2],
                    to: match[3],
                    chain: this.inferChain(match[2]),
                    raw,
                };
            }
            return { intent: "send", raw };
        }
        if (raw.startsWith("swap")) {
            return { intent: "swap", raw };
        }
        if (raw.startsWith("strategy") || raw.startsWith("strat")) {
            const parts = raw.split(/\s+/);
            return { intent: "strategy", strategyName: parts[1], raw };
        }
        if (raw.startsWith("history") || raw.startsWith("audit")) {
            return { intent: "history", raw };
        }
        return { intent: "unknown", raw };
    }
    async executeCommand(cmd) {
        switch (cmd.intent) {
            case "balance":
                return this.handleBalance(cmd.chain);
            case "portfolio":
                return this.handlePortfolio();
            case "send":
                return this.handleSend(cmd);
            case "swap":
                return this.handleSwap(cmd);
            case "strategy":
                return this.handleStrategy(cmd);
            case "history":
                return this.handleHistory();
            case "help":
                return this.handleHelp();
            case "quit":
                return "EXIT";
            default:
                return `Unknown command: "${cmd.raw}"\nType "help" for available commands`;
        }
    }
    async handleBalance(chain) {
        if (chain) {
            const bal = await this.wallets.getBalance(chain);
            let result = `\n  ${chain.toUpperCase()} Balance\n`;
            result += `  Address: ${bal.address}\n`;
            result += `  Native:  ${bal.native} ${bal.nativeSymbol}\n`;
            for (const t of bal.tokens) {
                result += `  ${t.symbol}: ${t.balance}\n`;
            }
            return result;
        }
        const balances = await this.wallets.getAllBalances();
        let result = "\n  All Balances\n  ─────────────────────────\n";
        for (const bal of balances) {
            result += `  ${bal.chain.toUpperCase().padEnd(12)} ${bal.native.padStart(12)} ${bal.nativeSymbol}\n`;
            for (const t of bal.tokens) {
                result += `  ${"".padEnd(12)} ${t.balance.padStart(12)} ${t.symbol}\n`;
            }
        }
        return result;
    }
    async handlePortfolio() {
        const balances = await this.wallets.getAllBalances();
        const daily = this.safety.getDailyStats();
        const strategies = this.strategies.getStrategies();
        let result = "\n  ═══════════════════════════════════════\n";
        result += "  ClawWallet Portfolio Overview\n";
        result += "  ═══════════════════════════════════════\n\n";
        result += "  Assets:\n";
        for (const bal of balances) {
            result += `    ${bal.chain.toUpperCase().padEnd(10)} ${bal.native.padStart(12)} ${bal.nativeSymbol}\n`;
            for (const t of bal.tokens) {
                result += `    ${"".padEnd(10)} ${t.balance.padStart(12)} ${t.symbol}\n`;
            }
        }
        result += `\n  Safety:\n`;
        result += `    Daily spent:     $${daily.total.toFixed(2)}\n`;
        result += `    Daily remaining: $${daily.remaining.toFixed(2)}\n`;
        result += `    Date:            ${daily.date}\n`;
        result += `\n  Strategies:\n`;
        for (const s of strategies) {
            result += `    ${s.active ? "[ACTIVE]" : "[  OFF ]"} ${s.name}\n`;
        }
        return result;
    }
    async handleSend(cmd) {
        if (!cmd.amount || !cmd.to) {
            return "Usage: send <amount> <token> to <address>\nExample: send 0.1 ETH to 0x742d...8f44";
        }
        const chain = cmd.chain || "ethereum";
        const estimatedUsd = this.estimateUsd(cmd.amount, cmd.token || "ETH");
        const check = this.safety.checkTransaction({ chain, to: cmd.to, amount: cmd.amount }, estimatedUsd);
        if (!check.approved) {
            return `\n  Transaction BLOCKED\n  Reason: ${check.reason}`;
        }
        if (check.requiresConfirmation) {
            return `\n  Transaction requires confirmation\n  Send ${cmd.amount} ${cmd.token || "ETH"} to ${cmd.to}\n  Estimated: $${estimatedUsd}\n  (In production, this would await user confirmation)`;
        }
        const fee = await this.wallets.estimateFee({ chain, to: cmd.to, amount: cmd.amount });
        const result = await this.wallets.sendTransaction({ chain, to: cmd.to, amount: cmd.amount });
        return `\n  Transaction Submitted\n  Chain:  ${result.chain}\n  Hash:   ${result.hash.slice(0, 20)}...\n  Amount: ${result.amount}\n  To:     ${result.to}\n  Fee:    ${fee}\n  Status: ${result.status}`;
    }
    async handleSwap(_cmd) {
        return "\n  Swap Engine\n  Powered by Velora DEX aggregator via WDK\n  Usage: swap <amount> <fromToken> to <toToken>\n  (Swap execution available when protocol modules are registered)";
    }
    async handleStrategy(cmd) {
        const strategies = this.strategies.getStrategies();
        if (!cmd.strategyName || cmd.strategyName === "list") {
            let result = "\n  Available Strategies:\n";
            for (const s of strategies) {
                result += `    ${s.active ? "[ACTIVE]" : "[  OFF ]"} ${s.name} (${s.type})\n`;
            }
            result += "\n  Commands: strategy activate <name> | strategy deactivate <name>";
            return result;
        }
        if (cmd.raw.includes("activate")) {
            const name = cmd.raw.replace(/strategy\s+activate\s+/, "").trim();
            const found = strategies.find((s) => s.name.toLowerCase().includes(name) || name.includes(s.type));
            if (found) {
                await this.strategies.activateStrategy(Array.from(this.strategies.getStrategies()).indexOf(found) === 0
                    ? "dca-eth"
                    : found.type === "rebalance"
                        ? "rebalance-60-40"
                        : "yield-stables");
                return `\n  Strategy activated: ${found.name}`;
            }
        }
        return "  Strategy not found. Use: strategy list";
    }
    handleHistory() {
        const log = this.safety.getAuditLog();
        if (log.length === 0)
            return "\n  No transactions in audit log";
        let result = "\n  Audit Log (last 10):\n  ─────────────────────────\n";
        for (const entry of log.slice(-10)) {
            const time = new Date(entry.timestamp).toLocaleTimeString();
            const status = entry.approved ? "OK" : "BLOCKED";
            result += `  [${time}] ${status} ${entry.action} on ${entry.chain}: ${entry.details}\n`;
        }
        return result;
    }
    handleHelp() {
        return `
  ═══════════════════════════════════════
  ClawWallet Agent — Commands
  ═══════════════════════════════════════

  balance [chain]        Check balances (all or specific chain)
  portfolio              Full portfolio overview with safety stats
  send <amt> <tok> to <addr>  Send tokens
  swap <amt> <from> to <to>   Swap tokens via Velora
  strategy list          View available strategies
  strategy activate <n>  Activate a strategy
  history                View audit log
  help                   Show this help
  quit                   Exit agent
`;
    }
    inferChain(token) {
        if (!token)
            return "ethereum";
        const t = token.toLowerCase();
        if (t === "btc" || t === "bitcoin")
            return "bitcoin";
        if (t === "sol" || t === "solana")
            return "solana";
        if (t === "matic" || t === "polygon")
            return "polygon";
        if (t === "trx" || t === "tron")
            return "tron";
        return "ethereum";
    }
    estimateUsd(amount, token) {
        const prices = {
            eth: 3200, btc: 84000, sol: 135, matic: 0.85, usdt: 1, usdc: 1, bnb: 580,
        };
        const price = prices[token.toLowerCase()] || 1;
        return parseFloat(amount) * price;
    }
}
