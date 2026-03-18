import type { WalletBalance, TransactionRequest, TransactionResult } from "./types.js";
export declare class WalletManager {
    private wdk;
    private chains;
    private initialized;
    initialize(seedPhrase?: string): Promise<string[]>;
    private initializeMock;
    getBalance(chain: string, accountIndex?: number): Promise<WalletBalance>;
    getAllBalances(): Promise<WalletBalance[]>;
    sendTransaction(req: TransactionRequest): Promise<TransactionResult>;
    estimateFee(req: TransactionRequest): Promise<string>;
    getRegisteredChains(): string[];
    private getNativeSymbol;
    private mockBalance;
    private mockTransaction;
}
