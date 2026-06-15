export interface MinionBudget {
  maxTokensPerRun: number;
  warningThreshold: number; // e.g., 0.8
}

export class TokenBudgetTracker {
  private used = 0;

  constructor(private readonly budget: MinionBudget) {}

  recordUsage(tokensUsed: number): { status: 'ok' | 'warning' | 'exceeded'; remaining: number } {
    this.used += tokensUsed;
    const remaining = Math.max(0, this.budget.maxTokensPerRun - this.used);
    const ratio = this.used / this.budget.maxTokensPerRun;

    if (ratio >= 1) {
      return { status: 'exceeded', remaining };
    }
    if (ratio >= this.budget.warningThreshold) {
      return { status: 'warning', remaining };
    }
    return { status: 'ok', remaining };
  }

  getWrapUpHint(): string {
    const ratio = this.used / this.budget.maxTokensPerRun;
    if (ratio >= 1) {
      return 'Token budget exceeded. Return final JSON now.';
    }
    if (ratio >= this.budget.warningThreshold) {
      return 'You are near your token budget. Summarize and return final JSON now.';
    }
    return '';
  }
}
