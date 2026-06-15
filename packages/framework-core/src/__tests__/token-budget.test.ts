import { TokenBudgetTracker, type MinionBudget } from '../token-budget.js';

describe('TokenBudgetTracker', () => {
  const budget: MinionBudget = { maxTokensPerRun: 1000, warningThreshold: 0.8 };

  it('returns ok when usage is below the warning threshold', () => {
    const tracker = new TokenBudgetTracker(budget);
    expect(tracker.recordUsage(100)).toEqual({ status: 'ok', remaining: 900 });
  });

  it('returns warning when usage crosses the warning threshold', () => {
    const tracker = new TokenBudgetTracker(budget);
    expect(tracker.recordUsage(800)).toEqual({ status: 'warning', remaining: 200 });
  });

  it('returns exceeded when usage reaches the budget', () => {
    const tracker = new TokenBudgetTracker(budget);
    expect(tracker.recordUsage(1000)).toEqual({ status: 'exceeded', remaining: 0 });
  });

  it('accumulates usage across multiple calls', () => {
    const tracker = new TokenBudgetTracker(budget);
    tracker.recordUsage(400);
    tracker.recordUsage(400);
    expect(tracker.recordUsage(200)).toEqual({ status: 'exceeded', remaining: 0 });
  });

  it('does not let remaining go negative', () => {
    const tracker = new TokenBudgetTracker(budget);
    expect(tracker.recordUsage(2000)).toEqual({ status: 'exceeded', remaining: 0 });
  });

  describe('getWrapUpHint', () => {
    it('returns an empty string when usage is ok', () => {
      const tracker = new TokenBudgetTracker(budget);
      tracker.recordUsage(100);
      expect(tracker.getWrapUpHint()).toBe('');
    });

    it('returns a warning hint near the threshold', () => {
      const tracker = new TokenBudgetTracker(budget);
      tracker.recordUsage(800);
      expect(tracker.getWrapUpHint()).toBe('You are near your token budget. Summarize and return final JSON now.');
    });

    it('returns an exceeded hint when over budget', () => {
      const tracker = new TokenBudgetTracker(budget);
      tracker.recordUsage(1200);
      expect(tracker.getWrapUpHint()).toBe('Token budget exceeded. Return final JSON now.');
    });
  });
});
