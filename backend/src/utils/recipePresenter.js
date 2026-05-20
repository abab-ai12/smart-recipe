function parseRecipeIngredients(ingredients) {
  if (Array.isArray(ingredients)) {
    return ingredients;
  }

  if (typeof ingredients === 'string') {
    return JSON.parse(ingredients);
  }

  return [];
}

function buildRecipeSummary(recipe) {
  const existingSummary = String(recipe.summary || '').trim();
  if (existingSummary) {
    return existingSummary;
  }

  const instructions = String(recipe.instructions || '').replace(/\s+/g, ' ').trim();
  if (instructions.length <= 90) {
    return instructions;
  }

  return `${instructions.slice(0, 90)}...`;
}

function buildRecipeImagePrompt(recipe) {
  const existingPrompt = String(recipe.image_prompt || '').trim();
  if (existingPrompt) {
    return existingPrompt;
  }

  return `${recipe.title}, Chinese food photography`;
}

function inferRecipeCategory(recipe) {
  const existingCategory = String(recipe.category || '').trim();
  const allowedCategories = new Set(['炒菜', '汤', '凉拌', '蒸菜', '煎炸烤', '主食', '其他']);

  const title = String(recipe.title || '');
  const text = `${title} ${recipe.instructions || ''}`;

  if (/凉拌|冷盘|沙拉|拌菜/.test(title)) {
    return '凉拌';
  }

  if (/炒|爆|熘/.test(title)) {
    return '炒菜';
  }

  if (/蒸|清蒸/.test(title)) {
    return '蒸菜';
  }

  if (/煎|炸|烤/.test(title)) {
    return '煎炸烤';
  }

  if (/汤|羹|煲|炖/.test(title)) {
    return '汤';
  }

  if (/饭|面|粥|粉|饼|包|馄饨|饺/.test(title)) {
    return '主食';
  }

  if (existingCategory && allowedCategories.has(existingCategory)) {
    return existingCategory;
  }

  if (/凉拌|冷盘|沙拉|拌菜/.test(text)) {
    return '凉拌';
  }

  if (/清蒸|上锅蒸|蒸熟/.test(text)) {
    return '蒸菜';
  }

  if (/煎至|油炸|烤箱|烤制/.test(text)) {
    return '煎炸烤';
  }

  if (/煮成汤|汤底|汤锅|加水煮开|小火炖/.test(text)) {
    return '汤';
  }

  if (/翻炒|炒至|热锅/.test(text)) {
    return '炒菜';
  }

  return '其他';
}

function presentRecipe(row) {
  const recipe = {
    id: row.id,
    title: row.title,
    ingredients: parseRecipeIngredients(row.ingredients),
    summary: buildRecipeSummary(row),
    category: inferRecipeCategory(row),
    instructions: row.instructions,
    image_prompt: buildRecipeImagePrompt(row),
    image_url: row.image_url || '',
    image_thumbnail: row.image_thumbnail || '',
    image_source: row.image_source || '',
    owner_user_id: row.owner_user_id || null,
    source_recipe_id: row.source_recipe_id || null,
    created_at: row.created_at
  };

  if (Object.prototype.hasOwnProperty.call(row, 'is_saved')) {
    recipe.is_saved = Boolean(row.is_saved);
  }

  return recipe;
}

module.exports = {
  parseRecipeIngredients,
  presentRecipe
};
