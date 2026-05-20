const app = require('./app');
const { port, validateProductionConfig } = require('./config/env');
const pool = require('./config/db');
const { ensureRuntimeSchema } = require('./services/schemaService');

function logProcessEvent(event, detail) {
  const fs = require('fs');
  const path = require('path');
  const line = `[${new Date().toISOString()}] ${event}: ${detail}\n`;
  fs.appendFileSync(path.join(__dirname, '..', 'backend-exit.log'), line);
}

process.on('exit', (code) => {
  logProcessEvent('exit', `code=${code}`);
});

process.on('uncaughtException', (error) => {
  logProcessEvent('uncaughtException', error.stack || error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logProcessEvent('unhandledRejection', reason?.stack || reason);
  process.exit(1);
});

async function start() {
  try {
    validateProductionConfig();
    await pool.query('SELECT 1');
    await ensureRuntimeSchema();
    app.listen(port, () => {
      console.log(`Smart Recipe backend listening on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to connect to MySQL:', error.message);
    process.exit(1);
  }
}

start();
