function createRateLimiter(options = {}) {
  const windowMs = Number(options.windowMs || 60_000);
  const maxRequests = Number(options.maxRequests || 60);
  const message = options.message || 'Too many requests, please try again later';
  const buckets = new Map();

  return function rateLimiter(req, res, next) {
    const now = Date.now();
    const key = [
      req.ip || req.socket?.remoteAddress || 'unknown',
      req.method,
      req.originalUrl || req.url
    ].join('|');
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, {
        count: 1,
        resetAt: now + windowMs
      });
      return next();
    }

    current.count += 1;

    if (current.count > maxRequests) {
      const retryAfter = Math.ceil((current.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ message });
    }

    if (buckets.size > 10_000) {
      for (const [bucketKey, bucket] of buckets.entries()) {
        if (bucket.resetAt <= now) {
          buckets.delete(bucketKey);
        }
      }
    }

    return next();
  };
}

module.exports = {
  createRateLimiter
};
