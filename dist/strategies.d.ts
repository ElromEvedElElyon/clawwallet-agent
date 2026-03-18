import type { Strategy } from "./types.js";
import { WalletManager } from "./wallets.js";
import { SafetyGuard } from "./safety.js";
export declare class StrategyEngine {
    private strategies;
    private wallets;
    private safety;
    constructor(wallets: WalletManager, safety: SafetyGuard);
    private registerDefaultStrategies;
    getStrategies(): Strategy[];
    activateStrategy(name: string): Promise<boolean>;
    deactivateStrategy(name: string): Promise<boolean>;
    executeActiveStrategies(): Promise<string[]>;
    private executeStrategy;
    private executeDca;
    private executeRebalance;
    private executeYield;
}
