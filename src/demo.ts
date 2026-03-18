#!/usr/bin/env node
/**
 * ClawWallet Agent — Demo for Hackathon Galactica: WDK Edition 1
 * Shows autonomous wallet management across multiple chains
 */

import { ClawWalletAgent } from "./agent.js";

const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

function c(color: keyof typeof COLORS, text: string): string {
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

function separator(title: string): void {
  console.log(`\n  ${c("cyan", "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")}`);
  console.log(`  ${c("bold", title)}`);
  console.log(`  ${c("cyan", "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")}\n`);
}

async function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main(): Promise<void> {
  console.log(`
  ${c("red", "╔═══════════════════════════════════════════════════════════╗")}
  ${c("red", "║")}  ${c("bold", "ClawWallet Agent")} — AI-Powered Financial Autonomy        ${c("red", "║")}
  ${c("red", "║")}  ${c("dim", "Built with Tether WDK for Hackathon Galactica")}            ${c("red", "║")}
  ${c("red", "║")}  ${c("dim", "Self-Custodial • Multi-Chain • Safety-First")}               ${c("red", "║")}
  ${c("red", "╚═══════════════════════════════════════════════════════════╝")}
  `);

  const agent = new ClawWalletAgent();

  // Phase 1: Initialize
  separator("PHASE 1: Multi-Chain Wallet Initialization");
  console.log(`  ${c("yellow", "→")} Generating HD wallet from seed phrase...`);
  await agent.initialize();
  await delay(300);
  console.log(`  ${c("green", "✓")} Wallet initialized with Tether WDK v1.0.0-beta.6`);

  // Phase 2: Portfolio Overview
  separator("PHASE 2: Cross-Chain Portfolio Scan");
  console.log(`  ${c("yellow", "→")} Scanning all chain balances simultaneously...`);
  await delay(200);
  const portfolio = await agent.executeCommand(agent.parseCommand("portfolio"));
  console.log(portfolio);

  // Phase 3: Individual Chain Check
  separator("PHASE 3: Ethereum Deep Dive");
  const ethBalance = await agent.executeCommand(agent.parseCommand("balance ethereum"));
  console.log(ethBalance);
  await delay(200);

  separator("PHASE 4: Bitcoin Status");
  const btcBalance = await agent.executeCommand(agent.parseCommand("balance bitcoin"));
  console.log(btcBalance);

  // Phase 5: Safety System Demo
  separator("PHASE 5: Safety Guard — Transaction Validation");
  console.log(`  ${c("yellow", "→")} Attempting small transfer (within limits)...`);
  const sendSmall = await agent.executeCommand(
    agent.parseCommand("send 0.001 ETH to 0x742d35Cc6634C0532925a3b844Bc9e7595f8f44")
  );
  console.log(sendSmall);
  await delay(300);

  console.log(`\n  ${c("yellow", "→")} Attempting large transfer (exceeds single tx limit)...`);
  const sendLarge = await agent.executeCommand(
    agent.parseCommand("send 50 ETH to 0x742d35Cc6634C0532925a3b844Bc9e7595f8f44")
  );
  console.log(sendLarge);

  // Phase 6: Strategy Engine
  separator("PHASE 6: Autonomous Strategy Engine");
  const strategies = await agent.executeCommand(agent.parseCommand("strategy list"));
  console.log(strategies);
  await delay(200);

  console.log(`\n  ${c("yellow", "→")} Activating DCA strategy...`);
  const activate = await agent.executeCommand(
    agent.parseCommand("strategy activate dca")
  );
  console.log(activate);

  // Phase 7: Audit Trail
  separator("PHASE 7: Audit Trail & Compliance");
  const history = await agent.executeCommand(agent.parseCommand("history"));
  console.log(history);

  // Phase 8: Swap Engine
  separator("PHASE 8: DEX Aggregation via Velora");
  const swap = await agent.executeCommand(agent.parseCommand("swap 100 USDT to ETH"));
  console.log(swap);

  // Summary
  separator("DEMO COMPLETE");
  console.log(`
  ${c("bold", "ClawWallet Agent Capabilities Demonstrated:")}

  ${c("green", "✓")} Multi-chain wallet initialization via Tether WDK
  ${c("green", "✓")} Cross-chain portfolio monitoring (ETH, BTC, MATIC, SOL)
  ${c("green", "✓")} Transaction safety guard (per-tx limits, daily caps, blocklist)
  ${c("green", "✓")} Autonomous DCA, rebalance, and yield strategies
  ${c("green", "✓")} Complete audit trail with compliance logging
  ${c("green", "✓")} DEX swap routing via Velora aggregator
  ${c("green", "✓")} Self-custodial — keys never leave the device

  ${c("dim", "Architecture:")}
    CLI Agent → Safety Guard → WDK Core → Multi-Chain Wallets
                                        → Velora DEX (Swap)
                                        → USDT0 Bridge (Cross-chain)

  ${c("cyan", "Built for Hackathon Galactica: WDK Edition 1")}
  ${c("cyan", "by Padrao Bitcoin (Elrom) — github.com/ElromEvedElElyon")}
  `);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
