const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { ALLOWED_SETTING_KEYS, getSettings, updateSettings } = require('../services/settingsService');
const { generateRecipesWithSettings } = require('../services/ai/recipeAiService');
const { writeUsageLog } = require('../services/usageLogService');
const { presentRecipe } = require('../utils/recipePresenter');

const router = express.Router();

router.use(authenticateToken, requireAdmin);

router.get('/settings', async (req, res, next) => {
  try {
    const settings = await getSettings();
    return res.json({ settings });
  } catch (error) {
    return next(error);
  }
});

router.put('/settings', async (req, res, next) => {
  try {
    const { settings } = req.body || {};

    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      return res.status(400).json({ message: 'settings object is required' });
    }

    const invalidKeys = Object.keys(settings).filter((key) => !ALLOWED_SETTING_KEYS.has(key));
    if (invalidKeys.length > 0) {
      return res.status(400).json({ message: `Unsupported setting keys: ${invalidKeys.join(', ')}` });
    }

    if (
      settings.active_ai_provider &&
      !['mock', 'openai', 'gemini'].includes(settings.active_ai_provider)
    ) {
      return res.status(400).json({ message: 'active_ai_provider must be mock, openai or gemini' });
    }

    await updateSettings(settings);
    await writeUsageLog(req, {
      action: 'settings.update',
      targetType: 'settings',
      message: '管理员更新了系统设置',
      metadata: {
        keys: Object.keys(settings)
      }
    });
    return res.json({ message: 'Settings updated' });
  } catch (error) {
    return next(error);
  }
});

