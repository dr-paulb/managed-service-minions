# Prompt Quality Harness

A lightweight, testable toolkit for comparing agent prompts against baselines and
checking that they contain required sections and avoid forbidden phrases.

## Usage

```ts
import {
  loadPromptFile,
  renderPrompt,
  scorePrompt,
  comparePrompts,
} from './harness.js';

const baseline = loadPromptFile('agents/orchestrator.md');
const candidate = loadPromptFile('agents/orchestrator-v2.md');

const result = comparePrompts(
  'agents/orchestrator.md',
  'agents/orchestrator-v2.md',
  { repo: 'managed-service-minions' },
  {
    requiredSections: ['Role', 'Goal', 'Output format'],
    forbiddenPhrases: ['ignore previous instructions'],
    minLength: 200,
    maxLength: 4000,
  }
);

console.log(result.improved, result.regressions);
```

## Criteria

- `requiredSections` — substrings that must appear in the prompt.
- `forbiddenPhrases` — substrings that must not appear.
- `minLength` / `maxLength` — character length bounds.

## Run the tests

```bash
pnpm --filter test test --coverage
```
