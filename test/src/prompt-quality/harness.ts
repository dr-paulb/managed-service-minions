import { readFileSync } from 'node:fs';
import {
  type PromptCriteria,
  type PromptScore,
  type PromptCheck,
  type ComparisonResult,
} from './types.js';

export function loadPromptFile(path: string): string {
  return readFileSync(path, 'utf-8');
}

export function renderPrompt(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    return key in variables ? variables[key] : `{{${key}}}`;
  });
}

export function scorePrompt(prompt: string, criteria: PromptCriteria): PromptScore {
  const checks: PromptCheck[] = [];

  if (criteria.requiredSections) {
    for (const section of criteria.requiredSections) {
      const passed = prompt.includes(section);
      checks.push({
        name: `required-section:${section}`,
        passed,
        message: passed ? undefined : `Missing required section: ${section}`,
      });
    }
  }

  if (criteria.forbiddenPhrases) {
    for (const phrase of criteria.forbiddenPhrases) {
      const found = prompt.includes(phrase);
      checks.push({
        name: `forbidden-phrase:${phrase}`,
        passed: !found,
        message: found ? `Found forbidden phrase: ${phrase}` : undefined,
      });
    }
  }

  if (criteria.minLength !== undefined) {
    const passed = prompt.length >= criteria.minLength;
    checks.push({
      name: 'min-length',
      passed,
      message: passed
        ? undefined
        : `Prompt length ${prompt.length} is below minimum ${criteria.minLength}`,
    });
  }

  if (criteria.maxLength !== undefined) {
    const passed = prompt.length <= criteria.maxLength;
    checks.push({
      name: 'max-length',
      passed,
      message: passed
        ? undefined
        : `Prompt length ${prompt.length} exceeds maximum ${criteria.maxLength}`,
    });
  }

  const total = checks.length;
  const score = checks.filter((c) => c.passed).length;
  const passed = total === 0 || score === total;

  return { passed, total, score, checks };
}

export function comparePrompts(
  baselinePath: string,
  candidatePath: string,
  variables: Record<string, string>,
  criteria: PromptCriteria,
  scoreFn: (prompt: string, criteria: PromptCriteria) => PromptScore = scorePrompt
): ComparisonResult {
  const baseline = renderPrompt(loadPromptFile(baselinePath), variables);
  const candidate = renderPrompt(loadPromptFile(candidatePath), variables);

  const baselineScore = scoreFn(baseline, criteria);
  const candidateScore = scoreFn(candidate, criteria);

  const regressions: string[] = [];
  for (const baseCheck of baselineScore.checks) {
    const candidateCheck = candidateScore.checks.find((c) => c.name === baseCheck.name);
    if (baseCheck.passed && candidateCheck && !candidateCheck.passed) {
      regressions.push(candidateCheck.message ?? `Regression in ${candidateCheck.name}`);
    }
  }

  const improved = candidateScore.score > baselineScore.score && regressions.length === 0;

  return {
    baselineScore,
    candidateScore,
    improved,
    regressions,
  };
}
