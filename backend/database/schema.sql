CREATE DATABASE IF NOT EXISTS smart_recipe
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE smart_recipe;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(80) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  KEY idx_recipes_source_recipe_id (source_recipe_id),
  CONSTRAINT fk_recipes_owner_user
    FOREIGN KEY (owner_user_id) REFERENCES users (id)
    ON DELETE SET NULL,
  CONSTRAINT fk_recipes_source_recipe
    FOREIGN KEY (source_recipe_id) REFERENCES recipes (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  KEY idx_recipe_versions_editor_user_id (editor_user_id),
  CONSTRAINT fk_recipe_versions_recipe
    FOREIGN KEY (recipe_id) REFERENCES recipes (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_recipe_versions_editor
    FOREIGN KEY (editor_user_id) REFERENCES users (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_saved_recipes (
  user_id INT UNSIGNED NOT NULL,
  recipe_id INT UNSIGNED NOT NULL,
  saved_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, recipe_id),
  KEY idx_user_saved_recipes_recipe_id (recipe_id),
  CONSTRAINT fk_user_saved_recipes_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_user_saved_recipes_recipe
    FOREIGN KEY (recipe_id) REFERENCES recipes (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS system_settings (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  setting_key VARCHAR(120) NOT NULL,
  setting_value TEXT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_system_settings_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO system_settings (setting_key, setting_value)
VALUES
  ('openai_api_key', ''),
  ('openai_base_url', 'https://api.openai.com/v1'),
  ('openai_model', ''),
  ('gemini_api_key', ''),
  ('gemini_base_url', 'https://generativelanguage.googleapis.com/v1beta'),
  ('gemini_model', ''),
  ('active_ai_provider', 'mock'),
  ('app_brand_name', '智能食谱'),
  ('app_logo_image', ''),
  ('app_favicon_image', ''),
  ('app_browser_title', '智能食谱'),
  ('app_hero_image', ''),
  ('app_hero_title', '探索美食的无限可能'),
  ('app_hero_subtitle', '输入现有食材，AI 为你智能搭配菜谱、规划步骤，并自动整理采购清单。'),
  ('app_hero_title_en', 'Discover Endless Culinary Possibilities'),
  ('app_hero_subtitle_en', 'Enter your ingredients, and AI will intelligently pair recipes, plan each step, and organize your shopping list.')
ON DUPLICATE KEY UPDATE setting_value = setting_value;
