const COMMON_DISH_TERMS = [
  { pattern: /麻婆|mapo/i, term: 'Mapo Tofu' },
  { pattern: /宫保|kung pao/i, term: 'Kung Pao Chicken' },
  { pattern: /鱼香|yu xiang/i, term: 'Szechuan Beef' },
  { pattern: /糖醋|sweet and sour/i, term: 'Sweet and Sour Pork' },
  { pattern: /红烧肉|braised pork/i, term: 'Braised Pork' },
  { pattern: /回锅|twice cooked/i, term: 'Twice Cooked Pork' },
  { pattern: /炒饭|fried rice/i, term: 'Egg Fried Rice' },
  { pattern: /炒面|chow mein/i, term: 'Chow Mein' },
  { pattern: /牛肉面|beef noodle/i, term: 'Beef Noodle Soup' },
  { pattern: /饺|dumpling/i, term: 'Dumplings' },
  { pattern: /馄饨|wonton/i, term: 'Wontons' },
  { pattern: /春卷|spring roll/i, term: 'Spring Rolls' },
  { pattern: /酸辣汤|hot and sour/i, term: 'Hot and Sour Soup' },
  { pattern: /番茄.*蛋|西红柿.*蛋|tomato.*egg/i, term: 'Tomato Egg' },
  { pattern: /清蒸.*鱼|steamed fish/i, term: 'Steamed Fish' },
  { pattern: /拉面|ramen/i, term: 'Ramen' },
  { pattern: /咖喱|curry/i, term: 'Curry' },
  { pattern: /披萨|pizza/i, term: 'Pizza' },
  { pattern: /意面|pasta|spaghetti/i, term: 'Spaghetti' },
  { pattern: /沙拉|salad/i, term: 'Salad' },
  { pattern: /汉堡|burger/i, term: 'Burger' },
  { pattern: /三明治|sandwich/i, term: 'Sandwich' },
  { pattern: /煎饼|pancake/i, term: 'Pancakes' },
  { pattern: /蛋糕|cake/i, term: 'Cake' },
  { pattern: /汤|soup/i, term: 'Soup' },
  { pattern: /鸡肉|鸡丁|鸡腿|鸡翅|鸡胸|鸡块|整鸡|chicken/i, term: 'Chicken' },
  { pattern: /牛肉|beef/i, term: 'Beef' },
  { pattern: /猪肉|pork/i, term: 'Pork' },
  { pattern: /鱼|fish/i, term: 'Fish' },
  { pattern: /虾|shrimp|prawn/i, term: 'Seafood' }
];

const COMMON_INGREDIENT_FILTERS = [
  { pattern: /鸡肉|鸡丁|鸡腿|鸡翅|鸡胸|鸡块|整鸡|chicken/i, term: 'Chicken' },
  { pattern: /牛肉|beef/i, term: 'Beef' },
  { pattern: /猪肉|pork/i, term: 'Pork' },
  { pattern: /羊肉|lamb/i, term: 'Lamb' },
  { pattern: /鱼|fish/i, term: 'Fish' },
  { pattern: /虾|shrimp|prawn/i, term: 'Prawns' },
  { pattern: /蟹|crab/i, term: 'Crab' },
  { pattern: /蛋|鸡蛋|egg/i, term: 'Eggs' },
  { pattern: /番茄|西红柿|tomato/i, term: 'Tomatoes' },
  { pattern: /土豆|马铃薯|potato/i, term: 'Potatoes' },
  { pattern: /豆腐|tofu/i, term: 'Tofu' },
  { pattern: /蘑菇|香菇|mushroom/i, term: 'Mushrooms' },
  { pattern: /洋葱|onion/i, term: 'Onion' },
  { pattern: /胡萝卜|carrot/i, term: 'Carrots' },
  { pattern: /生菜|lettuce/i, term: 'Lettuce' },
  { pattern: /白菜|cabbage/i, term: 'Cabbage' },
  { pattern: /南瓜|pumpkin/i, term: 'Pumpkin' },
  { pattern: /米饭|米|rice/i, term: 'Rice' },
  { pattern: /面|面条|noodle|noodles/i, term: 'Noodles' },
  { pattern: /吐司|面包|bread|toast/i, term: 'Bread' },
  { pattern: /芝士|奶酪|cheese/i, term: 'Cheese' }
];

