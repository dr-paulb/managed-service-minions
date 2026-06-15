import { formatError, type UserFacingError } from '../errors.js';

describe('formatError', () => {
  const base: UserFacingError = {
    severity: 'failure',
    summary: 'Could not fetch PR #342',
    cause: 'GitHub API returned 404',
    impact: 'No review can be generated for this PR.',
    action: 'Check the PR number and try again.',
    correlationId: 'corr_abc.1.github-003',
  };

  it('formats a failure error', () => {
    expect(formatError(base)).toBe(
      [
        '❌ Could not fetch PR #342',
        'Cause: GitHub API returned 404',
        'Impact: No review can be generated for this PR.',
        'Action: Check the PR number and try again.',
        'Session: corr_abc.1.github-003',
      ].join('\n')
    );
  });

  it('uses a success icon', () => {
    expect(formatError({ ...base, severity: 'success' })).toContain('✅ Could not fetch PR #342');
  });

  it('uses a degraded icon', () => {
    expect(formatError({ ...base, severity: 'degraded' })).toContain('⚠️ Could not fetch PR #342');
  });

  it('uses an infrastructure icon', () => {
    expect(formatError({ ...base, severity: 'infrastructure' })).toContain('🚨 Could not fetch PR #342');
  });
});
