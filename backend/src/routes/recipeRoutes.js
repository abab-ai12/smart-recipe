const express = require('express');
const pool = require('../config/db');
const { authenticateToken, optionalAuthenticateToken } = require('../middleware/auth');
const { generateOneRecipe, generateRecipes } = require('../services/ai/recipeAiService');
const { createRateLimiter } = require('../middleware/rateLimit');
const { presentRecipe } = require('../utils/recipePresenter');
const { buildFallbackGeneratedImage, searchTheMealDbImage } = require('../services/themealdbImageService');
const { writeUsageLog } = require('../services/usageLogService');
const { createRecipeVersion, getRecipeVersion, getRecipeVersions } = require('../services/recipeVersionService');
const { validateIngredients } = require('../utils/ingredientValidator');

const router = express.Router();
const recipeGenerationLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 12,
  message: 'Too many recipe generation requests, please try again later'
});

const RANDOM_INGREDIENT_SETS = [
  ['鸡蛋', '番茄'],
  ['鸡肉', '土豆', '胡萝卜'],
  ['牛肉', '洋葱', '青椒'],
  ['豆腐', '香菇', '青菜'],
  ['虾仁', '鸡蛋', '米饭'],
  ['猪肉', '白菜', '粉条'],
  ['面条', '鸡蛋', '青菜'],
  ['鱼', '姜', '葱'],
  ['南瓜', '红枣', '枸杞'],
  ['生菜', '蚝油', '蒜'],
  ['茄子', '肉末', '蒜'],
  ['排骨', '玉米', '胡萝卜']
];

function pickRandomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

async function persistGeneratedRecipes(generatedRecipes) {
  const recipes = [];

  for (const recipe of generatedRecipes) {
    const title = String(recipe.title).trim();
    const instructions = String(recipe.instructions).trim();

    const [existingRows] = await pool.query(
      'SELECT id, title, ingredients, summary, category, instructions, image_prompt, created_at FROM recipes WHERE title = ? AND instructions = ? LIMIT 1',
      [title, instructions]
    );

    if (existingRows.length > 0) {
      recipes.push(presentRecipe(existingRows[0]));
      continue;
    }

    const [insertResult] = await pool.query(
      'INSERT INTO recipes (title, ingredients, summary, category, instructions, image_prompt) VALUES (?, ?, ?, ?, ?, ?)',
      [
        title,
        JSON.stringify(recipe.ingredients),
        recipe.summary || '',
        recipe.category || '',
        instructions,
        recipe.image_prompt || ''
      ]
    );

    recipes.push({
      ...recipe,
      id: insertResult.insertId
    });
  }

  return recipes;
}

async function attachSavedState(recipes, userId) {
  if (!userId || recipes.length === 0) {
    return recipes.map((recipe) => ({
      ...recipe,
      is_saved: false
    }));
  }

  const ids = recipes.map((recipe) => recipe.id).filter(Boolean);
  if (ids.length === 0) {
    return recipes;
  }

  const [rows] = await pool.query(
    'SELECT recipe_id FROM user_saved_recipes WHERE user_id = ? AND recipe_id IN (?)',
    [userId, ids]
  );
  const savedIds = new Set(rows.map((row) => row.recipe_id));

  return recipes.map((recipe) => ({
    ...recipe,
    is_saved: savedIds.has(recipe.id)
  }));
}

function normalizeRecipePreferences(rawPreferences = {}) {
  const preferences = rawPreferences && typeof rawPreferences === 'object' && !Array.isArray(rawPreferences)
    ? rawPreferences
    : {};

  const servings = Number(preferences.servings);

  return {
    servings: Number.isInteger(servings) && servings > 0 && servings <= 20 ? servings : '',
    taste: String(preferences.taste || '').trim().slice(0, 40),
    cookingTime: String(preferences.cookingTime || '').trim().slice(0, 40),
    dietaryGoal: String(preferences.dietaryGoal || '').trim().slice(0, 40),
    avoidIngredients: String(preferences.avoidIngredients || '').trim().slice(0, 160)
  };
}

