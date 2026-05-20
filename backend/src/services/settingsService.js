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
  'app_hero_subtitle',
  'app_hero_title_en',
  'app_hero_subtitle_en'
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
    app_hero_subtitle: '输入现有食材，AI 为你智能搭配菜谱、规划步骤，并自动整理采购清单。',
    app_hero_title_en: 'Discover Endless Culinary Possibilities',
    app_hero_subtitle_en: 'Enter your ingredients, and AI will intelligently pair recipes, plan each step, and organize your shopping list.'
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
