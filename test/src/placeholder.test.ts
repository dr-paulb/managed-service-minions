import { TokenBudgetTracker, formatError } from 'framework-core';

describe('framework-core skeleton', () => {
  test('TokenBudgetTracker reports ok under threshold', () => {
    const tracker = new TokenBudgetTracker({ maxTokensPerRun: 1000, warningThreshold: 0.8 });
    expect(tracker.recordUsage(100)).toEqual({ status: 'ok', remaining: 900 });
  });

  test('formatError returns four-field message', () => {
    const text = formatError({
      severity: 'failure',
      summary: 'It broke',
      cause: 'Test cause',
      impact: 'No impact in test',
      action: 'Retry',
      correlationId: 'corr_test'
    });
    expect(text).toContain('It broke');
    expect(text).toContain('corr_test');
  });
});
