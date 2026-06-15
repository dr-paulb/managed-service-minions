# Delegate Management

Teaches the orchestrator how to spawn and monitor minions via Goose primitives.

## Dispatch
Use the `delegate` tool with `source: <minion-name>` and `async: true` for complex pipelines, `async: false` for simple queries.

## Result collection
For async delegates, Goose returns a task ID. Collect results with `load(source: <task_id>)`.

## Monitoring
Use the built-in Orchestrator extension tools:
- `orchestrator__list_sessions`
- `orchestrator__view_session`
- `orchestrator__interrupt_agent`

## Validation
Validate each minion output against its JSON schema. Retry once with feedback if validation fails.
