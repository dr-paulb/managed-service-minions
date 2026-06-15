# Error Handling

Format every user-facing failure with a consistent four-field template.

## Template
- Severity icon and one-line summary
- Cause
- Impact
- Action, including the correlation ID

## Severity levels
- `success`
- `degraded`
- `failure`
- `infrastructure`

## Example
```text
❌ Unable to review PR #342
Cause: GitHub API rate limit exceeded (50 req/min).
Impact: Review not posted. PR #342 remains unreviewed.
Action: Review will be retried automatically in 2 minutes.
Session: corr_a1b2c3
```