function validateRecipePayload(payload) {
  const title = String(payload.title || '').trim();
  const ingredients = Array.isArray(payload.ingredients)
    ? payload.ingredients.map((item) => String(item).trim()).filter(Boolean)
    : [];
  const instructions = String(payload.instructions || '').trim();

  if (!title || ingredients.length === 0 || !instructions) {
    return {
      error: 'title, ingredients and instructions are required'
    };
  }

  return {
    recipe: {
      title: title.slice(0, 255),
      ingredients,
      summary: String(payload.summary || '').trim().slice(0, 500),
      category: String(payload.category || '').trim().slice(0, 40),
      instructions,
      image_prompt: String(payload.image_prompt || '').trim().slice(0, 500)
    }
  };
}

router.post('/generate', recipeGenerationLimiter, optionalAuthenticateToken, async (req, res, next) => {
  try {
    const { ingredients } = req.body || {};

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ message: 'ingredients must be a non-empty array' });
    }

    const {
      ingredients: cleanIngredients,
      invalidIngredients
    } = validateIngredients(ingredients);

    if (cleanIngredients.length === 0) {
      return res.status(400).json({ message: 'ingredients must include at least one valid item' });
    }

    if (invalidIngredients.length > 0) {
      return res.status(400).json({
        code: 'INVALID_INGREDIENTS',
        message: `These items do not look like ingredients: ${invalidIngredients.join(', ')}`,
        invalidIngredients
      });
    }

    const preferences = normalizeRecipePreferences(req.body?.preferences);
    const generatedRecipes = await generateRecipes(cleanIngredients, preferences);
    const recipes = await attachSavedState(await persistGeneratedRecipes(generatedRecipes), req.user?.id);
    await writeUsageLog(req, {
      action: 'recipe.generate',
      targetType: 'recipe',
      targetId: recipes.map((recipe) => recipe.id).filter(Boolean).join(','),
      message: `用户请求生成食谱，生成 ${recipes.length} 道`,
      metadata: {
        ingredients: cleanIngredients,
        preferences,
        recipeIds: recipes.map((recipe) => recipe.id).filter(Boolean),
        titles: recipes.map((recipe) => recipe.title)
      }
    });

    return res.json({ recipes });
  } catch (error) {
    return next(error);
  }
});

