const test = require('node:test');
const assert = require('node:assert/strict');
const { createRateLimiter } = require('../src/middleware/rateLimit');

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    set(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

test('rate limiter blocks requests over the configured limit', () => {
  const limiter = createRateLimiter({
    windowMs: 60_000,
    maxRequests: 2,
    message: 'limited'
  });
  const req = {
    ip: '127.0.0.1',
    method: 'POST',
    originalUrl: '/api/auth/login'
  };
  let nextCount = 0;

  limiter(req, createResponse(), () => {
    nextCount += 1;
  });
  limiter(req, createResponse(), () => {
    nextCount += 1;
  });

  const res = createResponse();
  limiter(req, res, () => {
    nextCount += 1;
  });

  assert.equal(nextCount, 2);
  assert.equal(res.statusCode, 429);
  assert.deepEqual(res.body, { message: 'limited' });
});
