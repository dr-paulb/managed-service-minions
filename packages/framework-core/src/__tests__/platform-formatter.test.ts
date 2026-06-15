import { formatForPlatform } from '../platform-formatter.js';

describe('formatForPlatform', () => {
  it('formats for both platforms by default', () => {
    const result = formatForPlatform({ text: 'Hello' });
    expect(result.plainText).toBe('Hello');
    expect(result.slack).toEqual({ text: 'Hello', blocks: undefined });
    expect(result.teams).toEqual({ text: 'Hello', adaptiveCard: undefined });
  });

  it('formats only for slack when requested', () => {
    const result = formatForPlatform({ text: 'Hello' }, ['slack']);
    expect(result.slack).toEqual({ text: 'Hello', blocks: undefined });
    expect(result.teams).toBeUndefined();
  });

  it('formats only for teams when requested', () => {
    const result = formatForPlatform({ text: 'Hello' }, ['teams']);
    expect(result.teams).toEqual({ text: 'Hello', adaptiveCard: undefined });
    expect(result.slack).toBeUndefined();
  });

  it('returns empty plainText when no text is provided', () => {
    const result = formatForPlatform({ blocks: [] });
    expect(result.plainText).toBe('');
  });

  it('passes through rich content', () => {
    const blocks = [{ type: 'section', text: 'Hi' }];
    const card = { type: 'AdaptiveCard', body: [] };
    const result = formatForPlatform({ text: 'Hi', blocks, adaptiveCard: card });
    expect(result.slack).toEqual({ text: 'Hi', blocks });
    expect(result.teams).toEqual({ text: 'Hi', adaptiveCard: card });
  });
});