router.post('/random', recipeGenerationLimiter, optionalAuthenticateToken, async (req, res, next) => {
  try {
    const ingredients = pickRandomItem(RANDOM_INGREDIENT_SETS);
    const preferences = normalizeRecipePreferences(req.body?.preferences);
    const generatedRecipes = await generateOneRecipe(ingredients, preferences);
    const recipes = await attachSavedState(await persistGeneratedRecipes(generatedRecipes), req.user?.id);
    const recipe = recipes[0];
    await writeUsageLog(req, {
      action: 'recipe.random',
      targetType: 'recipe',
      targetId: recipe?.id || '',
      message: `用户请求随机一菜：${recipe?.title || '未生成'}`,
      metadata: {
        ingredients,
        preferences,
        recipeId: recipe?.id || null,
        title: recipe?.title || ''
      }
    });

    return res.json({
      recipe,
      ingredients
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/save', authenticateToken, async (req, res, next) => {
  const connection = await pool.getConnection();

  try {
    const { id, title, ingredients, summary, category, instructions, image_prompt: imagePrompt } = req.body || {};

    if (id) {
      const recipeId = Number(id);

      if (!Number.isInteger(recipeId) || recipeId <= 0) {
        return res.status(400).json({ message: 'valid recipe id is required' });
      }

      const [[existingRecipe]] = await pool.query(
        'SELECT id FROM recipes WHERE id = ? LIMIT 1',
        [recipeId]
      );

      if (!existingRecipe) {
        return res.status(404).json({ message: 'Recipe not found' });
      }

      await pool.query(
        `INSERT INTO user_saved_recipes (user_id, recipe_id)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE saved_at = saved_at`,
        [req.user.id, recipeId]
      );

      return res.json({ message: 'Saved successfully' });
    }

    if (!title || !Array.isArray(ingredients) || ingredients.length === 0 || !instructions) {
      return res.status(400).json({ message: 'recipe id or title, ingredients and instructions are required' });
    }

    await connection.beginTransaction();

    const [existingRows] = await connection.query(
      'SELECT id FROM recipes WHERE title = ? AND instructions = ? LIMIT 1',
      [String(title).trim(), String(instructions).trim()]
    );

    let recipeId = existingRows[0]?.id;

    if (!recipeId) {
      const [insertResult] = await connection.query(
        'INSERT INTO recipes (title, ingredients, summary, category, instructions, image_prompt) VALUES (?, ?, ?, ?, ?, ?)',
        [
          String(title).trim(),
          JSON.stringify(ingredients),
          String(summary || '').trim(),
          String(category || '').trim(),
          String(instructions).trim(),
          String(imagePrompt || '').trim()
        ]
      );
      recipeId = insertResult.insertId;
    }

    await connection.query(
      `INSERT INTO user_saved_recipes (user_id, recipe_id)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE saved_at = saved_at`,
      [req.user.id, recipeId]
    );

    await connection.commit();
    return res.json({ message: 'Saved successfully' });
  } catch (error) {
    await connection.rollback();
    return next(error);
  } finally {
    connection.release();
  }
});

router.get('/saved', authenticateToken, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.id, r.title, r.ingredients, r.summary, r.category, r.instructions, r.image_prompt,
              r.image_url, r.image_thumbnail, r.image_source, r.image_query,
              r.created_at, usr.saved_at, 1 AS is_saved
       FROM user_saved_recipes usr
       INNER JOIN recipes r ON r.id = usr.recipe_id
       WHERE usr.user_id = ?
       ORDER BY usr.saved_at DESC`,
      [req.user.id]
    );

    const savedRecipes = rows.map((row) => ({
      ...presentRecipe(row),
      saved_at: row.saved_at
    }));

    return res.json({ saved_recipes: savedRecipes });
  } catch (error) {
    return next(error);
  }
});

router.get('/:recipeId', optionalAuthenticateToken, async (req, res, next) => {
  try {
    const recipeId = Number(req.params.recipeId);

    if (!Number.isInteger(recipeId) || recipeId <= 0) {
      return res.status(400).json({ message: 'valid recipe id is required' });
    }

    const [[recipe]] = await pool.query(
      `SELECT r.id, r.title, r.ingredients, r.summary, r.category, r.instructions, r.image_prompt,
              r.image_url, r.image_thumbnail, r.image_source, r.image_query, r.created_at,
              CASE WHEN usr.recipe_id IS NULL THEN 0 ELSE 1 END AS is_saved
       FROM recipes r
       LEFT JOIN user_saved_recipes usr ON usr.recipe_id = r.id AND usr.user_id = ?
       WHERE r.id = ?
       LIMIT 1`,
      [req.user?.id || 0, recipeId]
    );

    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    return res.json({ recipe: presentRecipe(recipe) });
  } catch (error) {
    return next(error);
  }
});

router.put('/:recipeId', authenticateToken, async (req, res, next) => {
  const connection = await pool.getConnection();

  try {
    const recipeId = Number(req.params.recipeId);

    if (!Number.isInteger(recipeId) || recipeId <= 0) {
      return res.status(400).json({ message: 'valid recipe id is required' });
    }

    const validation = validateRecipePayload(req.body || {});
    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    const [[recipe]] = await connection.query(
      `SELECT id, title, ingredients, summary, category, instructions, image_prompt,
              image_url, image_thumbnail, image_source, image_query, owner_user_id, source_recipe_id, created_at
       FROM recipes
       WHERE id = ?
       LIMIT 1`,
      [recipeId]
    );

    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    const updatedRecipe = validation.recipe;
    let targetRecipeId = recipeId;
    let targetRecipe = recipe;
    let createdPersonalCopy = false;

    await connection.beginTransaction();

    if (req.user.role !== 'admin' && recipe.owner_user_id !== req.user.id) {
      const [[savedRecipe]] = await connection.query(
        'SELECT recipe_id FROM user_saved_recipes WHERE user_id = ? AND recipe_id = ? LIMIT 1',
        [req.user.id, recipeId]
      );

      if (!savedRecipe) {
        await connection.rollback();
        return res.status(403).json({ message: 'Only saved recipes can be edited' });
      }

      const [insertResult] = await connection.query(
        `INSERT INTO recipes
          (title, ingredients, summary, category, instructions, image_prompt, owner_user_id, source_recipe_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          updatedRecipe.title,
          JSON.stringify(updatedRecipe.ingredients),
          updatedRecipe.summary,
          updatedRecipe.category,
          updatedRecipe.instructions,
          updatedRecipe.image_prompt,
          req.user.id,
          recipeId
        ]
      );

      targetRecipeId = insertResult.insertId;
      createdPersonalCopy = true;
      targetRecipe = {
        ...updatedRecipe,
        id: targetRecipeId,
        ingredients: JSON.stringify(updatedRecipe.ingredients),
        owner_user_id: req.user.id,
        source_recipe_id: recipeId
      };

      await connection.query(
        'DELETE FROM user_saved_recipes WHERE user_id = ? AND recipe_id = ?',
        [req.user.id, recipeId]
      );
      await connection.query(
        'INSERT INTO user_saved_recipes (user_id, recipe_id) VALUES (?, ?)',
        [req.user.id, targetRecipeId]
      );
      await createRecipeVersion(connection, targetRecipe, req.user.id, '创建个人副本');
    }

    if (!createdPersonalCopy) {
      await createRecipeVersion(connection, recipe, req.user.id, '编辑前版本');
    }

    if (!createdPersonalCopy) {
      await connection.query(
      `UPDATE recipes
       SET title = ?, ingredients = ?, summary = ?, category = ?, instructions = ?, image_prompt = ?,
           image_url = '', image_thumbnail = '', image_source = '', image_query = ''
       WHERE id = ?`,
        [
          updatedRecipe.title,
          JSON.stringify(updatedRecipe.ingredients),
          updatedRecipe.summary,
          updatedRecipe.category,
          updatedRecipe.instructions,
          updatedRecipe.image_prompt,
          targetRecipeId
        ]
      );
    }

    const [[updatedRow]] = await connection.query(
      `SELECT id, title, ingredients, summary, category, instructions, image_prompt,
              image_url, image_thumbnail, image_source, image_query, owner_user_id, source_recipe_id, created_at
       FROM recipes
       WHERE id = ?
       LIMIT 1`,
      [targetRecipeId]
    );

    await connection.commit();

    await writeUsageLog(req, {
      action: 'recipe.update',
      targetType: 'recipe',
      targetId: targetRecipeId,
      message: createdPersonalCopy ? `用户创建并编辑了个人食谱副本：${updatedRecipe.title}` : `用户更新了食谱：${updatedRecipe.title}`,
      metadata: {
        recipeId: targetRecipeId,
        sourceRecipeId: createdPersonalCopy ? recipeId : null,
        title: updatedRecipe.title,
        createdPersonalCopy
      }
    });

    return res.json({
      message: 'Recipe updated successfully',
      created_personal_copy: createdPersonalCopy,
      recipe: presentRecipe({
        ...updatedRow,
        is_saved: 1
      })
    });
  } catch (error) {
    await connection.rollback();
    return next(error);
  } finally {
    connection.release();
  }
});

