interface Bucket {
  tokens: number;
  updatedAt: number;
}

export interface RateLimitOptions {
  tokensPerInterval: number;
  intervalMs: number;
}

export const createRateLimiter = (options: RateLimitOptions) => {
  const buckets = new Map<string, Bucket>();
  return {
    async consume(identifier: string, tokens: number): Promise<boolean> {
      const now = Date.now();
      const bucket = buckets.get(identifier) ?? { tokens: options.tokensPerInterval, updatedAt: now };
      const elapsed = now - bucket.updatedAt;
      if (elapsed > options.intervalMs) {
        bucket.tokens = options.tokensPerInterval;
        bucket.updatedAt = now;
      }
      if (bucket.tokens < tokens) {
        buckets.set(identifier, bucket);
        return false;
      }
      bucket.tokens -= tokens;
      bucket.updatedAt = now;
      buckets.set(identifier, bucket);
      return true;
    },
  };
};

