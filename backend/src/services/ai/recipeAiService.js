const { getSettings } = require('../settingsService');
const MockRecipeStrategy = require('./mockStrategy');
const OpenAiRecipeStrategy = require('./openAiStrategy');
const GeminiRecipeStrategy = require('./geminiStrategy');

function normalizeRecipes(recipes) {
  return recipes.map((recipe) => ({
    title: String(recipe.title || '').trim(),
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
    summary: String(recipe.summary || '').trim(),
    category: String(recipe.category || '').trim(),
    instructions: String(recipe.instructions || '').trim(),
    image_prompt: String(recipe.image_prompt || '').trim()
  })).filter((recipe) => recipe.title && recipe.ingredients.length > 0 && recipe.instructions);
}

function dedupeRecipes(recipes) {
  const seen = new Set();
  const deduped = [];

  for (const recipe of recipes) {
    const key = `${recipe.title}|${recipe.instructions}`.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(recipe);
  }

  return deduped;
}

function createStrategy(settings) {
  const provider = settings.active_ai_provider || 'mock';

  if (provider === 'openai') {
    return new OpenAiRecipeStrategy(settings.openai_api_key, {
      baseUrl: settings.openai_base_url,
      model: settings.openai_model
    });
  }

  if (provider === 'gemini') {
    return new GeminiRecipeStrategy(settings.gemini_api_key, {
      baseUrl: settings.gemini_base_url,
      model: settings.gemini_model
    });
  }

  if (provider === 'mock') {
    return new MockRecipeStrategy();
  }

  const error = new Error(`Unsupported AI provider: ${provider}`);
  error.status = 400;
  throw error;
}

async function generateRecipes(ingredients, preferences = {}) {
  const settings = await getSettings();
  return generateRecipesWithSettings(ingredients, settings, preferences);
}

async function generateRecipesWithSettings(ingredients, settings, preferences = {}) {
  return generateRecipesWithSettingsAndOptions(ingredients, settings, {
    count: 8,
    parallelBatches: 3,
    preferences
  });
}

async function generateOneRecipe(ingredients, preferences = {}) {
  const settings = await getSettings();
  return generateRecipesWithSettingsAndOptions(ingredients, settings, {
    count: 1,
    parallelBatches: 1,
    randomDish: true,
    preferences
  });
}

async function generateRecipesWithSettingsAndOptions(ingredients, settings, options = {}) {
  const strategy = createStrategy(settings);
  const count = Math.max(1, Number(options.count || 8));
  const parallelBatches = Math.max(1, Math.min(Number(options.parallelBatches || 1), count));
  const batchSize = Math.ceil(count / parallelBatches);
  const batchLabels = ['快手家常', '营养均衡', '创意变化', '清淡健康'];

  const tasks = Array.from({ length: parallelBatches }, (_, index) => {
    const remaining = count - index * batchSize;
    const currentBatchSize = Math.min(batchSize, remaining);

    return strategy.generateRecipes(ingredients, {
      count: currentBatchSize,
      batchLabel: batchLabels[index % batchLabels.length],
      randomDish: Boolean(options.randomDish),
      preferences: options.preferences || {}
    });
  }).filter(Boolean);

  const results = await Promise.allSettled(tasks);
  const recipes = results
    .filter((result) => result.status === 'fulfilled')
    .flatMap((result) => result.value);

  const normalized = dedupeRecipes(normalizeRecipes(recipes)).slice(0, count);

  if (normalized.length === 0) {
    const firstError = results.find((result) => result.status === 'rejected');
    const error = new Error(firstError?.reason?.message || 'AI did not return valid recipes');
    error.status = 502;
    throw error;
  }

  return normalized;
}

module.exports = {
  generateRecipes,
  generateOneRecipe,
  generateRecipesWithSettings
};