router.get('/:recipeId/versions', authenticateToken, async (req, res, next) => {
  try {
    const recipeId = Number(req.params.recipeId);

    if (!Number.isInteger(recipeId) || recipeId <= 0) {
      return res.status(400).json({ message: 'valid recipe id is required' });
    }

    const [[recipe]] = await pool.query(
      'SELECT id, owner_user_id FROM recipes WHERE id = ? LIMIT 1',
      [recipeId]
    );

    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    if (req.user.role !== 'admin' && recipe.owner_user_id !== req.user.id) {
      return res.status(403).json({ message: 'Only personal recipes expose version history' });
    }

    const versions = await getRecipeVersions(recipeId);
    return res.json({ versions });
  } catch (error) {
    return next(error);
  }
});

router.post('/:recipeId/versions/:versionId/restore', authenticateToken, async (req, res, next) => {
  const connection = await pool.getConnection();

  try {
    const recipeId = Number(req.params.recipeId);
    const versionId = Number(req.params.versionId);

    if (!Number.isInteger(recipeId) || recipeId <= 0 || !Number.isInteger(versionId) || versionId <= 0) {
      return res.status(400).json({ message: 'valid recipe id and version id are required' });
    }

    const [[recipe]] = await connection.query(
      `SELECT id, title, ingredients, summary, category, instructions, image_prompt,
              owner_user_id, source_recipe_id, created_at
       FROM recipes
       WHERE id = ?
       LIMIT 1`,
      [recipeId]
    );

    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    if (req.user.role !== 'admin' && recipe.owner_user_id !== req.user.id) {
      return res.status(403).json({ message: 'Only personal recipes can be restored' });
    }

    const version = await getRecipeVersion(versionId);
    if (!version || version.recipe_id !== recipeId) {
      return res.status(404).json({ message: 'Recipe version not found' });
    }

    await connection.beginTransaction();
    await createRecipeVersion(connection, recipe, req.user.id, `恢复前版本，目标版本 ${version.version_number}`);
    await connection.query(
      `UPDATE recipes
       SET title = ?, ingredients = ?, summary = ?, category = ?, instructions = ?, image_prompt = ?,
           image_url = '', image_thumbnail = '', image_source = '', image_query = ''
       WHERE id = ?`,
      [
        version.title,
        JSON.stringify(version.ingredients),
        version.summary || '',
        version.category || '',
        version.instructions,
        version.image_prompt || '',
        recipeId
      ]
    );

    const [[updatedRow]] = await connection.query(
      `SELECT id, title, ingredients, summary, category, instructions, image_prompt,
              image_url, image_thumbnail, image_source, image_query, owner_user_id, source_recipe_id, created_at
       FROM recipes
       WHERE id = ?
       LIMIT 1`,
      [recipeId]
    );

    await connection.commit();

    return res.json({
      message: 'Recipe version restored successfully',
      recipe: presentRecipe({
        ...updatedRow,
        is_saved: 1
      })
    });
  } catch (error) {
    await connection.rollback();
    return next(error);
  } finally {
    connection.release();
  }
});

