import { describe, expect, it } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';

describe('framework plugin end-to-end', () => {
  it('has a valid plugin manifest', () => {
    const manifestPath = path.join(process.cwd(), '..', '.plugin', 'plugin.json');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    expect(manifest.name).toBeTruthy();
    expect(manifest.version).toBeTruthy();
    expect(typeof manifest.agents).toBe('string');
    expect(fs.existsSync(path.join(process.cwd(), '..', manifest.agents as string, 'orchestrator.md'))).toBe(true);
  });

  it('ships the orchestrator agent prompt', () => {
    const promptPath = path.join(process.cwd(), '..', 'agents', 'orchestrator.md');
    expect(fs.existsSync(promptPath)).toBe(true);

    const content = fs.readFileSync(promptPath, 'utf8');
    expect(content.toLowerCase()).toContain('delegate');
    expect(content.toLowerCase()).toContain('minion');
  });

  it('ships the ticket-to-pr recipe', () => {
    const recipePath = path.join(process.cwd(), '..', 'commands', 'ticket-to-pr.yaml');
    expect(fs.existsSync(recipePath)).toBe(true);
  });
});
