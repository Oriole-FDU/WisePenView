/**
 * Retry delay strategies for `ConnectionManager`: after disconnect/error, the manager calls the
 * strategy to get milliseconds to wait before the next `adapter.open()`. Return `null` to stop
 * retrying and move to `error`.
 *
 * @example Default (exponential backoff) — same as omitting the second ctor arg:
 * ```ts
 * new ConnectionManager(adapter);
 * ```
 *
 * @example Pick a built-in factory:
 * ```ts
 * new ConnectionManager(adapter, RetryStrategies.exponential(500, 20000, 6));
 * new ConnectionManager(adapter, RetryStrategies.fibonacci(1000, 8));
 * new ConnectionManager(adapter, RetryStrategies.polling(3000, 10));
 * ```
 *
 * @example Custom strategy:
 * ```ts
 * const custom: RetryStrategy = ({ retryCount, lastDelay }) =>
 *   retryCount >= 3 ? null : (lastDelay ?? 1000) * 2;
 * new ConnectionManager(adapter, custom);
 * ```
 */

interface RetryStrategyInput {
  retryCount: number;
  lastDelay: number | undefined;
}

export type RetryStrategy = (input: RetryStrategyInput) => number | null;

export const RetryStrategies = {
  // 1. Exponential Backoff
  exponential:
    (base = 1000, max = 30000, maxRetries = 5): RetryStrategy =>
    ({ retryCount }) => {
      if (retryCount >= maxRetries) return null;
      return Math.min(base * 2 ** retryCount, max);
    },

  // 2. Fibonacci Backoff
  fibonacci: (base = 1000, maxRetries = 8): RetryStrategy => {
    const fib = (n: number): number => (n <= 1 ? n : fib(n - 1) + fib(n - 2));
    return ({ retryCount }) => {
      if (retryCount >= maxRetries) return null;
      return base * fib(retryCount + 1);
    };
  },

  // 3. Fixed Interval
  polling:
    (interval = 3000, maxRetries = 10): RetryStrategy =>
    ({ retryCount }) =>
      retryCount >= maxRetries ? null : interval,
} as const;