const CATEGORY_FILTERS = {
  '炒菜': ['Chicken', 'Beef', 'Vegetarian'],
  '汤': ['Starter', 'Vegetarian'],
  '凉拌': ['Vegetarian', 'Side'],
  '蒸菜': ['Seafood', 'Vegetarian'],
  '煎炸烤': ['Chicken', 'Pork', 'Seafood'],
  '主食': ['Pasta', 'Side'],
  '其他': ['Vegetarian', 'Miscellaneous']
};

const AREA_FILTERS = ['Chinese'];

function normalizeSearchTerm(value) {
  return String(value || '')
    .replace(/\b(chinese|food|dish|recipe|home|cooking|photography|photo|realistic|appetizing|overhead|style)\b/gi, ' ')
    .replace(/[，。；：、]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function addUniqueTerm(terms, term) {
  const normalized = normalizeSearchTerm(term);

  if (!normalized || normalized.length < 3) {
    return;
  }

  if (!terms.some((item) => item.toLowerCase() === normalized.toLowerCase())) {
    terms.push(normalized);
  }
}

function tokenizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 2);
}

function scoreMealSimilarity(meal, recipe) {
  const mealName = String(meal.strMeal || '').toLowerCase();
  const titleTokens = tokenizeText(recipe.title);
  const promptTokens = tokenizeText(recipe.image_prompt);
  let score = 0;

  for (const token of titleTokens) {
    if (mealName.includes(token)) {
      score += 4;
    }
  }

  for (const token of promptTokens) {
    if (mealName.includes(token)) {
      score += 2;
    }
  }

  return score;
}

function parseRecipeIngredients(ingredients) {
  if (Array.isArray(ingredients)) {
    return ingredients;
  }

  if (typeof ingredients === 'string') {
    try {
      const parsed = JSON.parse(ingredients);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return ingredients.split(/[，,、]/);
    }
  }

  return [];
}

function hashText(text) {
  let hash = 0;

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function pickDeterministicMeal(meals, recipe) {
  const usableMeals = meals.filter((item) => getMealImage(item));

  if (usableMeals.length === 0) {
    return null;
  }

  const scoredMeal = usableMeals
    .map((meal) => ({
      meal,
      score: scoreMealSimilarity(meal, recipe)
    }))
    .filter((item) => item.score > 0)
    .sort((first, second) => second.score - first.score)[0];

  if (scoredMeal) {
    return scoredMeal.meal;
  }

  const seed = String(recipe.id || recipe.title || recipe.image_prompt || 'recipe');
  return usableMeals[hashText(seed) % usableMeals.length];
}

function buildMealDbSearchTerms(recipe) {
  const terms = [];
  const title = String(recipe.title || '').trim();
  const prompt = String(recipe.image_prompt || '').trim();
  const combinedText = `${title} ${prompt}`;

  for (const mapping of COMMON_DISH_TERMS) {
    if (mapping.pattern.test(combinedText)) {
      addUniqueTerm(terms, mapping.term);
    }
  }

  if (/炒饭|fried rice/i.test(combinedText)) {
    addUniqueTerm(terms, /虾|shrimp|prawn/i.test(combinedText) ? 'Thai fried rice with prawns & peas' : 'Chicken Fried Rice');
    addUniqueTerm(terms, 'Fried Rice');
  }

  if (/面|面条|noodle|noodles|lo mein/i.test(combinedText)) {
    addUniqueTerm(terms, 'Beef Lo Mein');
  }

  if (/^[\x00-\x7F\s,'-]+$/.test(title)) {
    addUniqueTerm(terms, title);
  }

  if (prompt) {
    addUniqueTerm(terms, prompt.split(',')[0]);
  }

  return terms.slice(0, 6);
}

function buildMealDbIngredientFilters(recipe) {
  const terms = [];
  const ingredients = parseRecipeIngredients(recipe.ingredients)
    .map((item) => String(item || '').trim())
    .filter(Boolean);
  const combinedText = [
    recipe.title,
    recipe.category,
    recipe.image_prompt,
    ...ingredients
  ].join(' ');

  for (const mapping of COMMON_INGREDIENT_FILTERS) {
    if (mapping.pattern.test(combinedText)) {
      addUniqueTerm(terms, mapping.term);
    }
  }

  return terms.slice(0, 6);
}

function buildMealDbCategoryFilters(recipe) {
  const category = String(recipe.category || '').trim();
  const filters = CATEGORY_FILTERS[category] || [];
  const terms = [];

  for (const filter of filters) {
    addUniqueTerm(terms, filter);
  }

  return terms;
}

function buildMealDbAreaFilters() {
  return AREA_FILTERS;
}

function buildFallbackGeneratedImage(recipe) {
  const prompt = String(recipe.image_prompt || '').trim();
  const title = String(recipe.title || '').trim();
  const category = String(recipe.category || '').trim();
  const query = prompt || `${title} ${category} Chinese food photography`.trim();

  return {
    image: `https://image.pollinations.ai/prompt/${encodeURIComponent(query)}?width=900&height=560&seed=${recipe.id || encodeURIComponent(title || 'recipe')}&nologo=true`,
    thumbnail: '',
    source: 'fallback-generated',
    query,
    title: '',
    creator: '',
    license: '',
    landingUrl: ''
  };
}

function buildMealDbImageResult(meal, query, strategy) {
  const image = getMealImage(meal);

  return {
    image,
    thumbnail: `${image}/medium`,
    source: 'themealdb',
    strategy,
    query,
    title: meal.strMeal || '',
    creator: 'TheMealDB',
    license: '',
    landingUrl: meal.idMeal ? `https://www.themealdb.com/meal/${meal.idMeal}` : 'https://www.themealdb.com/'
  };
}

function getMealImage(meal) {
  const image = String(meal?.strMealThumb || '').trim();

  if (!/^https?:\/\//i.test(image)) {
    return '';
  }

  return image;
}

async function fetchMealDbJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  let response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const detail = await response.text();
    const error = new Error(`TheMealDB image search failed: ${detail || response.statusText}`);
    error.status = 502;
    throw error;
  }

  return response.json();
}

