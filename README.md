# ClawWallet Agent

AI-powered multi-chain financial agent built with Tether WDK for **Hackathon Galactica: WDK Edition 1**.

> "Do AI agents dream of electric cash?" — This agent does.

## Architecture

```
┌──────────────────────────────────────────────────┐
│           ClawWallet Agent (CLI/API)              │
├──────────────────────────────────────────────────┤
│  NL Command Parser → Safety Guard → Executor      │
├──────┬──────┬──────┬──────┬──────┬───────────────┤
│  ETH │  BTC │  SOL │  TON │ TRON │  Polygon  │+  │
├──────┴──────┴──────┴──────┴──────┴───────────────┤
│     Protocols: ParaSwap (Swap) │ USDT0 (Bridge)   │
├──────────────────────────────────────────────────┤
│         Tether WDK v1.0.0-beta.6                  │
│     Self-Custodial • Stateless • Multi-Chain       │
└──────────────────────────────────────────────────┘
```

## What It Does

ClawWallet is an **autonomous financial agent** that manages self-custodial wallets across 6+ blockchains. It uses Tether's Wallet Development Kit (WDK) for consistent multi-chain operations.

**Key Differentiators:**
- **Fully autonomous** — executes DCA, rebalancing, and yield strategies without human intervention
- **Safety-first** — every transaction passes through a configurable SafetyGuard before execution
- **Self-custodial** — private keys never leave the device, no backend servers
- **Multi-chain** — Ethereum, Bitcoin, Solana, Polygon, TON, TRON via unified WDK API
- **Auditable** — complete transaction audit trail with timestamps and approval status
- **Extensible** — register new chains and DeFi protocols via WDK module system

## Safety Model

Every transaction goes through the SafetyGuard before execution:

```
User Command → Parse → Safety Check → Execute → Audit Log
                         │
                         ├─ 1. Blocked address check
                         ├─ 2. Per-transaction USD limit
                         ├─ 3. Rolling 24h daily spending cap
                         ├─ 4. Large-tx confirmation requirement
                         └─ 5. Whitelist bypass for trusted addresses
```

This ensures the agent cannot drain wallets, send to known scam addresses, or exceed spending limits — even when operating fully autonomously.

## Quick Start

```bash
git clone https://github.com/ElromEvedElElyon/clawwallet-agent.git
cd clawwallet-agent
cp .env.example .env
npm install
npm run demo     # visual demo of all capabilities
npm start        # interactive agent mode
```

## Demo

Run `npm run demo` to see the agent:
1. Initialize multi-chain wallets from a seed phrase
2. Scan portfolio across all chains simultaneously
3. Attempt transactions (some approved, some blocked by SafetyGuard)
4. Activate autonomous DCA strategy
5. Show complete audit trail
6. Route DEX swaps via Velora aggregator

## Commands

| Command | Description |
|---------|-------------|
| `balance [chain]` | Check balances (all chains or specific) |
| `portfolio` | Full portfolio overview with safety stats |
| `send <amt> <token> to <addr>` | Send tokens (safety-checked) |
| `swap <amt> <from> to <to>` | Swap via Velora DEX aggregator |
| `strategy list` | View available autonomous strategies |
| `strategy activate <name>` | Enable a strategy |
| `history` | View full audit log |
| `help` | Show all commands |

## Autonomous Strategies

| Strategy | Type | Description |
|----------|------|-------------|
| DCA ETH | Dollar-Cost Average | Buy ETH at fixed USD amount on schedule |
| Rebalance 60/40 | Portfolio Rebalance | Maintain target ETH/BTC allocation |
| Yield Stables | Yield Optimization | Deploy stablecoins to highest APY via Aave/Velora |

Strategies run autonomously while respecting SafetyGuard limits. The agent will never exceed configured spending caps.

## Tech Stack

- **Runtime:** Node.js 22+, TypeScript 5.8
- **Core:** Tether WDK `@tetherto/wdk@1.0.0-beta.6`
- **Wallets:** `wdk-wallet-evm`, `wdk-wallet-btc`, `wdk-wallet-solana`
- **Protocols:** `wdk-protocol-swap-paraswap-evm` (DEX swaps)
- **Chains:** Ethereum, Bitcoin, Solana, Polygon (extensible to TON, TRON, Spark)
- **Architecture:** Self-custodial, stateless, local-first, zero backend

## Why This Matters

AI agents are becoming economic actors. They need financial infrastructure that is:

1. **Self-custodial** — keys never leave the device
2. **Multi-chain** — not locked to one blockchain
3. **Safety-constrained** — autonomy without recklessness
4. **Auditable** — every action logged for compliance
5. **Programmable** — strategies defined in code, executed by the agent

Centralized custodial APIs create single points of failure. Tether WDK eliminates this by providing a unified, self-custodial interface across every major chain.

**ClawWallet is the bridge between autonomous AI decision-making and permissionless financial execution.**

## Project Structure

```
src/
├── index.ts          # Entry point (CLI + demo modes)
├── agent.ts          # Core agent logic and command parser
├── wallets.ts        # WDK wallet manager (multi-chain)
├── safety.ts         # Transaction safety guard
├── strategies.ts     # Autonomous DCA/rebalance/yield engine
├── types.ts          # TypeScript interfaces
└── demo.ts           # Visual demo for hackathon showcase
```

## Hackathon

Built for **Tether Hackathon Galactica: WDK Edition 1** (30,000 USDT prize pool).

**Evaluation criteria addressed:**
- **Correctness** — WDK integration with mock fallback for demo, real chain ops when configured
- **Autonomy** — Strategies execute independently, SafetyGuard constrains without blocking
- **Real-world viability** — Production-ready safety model, extensible protocol system

## Author

**Elrom** (Padrao Bitcoin) — [github.com/ElromEvedElElyon](https://github.com/ElromEvedElElyon)

## License

MIT
