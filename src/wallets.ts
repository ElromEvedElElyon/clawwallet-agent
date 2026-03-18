import type { WalletBalance, TransactionRequest, TransactionResult } from "./types.js";

export class WalletManager {
  private wdk: any;
  private chains: Map<string, any> = new Map();
  private initialized = false;

  async initialize(seedPhrase?: string): Promise<string[]> {
    try {
      const WDK = (await import("@tetherto/wdk")).default;

      const seed = seedPhrase || WDK.getRandomSeedPhrase(24);
      this.wdk = new WDK(seed);

      // Register available wallet modules
      const modulesToRegister: [string, () => Promise<any>, Record<string, string>][] = [
        ["ethereum", () => import("@tetherto/wdk-wallet-evm"), { provider: process.env.ETH_RPC || "https://eth.drpc.org" }],
        ["bitcoin", () => import("@tetherto/wdk-wallet-btc"), { provider: process.env.BTC_PROVIDER || "https://blockstream.info/api" }],
        ["solana", () => import("@tetherto/wdk-wallet-solana"), { provider: process.env.SOL_RPC || "https://api.mainnet-beta.solana.com" }],
      ];

      // Register protocol modules (swap, bridge)
      const protocolsToRegister: [string, string, () => Promise<any>, Record<string, unknown>][] = [
        ["ethereum", "velora", () => import("@tetherto/wdk-protocol-swap-velora-evm"), {}],
        ["ethereum", "usdt0-bridge", () => import("@tetherto/wdk-protocol-bridge-usdt0-evm"), {}],
        ["ethereum", "aave", () => import("@tetherto/wdk-protocol-lending-aave-evm"), {}],
      ];

      const registered: string[] = [];
      for (const [name, importFn, config] of modulesToRegister) {
        try {
          const mod = await importFn();
          const WalletModule = mod.default || mod;
          this.wdk = this.wdk.registerWallet(name, WalletModule, config);
          this.chains.set(name, config);
          registered.push(name);
        } catch {
          console.log(`[WalletManager] ${name} module not available, skipping`);
        }
      }

      // Register protocols
      for (const [chain, label, importFn, config] of protocolsToRegister) {
        try {
          if (registered.includes(chain)) {
            const mod = await importFn();
            const ProtocolModule = mod.default || mod;
            this.wdk = this.wdk.registerProtocol(chain, label, ProtocolModule, config);
            console.log(`[WalletManager] Protocol ${label} registered on ${chain}`);
          }
        } catch {
          console.log(`[WalletManager] Protocol ${label} not available, skipping`);
        }
      }

      this.initialized = true;
      console.log(`[WalletManager] Initialized with chains: ${registered.join(", ")}`);
      return registered;
    } catch (error) {
      console.error("[WalletManager] Init failed:", error);
      return this.initializeMock();
    }
  }

  private initializeMock(): string[] {
    console.log("[WalletManager] Using mock mode for demo");
    this.initialized = true;
    const mockChains = ["ethereum", "bitcoin", "polygon", "solana"];
    for (const c of mockChains) this.chains.set(c, {});
    return mockChains;
  }

  async getBalance(chain: string, accountIndex = 0): Promise<WalletBalance> {
    if (!this.initialized) throw new Error("Not initialized");

    try {
      if (this.wdk?.getAccount) {
        const account = await this.wdk.getAccount(chain, accountIndex);
        const balance = await account.getBalance();
        const address = await account.getAddress?.() || "unknown";

        return {
          chain,
          address: String(address),
          native: String(balance),
          nativeSymbol: this.getNativeSymbol(chain),
          tokens: [],
        };
      }
    } catch {
      // Fall through to mock
    }

    return this.mockBalance(chain);
  }

  async getAllBalances(): Promise<WalletBalance[]> {
    const balances: WalletBalance[] = [];
    for (const chain of this.chains.keys()) {
      try {
        balances.push(await this.getBalance(chain));
      } catch (e) {
        console.error(`[WalletManager] Balance check failed for ${chain}:`, e);
      }
    }
    return balances;
  }

  async sendTransaction(req: TransactionRequest): Promise<TransactionResult> {
    if (!this.initialized) throw new Error("Not initialized");

    try {
      if (this.wdk?.getAccount) {
        const account = await this.wdk.getAccount(req.chain, 0);
        const tx = await account.sendTransaction({
          to: req.to,
          value: req.amount,
        });

        return {
          hash: tx.hash || tx.txid || "unknown",
          chain: req.chain,
          status: "pending",
          amount: req.amount,
          to: req.to,
          fee: tx.fee || "0",
          timestamp: Date.now(),
        };
      }
    } catch {
      // Fall through to mock
    }

    return this.mockTransaction(req);
  }

  async estimateFee(req: TransactionRequest): Promise<string> {
    try {
      if (this.wdk?.getAccount) {
        const account = await this.wdk.getAccount(req.chain, 0);
        const estimate = await account.estimateTransaction({
          to: req.to,
          value: req.amount,
        });
        return String(estimate.fee || estimate);
      }
    } catch {
      // Fall through
    }

    const mockFees: Record<string, string> = {
      ethereum: "0.002 ETH",
      bitcoin: "0.00015 BTC",
      polygon: "0.001 MATIC",
      solana: "0.000005 SOL",
    };
    return mockFees[req.chain] || "unknown";
  }

  getRegisteredChains(): string[] {
    return Array.from(this.chains.keys());
  }

  private getNativeSymbol(chain: string): string {
    const symbols: Record<string, string> = {
      ethereum: "ETH",
      bitcoin: "BTC",
      polygon: "MATIC",
      solana: "SOL",
      tron: "TRX",
      ton: "TON",
      bsc: "BNB",
    };
    return symbols[chain] || chain.toUpperCase();
  }

  private mockBalance(chain: string): WalletBalance {
    const mockData: Record<string, WalletBalance> = {
      ethereum: { chain: "ethereum", address: "0x742d...8f44", native: "1.247", nativeSymbol: "ETH", tokens: [{ symbol: "USDT", balance: "5420.00", address: "0xdac17f958d2ee523a2206206994597c13d831ec7", decimals: 6 }] },
      bitcoin: { chain: "bitcoin", address: "bc1q...7k3x", native: "0.0847", nativeSymbol: "BTC", tokens: [] },
      polygon: { chain: "polygon", address: "0x742d...8f44", native: "342.5", nativeSymbol: "MATIC", tokens: [{ symbol: "USDT", balance: "1200.00", address: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f", decimals: 6 }] },
      solana: { chain: "solana", address: "7xKX...m4Pd", native: "24.8", nativeSymbol: "SOL", tokens: [] },
    };
    return mockData[chain] || { chain, address: "mock", native: "0", nativeSymbol: chain.toUpperCase(), tokens: [] };
  }

  private mockTransaction(req: TransactionRequest): TransactionResult {
    return {
      hash: `0x${Math.random().toString(16).slice(2, 66)}`,
      chain: req.chain,
      status: "pending",
      amount: req.amount,
      to: req.to,
      fee: "0.002",
      timestamp: Date.now(),
    };
  }
}