async function searchTheMealDbImage(recipe) {
  const terms = buildMealDbSearchTerms(recipe);

  for (const term of terms) {
    const url = new URL('https://www.themealdb.com/api/json/v1/1/search.php');
    url.searchParams.set('s', term);

    const data = await fetchMealDbJson(url);
    const meals = Array.isArray(data.meals) ? data.meals : [];
    const meal = meals.find((item) => getMealImage(item));

    if (meal) {
      return buildMealDbImageResult(meal, term, 'search');
    }
  }

  for (const area of buildMealDbAreaFilters()) {
    const url = new URL('https://www.themealdb.com/api/json/v1/1/filter.php');
    url.searchParams.set('a', area);

    const data = await fetchMealDbJson(url);
    const meals = Array.isArray(data.meals) ? data.meals : [];
    const meal = pickDeterministicMeal(meals, recipe);

    if (meal) {
      return buildMealDbImageResult(meal, area, 'area-similar');
    }
  }

  const ingredientFilters = buildMealDbIngredientFilters(recipe);

  for (const ingredient of ingredientFilters) {
    const url = new URL('https://www.themealdb.com/api/json/v1/1/filter.php');
    url.searchParams.set('i', ingredient);

    const data = await fetchMealDbJson(url);
    const meals = Array.isArray(data.meals) ? data.meals : [];
    const meal = pickDeterministicMeal(meals, recipe);

    if (meal) {
      return buildMealDbImageResult(meal, ingredient, 'ingredient');
    }
  }

  const categoryFilters = buildMealDbCategoryFilters(recipe);

  for (const category of categoryFilters) {
    const url = new URL('https://www.themealdb.com/api/json/v1/1/filter.php');
    url.searchParams.set('c', category);

    const data = await fetchMealDbJson(url);
    const meals = Array.isArray(data.meals) ? data.meals : [];
    const meal = pickDeterministicMeal(meals, recipe);

    if (meal) {
      return buildMealDbImageResult(meal, category, 'category');
    }
  }

  const error = new Error('No matching TheMealDB image found');
  error.status = 404;
  throw error;
}

module.exports = {
  buildFallbackGeneratedImage,
  buildMealDbAreaFilters,
  buildMealDbCategoryFilters,
  buildMealDbIngredientFilters,
  buildMealDbSearchTerms,
  searchTheMealDbImage
};
