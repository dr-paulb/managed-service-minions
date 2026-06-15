import { describe, it, expect } from '@jest/globals';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  loadPromptFile,
  renderPrompt,
  scorePrompt,
  comparePrompts,
} from '../prompt-quality/harness.js';

function createTempFile(content: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'prompt-quality-'));
  const path = join(dir, 'prompt.md');
  writeFileSync(path, content, 'utf-8');
  return path;
}

function cleanup(path: string): void {
  rmSync(path.substring(0, path.lastIndexOf('/')), { recursive: true, force: true });
}

describe('loadPromptFile', () => {
  it('reads a prompt file as UTF-8', () => {
    const path = createTempFile('Hello {{name}}');
    const result = loadPromptFile(path);
    expect(result).toBe('Hello {{name}}');
    cleanup(path);
  });
});

describe('renderPrompt', () => {
  it('replaces all variables in the template', () => {
    const result = renderPrompt('Hello {{name}}, welcome to {{place}}', {
      name: 'Alice',
      place: 'Wonderland',
    });
    expect(result).toBe('Hello Alice, welcome to Wonderland');
  });

  it('leaves unreplaced placeholders when a variable is missing', () => {
    const result = renderPrompt('Hello {{name}}, id {{id}}', { name: 'Bob' });
    expect(result).toBe('Hello Bob, id {{id}}');
  });

  it('returns the template unchanged when there are no placeholders', () => {
    const result = renderPrompt('Plain text', {});
    expect(result).toBe('Plain text');
  });
});

describe('scorePrompt', () => {
  it('passes when all required sections are present', () => {
    const result = scorePrompt('Alpha Beta Gamma', {
      requiredSections: ['Alpha', 'Gamma'],
    });
    expect(result.passed).toBe(true);
    expect(result.score).toBe(2);
    expect(result.total).toBe(2);
  });

  it('fails when a required section is missing', () => {
    const result = scorePrompt('Alpha Beta', {
      requiredSections: ['Alpha', 'Gamma'],
    });
    expect(result.passed).toBe(false);
    expect(result.checks[1].message).toBe('Missing required section: Gamma');
  });

  it('passes when no forbidden phrases are present', () => {
    const result = scorePrompt('Hello world', {
      forbiddenPhrases: ['badword'],
    });
    expect(result.passed).toBe(true);
  });

  it('fails when a forbidden phrase is present', () => {
    const result = scorePrompt('This contains badword text', {
      forbiddenPhrases: ['badword'],
    });
    expect(result.passed).toBe(false);
    expect(result.checks[0].message).toBe('Found forbidden phrase: badword');
  });

  it('enforces minimum length', () => {
    const result = scorePrompt('Hi', { minLength: 10 });
    expect(result.passed).toBe(false);
    expect(result.checks[0].message).toContain('below minimum');
  });

  it('enforces maximum length', () => {
    const result = scorePrompt('This is a very long prompt', { maxLength: 5 });
    expect(result.passed).toBe(false);
    expect(result.checks[0].message).toContain('exceeds maximum');
  });

  it('passes length checks when within bounds', () => {
    const result = scorePrompt('Just right', { minLength: 5, maxLength: 15 });
    expect(result.passed).toBe(true);
    expect(result.score).toBe(2);
  });

  it('passes when no criteria are provided', () => {
    const result = scorePrompt('Anything', {});
    expect(result.passed).toBe(true);
    expect(result.total).toBe(0);
  });
});

describe('comparePrompts', () => {
  it('reports improvement when the candidate scores higher with no regressions', () => {
    const basePath = createTempFile('Baseline prompt');
    const candPath = createTempFile('Candidate prompt with extra required section');

    const result = comparePrompts(basePath, candPath, {}, {
      requiredSections: ['extra required section'],
    });

    expect(result.improved).toBe(true);
    expect(result.regressions).toEqual([]);
    expect(result.candidateScore.score).toBeGreaterThan(result.baselineScore.score);
    cleanup(basePath);
    cleanup(candPath);
  });

  it('reports regression when the candidate fails a check the baseline passed', () => {
    const basePath = createTempFile('Baseline prompt');
    const candPath = createTempFile('');

    const result = comparePrompts(basePath, candPath, {}, {
      minLength: 5,
    });

    expect(result.improved).toBe(false);
    expect(result.regressions.length).toBeGreaterThan(0);
    cleanup(basePath);
    cleanup(candPath);
  });

  it('loads and renders variables for both prompts', () => {
    const basePath = createTempFile('Hello {{name}} from baseline');
    const candPath = createTempFile('Hello {{name}} from candidate');

    const result = comparePrompts(basePath, candPath, { name: 'World' }, {
      requiredSections: ['World'],
    });

    expect(result.baselineScore.passed).toBe(true);
    expect(result.candidateScore.passed).toBe(true);
    cleanup(basePath);
    cleanup(candPath);
  });

  it('uses check name as regression message when message is missing', () => {
    const basePath = createTempFile('baseline');
    const candPath = createTempFile('candidate');

    const scoreFn = (prompt: string): import('../prompt-quality/types.js').PromptScore => ({
      passed: prompt === 'baseline',
      total: 1,
      score: prompt === 'baseline' ? 1 : 0,
      checks: [{ name: 'custom-check', passed: prompt === 'baseline' }],
    });

    const result = comparePrompts(basePath, candPath, {}, {}, scoreFn);
    expect(result.regressions).toEqual(['Regression in custom-check']);
    cleanup(basePath);
    cleanup(candPath);
  });
});