router.get('/:recipeId/image', async (req, res, next) => {
  try {
    const recipeId = Number(req.params.recipeId);

    if (!Number.isInteger(recipeId) || recipeId <= 0) {
      return res.status(400).json({ message: 'valid recipe id is required' });
    }

    const [[recipe]] = await pool.query(
      'SELECT id, title, ingredients, category, image_prompt, image_url, image_thumbnail, image_source, image_query FROM recipes WHERE id = ? LIMIT 1',
      [recipeId]
    );

    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    if (recipe.image_url) {
      return res.json({
        image: recipe.image_url,
        thumbnail: recipe.image_thumbnail || recipe.image_url,
        source: recipe.image_source || 'cached',
        query: recipe.image_query || '',
        cached: true
      });
    }

    let image;
    try {
      image = await searchTheMealDbImage(recipe);
    } catch (mealDbError) {
      image = buildFallbackGeneratedImage(recipe);
    }

    await pool.query(
      `UPDATE recipes
       SET image_url = ?, image_thumbnail = ?, image_source = ?, image_query = ?
       WHERE id = ?`,
      [
        image.image || '',
        image.thumbnail || '',
        image.source || '',
        image.query || '',
        recipeId
      ]
    );

    return res.json(image);
  } catch (error) {
    return next(error);
  }
});

router.delete('/saved/:recipeId', authenticateToken, async (req, res, next) => {
  try {
    const recipeId = Number(req.params.recipeId);

    if (!Number.isInteger(recipeId) || recipeId <= 0) {
      return res.status(400).json({ message: 'valid recipe id is required' });
    }

    const [result] = await pool.query(
      'DELETE FROM user_saved_recipes WHERE user_id = ? AND recipe_id = ?',
      [req.user.id, recipeId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Saved recipe not found' });
    }

    return res.json({ message: 'Unsaved successfully' });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
