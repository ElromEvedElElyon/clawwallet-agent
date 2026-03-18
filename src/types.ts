export interface WalletBalance {
  chain: string;
  address: string;
  native: string;
  nativeSymbol: string;
  tokens: TokenBalance[];
}

export interface TokenBalance {
  symbol: string;
  balance: string;
  address: string;
  decimals: number;
}

export interface TransactionRequest {
  chain: string;
  to: string;
  amount: string;
  token?: string;
  memo?: string;
}

export interface TransactionResult {
  hash: string;
  chain: string;
  status: "pending" | "confirmed" | "failed";
  amount: string;
  to: string;
  fee: string;
  timestamp: number;
}

export interface Strategy {
  name: string;
  type: "dca" | "rebalance" | "yield" | "custom";
  active: boolean;
  params: Record<string, unknown>;
  lastExecution?: number;
  intervalMs: number;
}

export interface SafetyConfig {
  maxSingleTxUsd: number;
  dailyTxLimitUsd: number;
  requireConfirmationAboveUsd: number;
  whitelistedAddresses: string[];
  blockedAddresses: string[];
}

export interface AgentState {
  initialized: boolean;
  chains: string[];
  totalBalanceUsd: number;
  activeStrategies: Strategy[];
  auditLog: AuditEntry[];
  dailyTxTotal: number;
  dailyTxDate: string;
}

export interface AuditEntry {
  timestamp: number;
  action: string;
  chain: string;
  details: string;
  txHash?: string;
  amountUsd?: number;
  approved: boolean;
}

export interface AgentCommand {
  intent:
    | "balance"
    | "send"
    | "swap"
    | "portfolio"
    | "strategy"
    | "history"
    | "help"
    | "quit"
    | "unknown";
  chain?: string;
  amount?: string;
  to?: string;
  token?: string;
  strategyName?: string;
  raw: string;
}
