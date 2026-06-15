# ADR-023: 100% Test Coverage Gate for Runnable Code

> **Status:** Accepted  
> **Date:** 2026-06-14  
> **Author:** Kimi Code CLI  
> **Supersedes / Amends:** `testing-strategy.md`, `delivery-specification.md`, `AGENTS.md`

## Context

The Goose Agent Framework is a multi-agent system that orchestrates engineering operations across chat platforms, source control, and ticket systems. Mistakes in the orchestrator, toolshed, or chat adapters can have outsized impact: a missed allowlist check could let a minion delete infrastructure, a circuit-breaker bug could silently block all ticket lookups, or a malformed error response could leave a destructive action unreviewed.

We already have a layered testing strategy (`testing-strategy.md`) and a human-in-the-loop governance model. However, as the codebase grows from documentation into runnable TypeScript packages and MCP extensions, we need a clear, non-negotiable signal that every line of runnable code is exercised by automated tests before it reaches production.

## Decision

We will enforce **100% line, branch, function, and statement coverage** for all runnable TypeScript code in `packages/` and `extensions/`.

### Scope

| In Scope | Out of Scope |
|---|---|
| `packages/framework-core/src/**/*.ts` | Markdown/JSON plugin content (`agents/`, `skills/`, `commands/`, `rules/`) |
| `extensions/mcp-toolshed/src/**/*.ts` | Generated or vendored third-party code |
| `extensions/slack-bot/src/**/*.ts` | Platform-specific shims with documented exemption |
| `extensions/teams-bot/src/**/*.ts` | `infra/` Bicep templates |
| `extensions/agent-dashboard/src/**/*.ts` | `test/` harness scaffolding (covered by its own policy) |

### Enforcement

1. Each package's `jest.config.js` sets `coverageThreshold: { global: { branches: 100, functions: 100, lines: 100, statements: 100 } }`.
2. `pnpm test --coverage` runs in CI and fails if any package drops below 100%.
3. Exemptions are allowed only for generated code, third-party vendored code, or platform-specific shims. Each exemption must be explicitly excluded in the package's Jest config and include a written rationale in the PR.
4. New code cannot be merged unless it maintains or improves the 100% coverage level.

## Consequences

### Positive

- Every path through the toolshed (allowlists, rate limits, circuit breakers, audit logging) is exercised.
- Regressions in error handling and edge cases are caught immediately.
- Refactors of shared core code are safer because tests must cover all branches.
- Sets a clear cultural expectation: untested code is not shipped.

### Negative

- Initial development will be slower as tests are written alongside code.
- Developers may be tempted to write low-value tests just to hit coverage. We mitigate this by requiring meaningful assertions and by reviewing tests in PRs.
- Exemption requests add process overhead. We mitigate by keeping the exemption criteria narrow.

## Alternatives Considered

| Alternative | Why Rejected |
|---|---|
| 80% coverage threshold | Leaves critical error paths untested in security-sensitive code. |
| Coverage only for critical packages | Creates ambiguity about what is "critical" and weakens the gate over time. |
| No coverage gate, rely on integration tests alone | Integration tests are slower and may not exercise every failure branch. |

## Related Decisions

- ADR-005: Tool allowlisting per minion
- ADR-007: Human-in-the-loop for destructive operations
- `testing-strategy.md`
- `delivery-specification.md` §9
