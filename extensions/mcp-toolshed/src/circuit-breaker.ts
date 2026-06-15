export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeoutSecs: number;
  halfOpenMaxRequests: number;
}

export type BreakerState = 'closed' | 'open' | 'half-open';

export class CircuitBreaker {
  private _state: BreakerState = 'closed';
  private failures = 0;
  private successes = 0;
  private openedAt = 0;
  private halfOpenRequests = 0;

  constructor(private readonly config: CircuitBreakerConfig) {}

  get state(): BreakerState {
    if (this._state === 'open' && this.shouldMoveToHalfOpen()) {
      this._state = 'half-open';
      this.halfOpenRequests = 0;
      this.successes = 0;
    }
    return this._state;
  }

  get retryAfterSeconds(): number {
    if (this._state !== 'open') return 0;
    const elapsed = (Date.now() - this.openedAt) / 1000;
    return Math.max(0, Math.ceil(this.config.timeoutSecs - elapsed));
  }

  canExecute(): boolean {
    const current = this.state;
    if (current === 'open') return false;
    if (current === 'half-open' && this.halfOpenRequests >= this.config.halfOpenMaxRequests) {
      return false;
    }
    if (current === 'half-open') {
      this.halfOpenRequests++;
    }
    return true;
  }

  recordSuccess(): void {
    if (this._state === 'half-open') {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this._state = 'closed';
        this.failures = 0;
        this.successes = 0;
      }
    } else {
      this.failures = 0;
    }
  }

  recordFailure(): void {
    if (this._state === 'half-open') {
      this.trip();
      return;
    }

    this.failures++;
    if (this.failures >= this.config.failureThreshold) {
      this.trip();
    }
  }

  private trip(): void {
    this._state = 'open';
    this.openedAt = Date.now();
    this.failures = 0;
    this.successes = 0;
    this.halfOpenRequests = 0;
  }

  private shouldMoveToHalfOpen(): boolean {
    return (Date.now() - this.openedAt) / 1000 >= this.config.timeoutSecs;
  }
}
