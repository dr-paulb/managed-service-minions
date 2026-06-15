import { TokenBucketRateLimiter, createRateLimiter } from '../rate-limiter.js';

describe('rate limiter', () => {
  it('creates a default limiter', () => {
    const limiter = createRateLimiter();
    expect(limiter.canExecute('key').allowed).toBe(true);
  });

  it('creates a configured limiter', () => {
    const limiter = createRateLimiter({ requestsPerMinute: 10, burst: 1 });
    expect(limiter.canExecute('key').allowed).toBe(true);
    expect(limiter.canExecute('key').allowed).toBe(false);
  });

  it('allows requests within burst', () => {
    const limiter = new TokenBucketRateLimiter({ requestsPerMinute: 60, burst: 3 });
    expect(limiter.canExecute('key', 0).allowed).toBe(true);
    expect(limiter.canExecute('key', 0).allowed).toBe(true);
    expect(limiter.canExecute('key', 0).allowed).toBe(true);
    expect(limiter.canExecute('key', 0).allowed).toBe(false);
  });

  it('refills tokens over time', () => {
    const limiter = new TokenBucketRateLimiter({ requestsPerMinute: 60, burst: 1 });
    expect(limiter.canExecute('key', 0).allowed).toBe(true);
    expect(limiter.canExecute('key', 0).allowed).toBe(false);
    expect(limiter.canExecute('key', 60_000).allowed).toBe(true);
  });

  it('reports retryAfterSeconds when bucket is empty', () => {
    const limiter = new TokenBucketRateLimiter({ requestsPerMinute: 60, burst: 1 });
    limiter.canExecute('key', 0);
    const result = limiter.canExecute('key', 0);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });
});
