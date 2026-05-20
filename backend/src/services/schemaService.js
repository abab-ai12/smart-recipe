const pool = require('../config/db');

async function ensureRuntimeSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS recipes (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      title VARCHAR(255) NOT NULL,
      ingredients JSON NOT NULL,
      summary VARCHAR(500) NULL,
      category VARCHAR(40) NULL,
      instructions TEXT NOT NULL,
      image_prompt VARCHAR(500) NULL,
      image_url TEXT NULL,
      image_thumbnail TEXT NULL,
      image_source VARCHAR(80) NULL,
      image_query VARCHAR(255) NULL,
      owner_user_id INT UNSIGNED NULL,
      source_recipe_id INT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_recipes_owner_user_id (owner_user_id),
      KEY idx_recipes_source_recipe_id (source_recipe_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await addColumnIfMissing('recipes', 'summary', 'summary VARCHAR(500) NULL AFTER ingredients');
  await addColumnIfMissing('recipes', 'category', 'category VARCHAR(40) NULL AFTER summary');
  await addColumnIfMissing('recipes', 'image_prompt', 'image_prompt VARCHAR(500) NULL AFTER instructions');
  await addColumnIfMissing('recipes', 'image_url', 'image_url TEXT NULL AFTER image_prompt');
  await addColumnIfMissing('recipes', 'image_thumbnail', 'image_thumbnail TEXT NULL AFTER image_url');
  await addColumnIfMissing('recipes', 'image_source', 'image_source VARCHAR(80) NULL AFTER image_thumbnail');
  await addColumnIfMissing('recipes', 'image_query', 'image_query VARCHAR(255) NULL AFTER image_source');
  await addColumnIfMissing('recipes', 'owner_user_id', 'owner_user_id INT UNSIGNED NULL AFTER image_query');
  await addColumnIfMissing('recipes', 'source_recipe_id', 'source_recipe_id INT UNSIGNED NULL AFTER owner_user_id');
  await addIndexIfMissing('recipes', 'idx_recipes_owner_user_id', 'CREATE INDEX idx_recipes_owner_user_id ON recipes (owner_user_id)');
  await addIndexIfMissing('recipes', 'idx_recipes_source_recipe_id', 'CREATE INDEX idx_recipes_source_recipe_id ON recipes (source_recipe_id)');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS recipe_versions (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      recipe_id INT UNSIGNED NOT NULL,
      editor_user_id INT UNSIGNED NULL,
      version_number INT UNSIGNED NOT NULL,
      title VARCHAR(255) NOT NULL,
      ingredients JSON NOT NULL,
      summary VARCHAR(500) NULL,
      category VARCHAR(40) NULL,
      instructions TEXT NOT NULL,
      image_prompt VARCHAR(500) NULL,
      change_note VARCHAR(255) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_recipe_versions_recipe_version (recipe_id, version_number),
      KEY idx_recipe_versions_recipe_id (recipe_id),
      KEY idx_recipe_versions_editor_user_id (editor_user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS usage_logs (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      actor_user_id INT UNSIGNED NULL,
      actor_username VARCHAR(80) NULL,
      actor_role VARCHAR(20) NULL,
      action VARCHAR(80) NOT NULL,
      target_type VARCHAR(60) NULL,
      target_id VARCHAR(80) NULL,
      message VARCHAR(500) NOT NULL,
      metadata JSON NULL,
      ip_address VARCHAR(80) NULL,
      user_agent VARCHAR(255) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_usage_logs_created_at (created_at),
      KEY idx_usage_logs_action (action),
      KEY idx_usage_logs_actor_user_id (actor_user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function addColumnIfMissing(tableName, columnName, definition) {
  const [columns] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [tableName, columnName]
  );

  if (columns.length === 0) {
    await pool.query(`ALTER TABLE ${tableName} ADD COLUMN ${definition}`);
  }
}

async function addIndexIfMissing(tableName, indexName, statement) {
  const [indexes] = await pool.query(
    `SELECT INDEX_NAME
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND INDEX_NAME = ?
     LIMIT 1`,
    [tableName, indexName]
  );

  if (indexes.length === 0) {
    await pool.query(statement);
  }
}

module.exports = {
  ensureRuntimeSchema
};
