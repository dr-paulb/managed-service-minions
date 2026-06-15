export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

export interface RateLimiter {
  canExecute(key: string, now?: number): RateLimitResult;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  burst: number;
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

export class TokenBucketRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, TokenBucket>();

  constructor(private readonly config: RateLimitConfig) {}

  canExecute(key: string, now = Date.now()): RateLimitResult {
    const capacity = this.config.burst;
    const refillRatePerMs = this.config.requestsPerMinute / 60_000;

    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { tokens: capacity, lastRefill: now };
    }

    const elapsedMs = now - bucket.lastRefill;
    const tokensToAdd = elapsedMs * refillRatePerMs;
    bucket.tokens = Math.min(capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    if (bucket.tokens < 1) {
      const deficit = 1 - bucket.tokens;
      const retryAfterSeconds = Math.max(1, Math.ceil(deficit / (this.config.requestsPerMinute / 60)));
      this.buckets.set(key, bucket);
      return { allowed: false, retryAfterSeconds };
    }

    bucket.tokens -= 1;
    this.buckets.set(key, bucket);
    return { allowed: true };
  }
}

export function createRateLimiter(config?: RateLimitConfig): RateLimiter {
  return new TokenBucketRateLimiter(config ?? { requestsPerMinute: 60, burst: 20 });
}
