export function computeRetryDelaySeconds(
  policy: RetryPolicy,
  attemptNumber: number,
  random: RandomPort,
): number {
  const exponentialDelay = policy.baseDelaySeconds * policy.backoffFactor ** (attemptNumber - 1);
  const cappedDelay = Math.min(exponentialDelay, policy.maximumDelaySeconds);
  const half = Math.floor(cappedDelay / 2);

  return half + random.integerBetween(0, cappedDelay - half);
}
