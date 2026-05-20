const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { db } = require('../config/env');

async function initDatabase() {
  const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
  const databaseName = `\`${db.database.replace(/`/g, '``')}\``;
  const schemaSql = fs.readFileSync(schemaPath, 'utf8')
    .replace('CREATE DATABASE IF NOT EXISTS smart_recipe', `CREATE DATABASE IF NOT EXISTS ${databaseName}`)
    .replace('USE smart_recipe;', `USE ${databaseName};`);

  const connection = await mysql.createConnection({
    host: db.host,
    port: db.port,
    user: db.user,
    password: db.password,
    multipleStatements: true
  });

  try {
    await connection.query(schemaSql);
    console.log('Database schema initialized.');
  } finally {
    await connection.end();
  }
}

initDatabase().catch((error) => {
  console.error('Failed to initialize database:', error.message);
  process.exit(1);
});
