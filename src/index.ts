#!/usr/bin/env node
/**
 * ClawWallet Agent — AI-Powered Multi-Chain Financial Agent
 * Built with Tether WDK for Hackathon Galactica
 *
 * Autonomous wallet management across 6+ chains.
 * Self-custodial. Safety-first. Open source.
 */

import { createInterface } from "readline";
import { ClawWalletAgent } from "./agent.js";

const BANNER = `
  ╔═══════════════════════════════════════════════════════╗
  ║     ClawWallet — AI Financial Agent                  ║
  ║     Powered by Tether WDK • Multi-Chain              ║
  ║     Self-Custodial • Safety-First • Autonomous       ║
  ╚═══════════════════════════════════════════════════════╝
`;

async function main(): Promise<void> {
  console.log(BANNER);

  const agent = new ClawWalletAgent();
  await agent.initialize(process.env.SEED_PHRASE || undefined);

  const mode = process.env.AGENT_MODE || "interactive";

  if (mode === "demo") {
    await runDemo(agent);
    return;
  }

  // Interactive mode
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "  clawwallet> ",
  });

  rl.prompt();
  rl.on("line", async (line) => {
    const cmd = agent.parseCommand(line);
    const result = await agent.executeCommand(cmd);

    if (result === "EXIT") {
      console.log("\n  ClawWallet Agent shutting down. Keys safe.\n");
      rl.close();
      process.exit(0);
    }

    console.log(result);
    rl.prompt();
  });

  rl.on("close", () => process.exit(0));
}

async function runDemo(agent: ClawWalletAgent): Promise<void> {
  console.log("  Running demo sequence...\n");

  const commands = [
    "portfolio",
    "balance ethereum",
    "balance bitcoin",
    "send 0.01 ETH to 0x742d35Cc6634C0532925a3b844Bc9e7595f8f44",
    "strategy list",
    "history",
  ];

  for (const input of commands) {
    console.log(`  > ${input}`);
    const cmd = agent.parseCommand(input);
    const result = await agent.executeCommand(cmd);
    console.log(result);
    console.log();
  }

  console.log("  Demo complete. Run with AGENT_MODE=interactive for full agent.\n");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
