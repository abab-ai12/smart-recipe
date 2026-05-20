const test = require('node:test');
const assert = require('node:assert/strict');

test('production config validation rejects unsafe defaults', () => {
  const previousEnv = {
    JWT_SECRET: process.env.JWT_SECRET,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD
  };

  delete process.env.JWT_SECRET;
  delete process.env.ADMIN_PASSWORD;

  delete require.cache[require.resolve('../src/config/env')];
  const env = require('../src/config/env');
  const config = {
    ...env,
    nodeEnv: 'production',
    frontendOrigin: '*'
  };

  assert.throws(
    () => env.validateProductionConfig(config),
    /JWT_SECRET.*ADMIN_PASSWORD.*FRONTEND_ORIGIN/
  );

  if (previousEnv.JWT_SECRET === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = previousEnv.JWT_SECRET;
  }

  if (previousEnv.ADMIN_PASSWORD === undefined) {
    delete process.env.ADMIN_PASSWORD;
  } else {
    process.env.ADMIN_PASSWORD = previousEnv.ADMIN_PASSWORD;
  }
});

test('production config validation can use exported config by default', () => {
  delete require.cache[require.resolve('../src/config/env')];
  const env = require('../src/config/env');

  assert.doesNotThrow(() => env.validateProductionConfig());
});
