# Task Decomposition

Map a classified intent into a directed acyclic graph (DAG) of minion runs.

## Rules
- Break complex intents into ordered phases.
- Place independent minions in the same phase.
- List dependencies explicitly.
- Respect per-minion allowlists and token budgets.

## Output format
Return JSON with `phases`, where each phase contains `minion_type`, `task`, `correlation_id`, and `depends_on`.
