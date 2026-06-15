# Approval Gating

Pause destructive actions and request explicit human approval.

## Destructive actions
Examples: merge PR, close ticket, deploy, delete branch, force push.

## Flow
1. Detect a destructive tool call.
2. Return `approval_required` with an `approval_id`.
3. Post an approval card to the originating chat channel.
4. On approval, re-issue the tool call. On denial, abort and report.

## Timeout
Approval requests expire after 15 minutes by default.
