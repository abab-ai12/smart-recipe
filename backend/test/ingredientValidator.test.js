const test = require('node:test');
const assert = require('node:assert/strict');
const { looksLikeIngredient, validateIngredients } = require('../src/utils/ingredientValidator');

test('ingredient validator accepts common Chinese and English ingredients', () => {
  assert.equal(looksLikeIngredient('番茄'), true);
  assert.equal(looksLikeIngredient('鸡蛋'), true);
  assert.equal(looksLikeIngredient('chicken breast'), true);
  assert.equal(looksLikeIngredient('tomato'), true);
});

test('ingredient validator rejects obvious non-food input', () => {
  assert.equal(looksLikeIngredient('手机'), false);
  assert.equal(looksLikeIngredient('桌子'), false);
  assert.equal(looksLikeIngredient('abc'), false);
  assert.equal(looksLikeIngredient('我要减肥'), false);
});

test('validateIngredients returns invalid item list', () => {
  const result = validateIngredients(['鸡蛋', ' 手机 ', 'tomato']);

  assert.deepEqual(result.ingredients, ['鸡蛋', '手机', 'tomato']);
  assert.deepEqual(result.invalidIngredients, ['手机']);
  assert.equal(result.isValid, false);
});
