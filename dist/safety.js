export class SafetyGuard {
    config;
    auditLog = [];
    dailyTotal = 0;
    dailyDate = new Date().toISOString().split("T")[0];
    constructor(config) {
        this.config = {
            maxSingleTxUsd: config?.maxSingleTxUsd ?? 100,
            dailyTxLimitUsd: config?.dailyTxLimitUsd ?? 1000,
            requireConfirmationAboveUsd: config?.requireConfirmationAboveUsd ?? 50,
            whitelistedAddresses: config?.whitelistedAddresses ?? [],
            blockedAddresses: config?.blockedAddresses ?? [],
        };
    }
    checkTransaction(req, estimatedUsd) {
        this.resetDailyIfNeeded();
        // Check blocked addresses
        if (this.config.blockedAddresses.includes(req.to)) {
            this.log("BLOCKED", req.chain, `Blocked address: ${req.to}`, estimatedUsd, false);
            return { approved: false, reason: "Address is blocked", requiresConfirmation: false };
        }
        // Check single transaction limit
        if (estimatedUsd > this.config.maxSingleTxUsd) {
            this.log("LIMIT_EXCEEDED", req.chain, `$${estimatedUsd} exceeds max $${this.config.maxSingleTxUsd}`, estimatedUsd, false);
            return {
                approved: false,
                reason: `Amount $${estimatedUsd} exceeds single tx limit $${this.config.maxSingleTxUsd}`,
                requiresConfirmation: false,
            };
        }
        // Check daily limit
        if (this.dailyTotal + estimatedUsd > this.config.dailyTxLimitUsd) {
            this.log("DAILY_LIMIT", req.chain, `Daily total would exceed $${this.config.dailyTxLimitUsd}`, estimatedUsd, false);
            return {
                approved: false,
                reason: `Daily limit $${this.config.dailyTxLimitUsd} would be exceeded`,
                requiresConfirmation: false,
            };
        }
        // Check if confirmation needed
        const needsConfirmation = estimatedUsd > this.config.requireConfirmationAboveUsd &&
            !this.config.whitelistedAddresses.includes(req.to);
        this.log("APPROVED", req.chain, `$${estimatedUsd} to ${req.to.slice(0, 10)}...`, estimatedUsd, true);
        this.dailyTotal += estimatedUsd;
        return { approved: true, requiresConfirmation: needsConfirmation };
    }
    resetDailyIfNeeded() {
        const today = new Date().toISOString().split("T")[0];
        if (today !== this.dailyDate) {
            this.dailyTotal = 0;
            this.dailyDate = today;
        }
    }
    log(action, chain, details, amountUsd, approved) {
        this.auditLog.push({
            timestamp: Date.now(),
            action,
            chain,
            details,
            amountUsd,
            approved,
        });
        if (this.auditLog.length > 10000) {
            this.auditLog = this.auditLog.slice(-5000);
        }
    }
    getAuditLog() {
        return [...this.auditLog];
    }
    getDailyStats() {
        this.resetDailyIfNeeded();
        return {
            total: this.dailyTotal,
            remaining: this.config.dailyTxLimitUsd - this.dailyTotal,
            date: this.dailyDate,
        };
    }
}
