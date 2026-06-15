export interface UserFacingError {
  severity: 'success' | 'degraded' | 'failure' | 'infrastructure';
  summary: string;
  cause: string;
  impact: string;
  action: string;
  correlationId: string;
}

export function formatError(e: UserFacingError): string {
  const icon =
    e.severity === 'success'
      ? '✅'
      : e.severity === 'degraded'
        ? '⚠️'
        : e.severity === 'failure'
          ? '❌'
          : '🚨';

  return [
    `${icon} ${e.summary}`,
    `Cause: ${e.cause}`,
    `Impact: ${e.impact}`,
    `Action: ${e.action}`,
    `Session: ${e.correlationId}`
  ].join('\n');
}
