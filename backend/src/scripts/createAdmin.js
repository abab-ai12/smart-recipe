const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { admin } = require('../config/env');

async function createAdmin() {
  if (!admin.username || !admin.password) {
    throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD are required');
  }

  const passwordHash = await bcrypt.hash(admin.password, 12);

  await pool.query(
    `INSERT INTO users (username, password_hash, role)
     VALUES (?, ?, 'admin')
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = 'admin'`,
    [admin.username, passwordHash]
  );

  console.log(`Admin account is ready: ${admin.username}`);
}

createAdmin()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error('Failed to create admin:', error.message);
    await pool.end();
    process.exit(1);
  });
