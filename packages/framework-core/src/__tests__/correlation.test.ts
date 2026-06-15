import {
  createRootCorrelationId,
  createMinionCorrelationId,
  createToolCorrelationId,
} from '../correlation.js';

describe('correlation IDs', () => {
  it('creates a root correlation ID', () => {
    const id = createRootCorrelationId();
    expect(id).toMatch(/^corr_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('creates a minion correlation ID', () => {
    expect(createMinionCorrelationId('corr_abc', 1)).toBe('corr_abc.1');
  });

  it('creates a tool correlation ID', () => {
    expect(createToolCorrelationId('corr_abc.1', 'github', 3)).toBe('corr_abc.1.github-3');
  });
});
