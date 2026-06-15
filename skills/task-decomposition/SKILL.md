# Task Decomposition

The orchestrator invokes this skill to map a classified intent into a directed acyclic graph (DAG) of minion runs.

## When to invoke
- When `intent-classification` returns `complexity: complex`.
- When the request explicitly requires multiple minions (e.g., ticket→fix→PR).

## Input
- `intent`: the classified intent (string).
- `entities`: extracted entities such as `pr_number`, `ticket_id`, `repo`, etc. (object).
- `platform`: the source channel (string).
- `correlation_root`: the session root correlation ID (string).

## Output
Return a JSON object with an ordered list of phases. Each phase contains one or more minion specs that can run in parallel.

```json
{
  "phases": [
    {
      "phase": 1,
      "minions": [
        {
          "minion_type": "ticket_lookup",
          "agent": "ticket-analyst",
          "task": "string — concrete instructions",
          "correlation_id": "corr_<uuid>.1",
          "depends_on": []
        }
      ]
    }
  ]
}
```

## Rules
- Place independent minions in the same phase.
- List `depends_on` explicitly using upstream `correlation_id` values.
- Respect per-minion allowlists and token budgets from `rules/models.yaml`.
- Use the correlation-root format: `corr_<uuid>.<phase>.<index>`.

## Example: ticket_fix_pr
```json
{
  "phases": [
    {
      "phase": 1,
      "minions": [
        {
          "minion_type": "ticket_lookup",
          "agent": "ticket-analyst",
          "task": "Fetch details for work item #567 in Azure DevOps.",
          "correlation_id": "corr_a1b2c3.1",
          "depends_on": []
        }
      ]
    },
    {
      "phase": 2,
      "minions": [
        {
          "minion_type": "code_explorer",
          "agent": "code-explorer",
          "task": "Find files related to the auth timeout bug described in work item #567.",
          "correlation_id": "corr_a1b2c3.2",
          "depends_on": ["corr_a1b2c3.1"]
        }
      ]
    },
    {
      "phase": 3,
      "minions": [
        {
          "minion_type": "pr_create",
          "agent": "pr-crafter",
          "task": "Create a branch and PR that fixes the auth timeout bug for work item #567.",
          "correlation_id": "corr_a1b2c3.3",
          "depends_on": ["corr_a1b2c3.2"]
        },
        {
          "minion_type": "code_reviewer",
          "agent": "code-reviewer",
          "task": "Pre-review the proposed fix area for the auth timeout bug.",
          "correlation_id": "corr_a1b2c3.4",
          "depends_on": ["corr_a1b2c3.2"]
        }
      ]
    }
  ]
}
```
