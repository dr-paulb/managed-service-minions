import { jest } from '@jest/globals';
import { CircuitBreaker } from '../circuit-breaker.js';

describe('CircuitBreaker', () => {
  const config = {
    failureThreshold: 3,
    successThreshold: 2,
    timeoutSecs: 1,
    halfOpenMaxRequests: 1,
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts closed', () => {
    const breaker = new CircuitBreaker(config);
    expect(breaker.state).toBe('closed');
    expect(breaker.canExecute()).toBe(true);
  });

  it('records success in closed state and resets failures', () => {
    const breaker = new CircuitBreaker(config);
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordSuccess();
    expect(breaker.state).toBe('closed');
  });

  it('opens after threshold failures', () => {
    const breaker = new CircuitBreaker(config);
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.state).toBe('open');
    expect(breaker.canExecute()).toBe(false);
    expect(breaker.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('transitions to half-open after timeout', () => {
    const breaker = new CircuitBreaker(config);
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();
    jest.advanceTimersByTime(1100);
    expect(breaker.state).toBe('half-open');
    expect(breaker.canExecute()).toBe(true);
  });

  it('limits half-open requests', () => {
    const breaker = new CircuitBreaker({ ...config, halfOpenMaxRequests: 1 });
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();
    jest.advanceTimersByTime(1100);
    breaker.canExecute();
    expect(breaker.canExecute()).toBe(false);
  });

  it('closes after success threshold in half-open', () => {
    const breaker = new CircuitBreaker(config);
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();
    jest.advanceTimersByTime(1100);
    breaker.canExecute();
    breaker.recordSuccess();
    breaker.recordSuccess();
    expect(breaker.state).toBe('closed');
  });

  it('trips back to open on failure in half-open', () => {
    const breaker = new CircuitBreaker(config);
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();
    jest.advanceTimersByTime(1100);
    breaker.canExecute();
    breaker.recordFailure();
    expect(breaker.state).toBe('open');
  });

  it('returns zero retryAfter when closed', () => {
    const breaker = new CircuitBreaker(config);
    expect(breaker.retryAfterSeconds).toBe(0);
  });
});
