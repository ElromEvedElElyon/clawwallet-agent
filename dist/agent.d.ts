import type { AgentCommand } from "./types.js";
export declare class ClawWalletAgent {
    private wallets;
    private safety;
    private strategies;
    private state;
    constructor();
    initialize(seedPhrase?: string): Promise<void>;
    parseCommand(input: string): AgentCommand;
    executeCommand(cmd: AgentCommand): Promise<string>;
    private handleBalance;
    private handlePortfolio;
    private handleSend;
    private handleSwap;
    private handleStrategy;
    private handleHistory;
    private handleHelp;
    private inferChain;
    private estimateUsd;
}