router.get('/stats', async (req, res, next) => {
  try {
    const [[userCount]] = await pool.query('SELECT COUNT(*) AS totalUsers FROM users');
    const [[recipeCount]] = await pool.query('SELECT COUNT(*) AS totalRecipes FROM recipes');
    const [[saveCount]] = await pool.query('SELECT COUNT(*) AS totalSaves FROM user_saved_recipes');

    return res.json({
      totalUsers: userCount.totalUsers,
      totalRecipes: recipeCount.totalRecipes,
      totalSaves: saveCount.totalSaves
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/recipes', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         r.id,
         r.title,
         r.ingredients,
         r.summary,
         r.category,
         r.instructions,
         r.image_prompt,
         r.created_at,
         COUNT(usr.user_id) AS save_count
       FROM recipes r
       LEFT JOIN user_saved_recipes usr ON usr.recipe_id = r.id
       GROUP BY r.id
       ORDER BY r.created_at DESC, r.id DESC
       LIMIT 200`
    );

    const recipes = rows.map((row) => ({
      ...presentRecipe(row),
      save_count: row.save_count
    }));

    return res.json({ recipes });
  } catch (error) {
    return next(error);
  }
});

router.get('/usage-logs', async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 300);
    const action = String(req.query.action || '').trim();
    const params = [];
    let whereClause = '';

    if (action && action !== 'all') {
      whereClause = 'WHERE action = ?';
      params.push(action);
    }

    params.push(limit);

    const [logs] = await pool.query(
      `SELECT id, actor_user_id, actor_username, actor_role, action, target_type, target_id,
              message, metadata, ip_address, user_agent, created_at
       FROM usage_logs
       ${whereClause}
       ORDER BY created_at DESC, id DESC
       LIMIT ?`,
      params
    );

    return res.json({
      logs: logs.map((log) => ({
        ...log,
        metadata: typeof log.metadata === 'string' ? JSON.parse(log.metadata || '{}') : (log.metadata || {})
      }))
    });
  } catch (error) {
    return next(error);
  }
});

router.delete('/recipes/:id', async (req, res, next) => {
  try {
    const recipeId = Number(req.params.id);

    if (!Number.isInteger(recipeId) || recipeId <= 0) {
      return res.status(400).json({ message: 'valid recipe id is required' });
    }

    const [[recipe]] = await pool.query(
      'SELECT id, title FROM recipes WHERE id = ? LIMIT 1',
      [recipeId]
    );

    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    await pool.query('DELETE FROM recipes WHERE id = ?', [recipeId]);
    await writeUsageLog(req, {
      action: 'recipe.delete',
      targetType: 'recipe',
      targetId: recipeId,
      message: `管理员删除了食谱：${recipe.title}`,
      metadata: {
        recipeId,
        title: recipe.title
      }
    });

    return res.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    return next(error);
  }
});

router.post('/recipes/bulk-delete', async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body?.ids)
      ? [...new Set(req.body.ids.map(Number).filter((id) => Number.isInteger(id) && id > 0))]
      : [];

    if (ids.length === 0) {
      return res.status(400).json({ message: 'ids must be a non-empty array' });
    }

    const [result] = await pool.query(
      'DELETE FROM recipes WHERE id IN (?)',
      [ids]
    );
    await writeUsageLog(req, {
      action: 'recipe.bulk_delete',
      targetType: 'recipe',
      targetId: ids.join(','),
      message: `管理员批量删除了 ${result.affectedRows} 个食谱`,
      metadata: {
        ids,
        deletedCount: result.affectedRows
      }
    });

    return res.json({
      message: 'Recipes deleted successfully',
      deletedCount: result.affectedRows
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/users', async (req, res, next) => {
  try {
    const [users] = await pool.query(
      'SELECT id, username, role, created_at FROM users ORDER BY id ASC'
    );

    return res.json({ users });
  } catch (error) {
    return next(error);
  }
});

router.post('/ai/test', async (req, res, next) => {
  try {
    const { settings = {} } = req.body || {};
    const currentSettings = await getSettings();
    const mergedSettings = {
      ...currentSettings,
      ...settings
    };

    if (!['mock', 'openai', 'gemini'].includes(mergedSettings.active_ai_provider)) {
      return res.status(400).json({ message: 'active_ai_provider must be mock, openai or gemini' });
    }

    const recipes = await generateRecipesWithSettings(['番茄', '鸡蛋'], mergedSettings);
    await writeUsageLog(req, {
      action: 'ai.test',
      targetType: 'ai_provider',
      targetId: mergedSettings.active_ai_provider || 'mock',
      message: '管理员测试了 AI 模型接口配置',
      metadata: {
        provider: mergedSettings.active_ai_provider || 'mock',
        model: mergedSettings[`${mergedSettings.active_ai_provider || 'mock'}_model`] || ''
      }
    });

    return res.json({
      message: 'AI model test succeeded',
      recipe: recipes[0]
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/users', async (req, res, next) => {
  try {
    const { username, password, role = 'user' } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ message: 'username and password are required' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ message: 'password must be at least 6 characters' });
    }

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'role must be user or admin' });
    }

    const passwordHash = await bcrypt.hash(String(password), 12);
    const [result] = await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [String(username).trim(), passwordHash, role]
    );
    await writeUsageLog(req, {
      action: 'user.create',
      targetType: 'user',
      targetId: result.insertId,
      message: `管理员创建了用户：${String(username).trim()}`,
      metadata: {
        userId: result.insertId,
        username: String(username).trim(),
        role
      }
    });

    return res.status(201).json({
      message: 'User created successfully',
      user: {
        id: result.insertId,
        username: String(username).trim(),
        role
      }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'username already exists' });
    }

    return next(error);
  }
});

router.delete('/users/:id', async (req, res, next) => {
  try {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ message: 'valid user id is required' });
    }

    if (userId === req.user.id) {
      return res.status(400).json({ message: 'cannot delete current admin account' });
    }

    const [[targetUser]] = await pool.query(
      'SELECT id, username, role FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (targetUser.role === 'admin') {
      return res.status(400).json({ message: 'cannot delete admin account' });
    }

    await pool.query('DELETE FROM users WHERE id = ?', [userId]);
    await writeUsageLog(req, {
      action: 'user.delete',
      targetType: 'user',
      targetId: userId,
      message: `管理员删除了用户：${targetUser.username}`,
      metadata: {
        userId,
        username: targetUser.username
      }
    });
    return res.json({ message: 'User deleted successfully' });
  } catch (error) {
    return next(error);
  }
});

router.post('/users/bulk-delete', async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body?.ids)
      ? req.body.ids.map(Number).filter((id) => Number.isInteger(id) && id > 0)
      : [];

    if (ids.length === 0) {
      return res.status(400).json({ message: 'ids must be a non-empty array' });
    }

    if (ids.includes(req.user.id)) {
      return res.status(400).json({ message: 'cannot delete current admin account' });
    }

    const [adminRows] = await pool.query(
      'SELECT id FROM users WHERE role = ? AND id IN (?)',
      ['admin', ids]
    );

    if (adminRows.length > 0) {
      return res.status(400).json({ message: 'cannot delete admin account' });
    }

    const [result] = await pool.query(
      'DELETE FROM users WHERE id IN (?)',
      [ids]
    );
    await writeUsageLog(req, {
      action: 'user.bulk_delete',
      targetType: 'user',
      targetId: ids.join(','),
      message: `管理员批量删除了 ${result.affectedRows} 个用户`,
      metadata: {
        ids,
        deletedCount: result.affectedRows
      }
    });

    return res.json({
      message: 'Users deleted successfully',
      deletedCount: result.affectedRows
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
