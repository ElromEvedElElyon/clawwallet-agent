# ClawWallet Agent

AI-powered multi-chain financial agent built with Tether WDK.

## Architecture

```
┌─────────────────────────────────────────────┐
│           ClawWallet Agent (CLI)            │
├─────────────────────────────────────────────┤
│  Command Parser → Safety Guard → Executor   │
├──────┬──────┬──────┬──────┬────────────────┤
│  ETH │  BTC │  SOL │  TON │  TRON  │ More  │
├──────┴──────┴──────┴──────┴────────────────┤
│         Tether WDK (Self-Custodial)         │
│     Unified API • Multi-Chain • Stateless   │
└─────────────────────────────────────────────┘
```

## What It Does

ClawWallet is an autonomous financial agent that manages self-custodial wallets across 6+ blockchains. It uses Tether's Wallet Development Kit (WDK) for consistent multi-chain operations.

**Capabilities:**
- Check balances across all chains simultaneously
- Send tokens with safety constraints
- Swap tokens via Velora DEX aggregator
- Execute autonomous strategies (DCA, rebalance, yield)
- Full audit log of every operation
- Configurable safety limits (per-tx, daily, whitelist)

## Safety Model

Every transaction goes through a SafetyGuard:

1. **Address blocking** — known scam addresses rejected instantly
2. **Per-transaction limit** — configurable max USD per single tx
3. **Daily limit** — rolling 24h spending cap
4. **Confirmation threshold** — large txs require explicit approval
5. **Audit logging** — every action logged with timestamp and status

## Quick Start

```bash
cp .env.example .env
npm install
npm run demo     # see it work
npm start        # interactive mode
```

## Commands

| Command | Description |
|---------|-------------|
| `balance [chain]` | Check balances |
| `portfolio` | Full portfolio overview |
| `send <amt> <token> to <addr>` | Send tokens |
| `swap <amt> <from> to <to>` | Swap via Velora |
| `strategy list` | View strategies |
| `strategy activate <name>` | Enable a strategy |
| `history` | View audit log |
| `help` | Show commands |

## Strategies

| Strategy | Type | Description |
|----------|------|-------------|
| DCA ETH | Dollar-Cost Average | Buy ETH daily at fixed USD amount |
| Rebalance 60/40 | Portfolio Rebalance | Maintain 60% ETH / 40% BTC allocation |
| Yield Stables | Yield Optimization | Deploy stablecoins to highest APY protocols |

## Tech Stack

- **Runtime:** Node.js 22+, TypeScript 5.8
- **Wallet:** Tether WDK (`@tetherto/wdk`)
- **Chains:** Ethereum, Bitcoin, Polygon, Solana, TON, TRON
- **Architecture:** Self-custodial, stateless, local-first

## Why This Matters

AI agents need financial infrastructure. Not custodial APIs. Not centralized exchanges. They need self-custodial wallets that they control entirely.

WDK provides exactly this: a unified interface across every major blockchain where keys never leave the device.

ClawWallet is the bridge between autonomous AI decision-making and permissionless financial execution.

## Hackathon

Built for **Tether Hackathon Galactica: WDK Edition 1** ($30,000 USDT prize pool).

Evaluation criteria:
- Correctness of wallet operations
- Autonomy of agent decision-making
- Real-world viability of the safety model
- Multi-chain breadth

## License

MIT
