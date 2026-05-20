const test = require('node:test');
const assert = require('node:assert/strict');
const { parseRecipeIngredients, presentRecipe } = require('../src/utils/recipePresenter');

test('parseRecipeIngredients accepts JSON strings and arrays', () => {
  assert.deepEqual(parseRecipeIngredients('["番茄","鸡蛋"]'), ['番茄', '鸡蛋']);
  assert.deepEqual(parseRecipeIngredients(['米饭', '虾仁']), ['米饭', '虾仁']);
});

test('presentRecipe builds summary, category, and image prompt defaults', () => {
  const recipe = presentRecipe({
    id: 1,
    title: '番茄炒蛋',
    ingredients: '["番茄","鸡蛋"]',
    instructions: '热锅倒油，加入鸡蛋和番茄翻炒。',
    created_at: '2026-01-01T00:00:00.000Z',
    is_saved: 1
  });

  assert.equal(recipe.summary, '热锅倒油，加入鸡蛋和番茄翻炒。');
  assert.equal(recipe.category, '炒菜');
  assert.equal(recipe.image_prompt, '番茄炒蛋, Chinese food photography');
  assert.equal(recipe.is_saved, true);
});
