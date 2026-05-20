const pool = require('../config/db');

const ALLOWED_SETTING_KEYS = new Set([
  'openai_api_key',
  'openai_base_url',
  'openai_model',
  'gemini_api_key',
  'gemini_base_url',
  'gemini_model',
  'active_ai_provider',
  'app_brand_name',
  'app_logo_image',
  'app_favicon_image',
  'app_browser_title',
  'app_hero_image',
  'app_hero_title',
  'app_hero_subtitle'
]);

async function getSettings() {
  const [rows] = await pool.query(
    'SELECT setting_key, setting_value FROM system_settings'
  );

  return rows.reduce((settings, row) => {
    settings[row.setting_key] = row.setting_value || '';
    return settings;
  }, {
    openai_api_key: '',
    openai_base_url: 'https://api.openai.com/v1',
    openai_model: '',
    gemini_api_key: '',
    gemini_base_url: 'https://generativelanguage.googleapis.com/v1beta',
    gemini_model: '',
    active_ai_provider: 'mock',
    app_brand_name: '智能食谱',
    app_logo_image: '',
    app_favicon_image: '',
    app_browser_title: '智能食谱',
    app_hero_image: '',
    app_hero_title: '探索美食的无限可能',
    app_hero_subtitle: '只需输入食材，AI 大厨即刻为您规划美味食谱与采购清单。'
  });
}

async function updateSettings(settings) {
  const entries = Object.entries(settings || {}).filter(([key]) => ALLOWED_SETTING_KEYS.has(key));

  for (const [key, value] of entries) {
    await pool.query(
      `INSERT INTO system_settings (setting_key, setting_value)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [key, value == null ? '' : String(value)]
    );
  }
}

module.exports = {
  ALLOWED_SETTING_KEYS,
  getSettings,
  updateSettings
};
