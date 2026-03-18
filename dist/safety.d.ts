import type { SafetyConfig, AuditEntry, TransactionRequest } from "./types.js";
export declare class SafetyGuard {
    private config;
    private auditLog;
    private dailyTotal;
    private dailyDate;
    constructor(config?: Partial<SafetyConfig>);
    checkTransaction(req: TransactionRequest, estimatedUsd: number): {
        approved: boolean;
        reason?: string;
        requiresConfirmation: boolean;
    };
    private resetDailyIfNeeded;
    private log;
    getAuditLog(): AuditEntry[];
    getDailyStats(): {
        total: number;
        remaining: number;
        date: string;
    };
}
