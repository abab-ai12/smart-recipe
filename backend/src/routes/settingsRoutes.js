const express = require('express');
const { getSettings } = require('../services/settingsService');

const router = express.Router();

router.get('/appearance', async (req, res, next) => {
  try {
    const settings = await getSettings();

    return res.json({
      appearance: {
        app_brand_name: settings.app_brand_name || '智能食谱',
        app_logo_image: settings.app_logo_image || '',
        app_favicon_image: settings.app_favicon_image || '',
        app_browser_title: settings.app_browser_title || settings.app_brand_name || '智能食谱',
        app_hero_image: settings.app_hero_image || '',
        app_hero_title: settings.app_hero_title || '探索美食的无限可能',
        app_hero_subtitle: settings.app_hero_subtitle || '输入现有食材，AI 为你智能搭配菜谱、规划步骤，并自动整理采购清单。',
        app_hero_title_en: settings.app_hero_title_en || 'Discover Endless Culinary Possibilities',
        app_hero_subtitle_en: settings.app_hero_subtitle_en || 'Enter your ingredients, and AI will intelligently pair recipes, plan each step, and organize your shopping list.'
      }
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
