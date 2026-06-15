# Intent Classification

Classify the user message into one of the supported intents.

## Supported intents
- `ticket_lookup` — "What's the status of INC00421?"
- `ticket_summary` — "Summarize AB#1234"
- `code_explore` — "Find where login timeout is handled"
- `code_review` — "Review PR #342"
- `pr_create` — "Create a PR for this fix"
- `security_audit` — "Audit this repo for secrets"
- `ticket_fix_pr` — "Fix work item #567 and create a PR"

## Output format
Return JSON matching `schemas/intent.json`.
