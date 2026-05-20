const pool = require('../config/db');
const { parseRecipeIngredients } = require('../utils/recipePresenter');

async function createRecipeVersion(connection, recipe, editorUserId, changeNote = '') {
  const [[counter]] = await connection.query(
    'SELECT COALESCE(MAX(version_number), 0) + 1 AS nextVersion FROM recipe_versions WHERE recipe_id = ?',
    [recipe.id]
  );

  await connection.query(
    `INSERT INTO recipe_versions
      (recipe_id, editor_user_id, version_number, title, ingredients, summary, category, instructions, image_prompt, change_note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      recipe.id,
      editorUserId || null,
      counter.nextVersion,
      recipe.title,
      typeof recipe.ingredients === 'string' ? recipe.ingredients : JSON.stringify(recipe.ingredients || []),
      recipe.summary || '',
      recipe.category || '',
      recipe.instructions,
      recipe.image_prompt || '',
      changeNote
    ]
  );
}

async function getRecipeVersions(recipeId) {
  const [rows] = await pool.query(
    `SELECT rv.id, rv.recipe_id, rv.editor_user_id, u.username AS editor_username,
            rv.version_number, rv.title, rv.ingredients, rv.summary, rv.category,
            rv.instructions, rv.image_prompt, rv.change_note, rv.created_at
     FROM recipe_versions rv
     LEFT JOIN users u ON u.id = rv.editor_user_id
     WHERE rv.recipe_id = ?
     ORDER BY rv.version_number DESC`,
    [recipeId]
  );

  return rows.map((row) => ({
    ...row,
    ingredients: parseRecipeIngredients(row.ingredients)
  }));
}

async function getRecipeVersion(versionId) {
  const [[version]] = await pool.query(
    `SELECT id, recipe_id, editor_user_id, version_number, title, ingredients, summary,
            category, instructions, image_prompt, change_note, created_at
     FROM recipe_versions
     WHERE id = ?
     LIMIT 1`,
    [versionId]
  );

  if (!version) {
    return null;
  }

  return {
    ...version,
    ingredients: parseRecipeIngredients(version.ingredients)
  };
}

module.exports = {
  createRecipeVersion,
  getRecipeVersion,
  getRecipeVersions
};
