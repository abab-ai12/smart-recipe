const MAX_INGREDIENT_LENGTH = 32;

const CHINESE_INGREDIENT_KEYWORDS = [
  '米', '面', '粉', '粥', '饭', '蛋', '肉', '鸡', '鸭', '鹅', '鱼', '虾', '蟹', '贝', '牛', '羊', '猪',
  '排骨', '五花', '里脊', '火腿', '香肠', '培根', '豆', '腐', '菇', '菌', '菜', '瓜', '椒', '茄',
  '葱', '姜', '蒜', '番茄', '西红柿', '土豆', '萝卜', '玉米', '南瓜', '莲藕', '山药', '芹菜',
  '菠菜', '生菜', '白菜', '韭菜', '花菜', '西兰花', '香菜', '水果', '苹果', '香蕉', '橙', '柠檬',
  '奶', '芝士', '黄油', '油', '盐', '糖', '醋', '酱', '料酒', '花椒', '八角', '桂皮', '香叶',
  '辣椒', '胡椒', '淀粉', '面包', '燕麦', '花生', '芝麻', '核桃', '红枣', '枸杞'
];

const ENGLISH_INGREDIENT_KEYWORDS = [
  'rice', 'noodle', 'pasta', 'flour', 'bread', 'oat', 'egg', 'chicken', 'duck', 'turkey', 'beef',
  'pork', 'lamb', 'mutton', 'fish', 'bass', 'salmon', 'tuna', 'shrimp', 'prawn', 'crab', 'clam',
  'mussel', 'scallop', 'tofu', 'bean', 'pea', 'lentil', 'mushroom', 'enoki', 'tomato', 'potato',
  'carrot', 'onion', 'garlic', 'ginger', 'scallion', 'cabbage', 'lettuce', 'spinach', 'broccoli',
  'cauliflower', 'celery', 'pepper', 'chili', 'chilli', 'eggplant', 'aubergine', 'corn', 'pumpkin',
  'cucumber', 'zucchini', 'leek', 'cilantro', 'coriander', 'parsley', 'apple', 'banana', 'orange',
  'lemon', 'lime', 'milk', 'cheese', 'butter', 'cream', 'yogurt', 'oil', 'salt', 'sugar', 'vinegar',
  'sauce', 'soy', 'oyster', 'wine', 'starch', 'peppercorn', 'anise', 'cinnamon', 'bay', 'peanut',
  'sesame', 'walnut', 'almond', 'cashew', 'date', 'goji', 'belly', 'rib', 'minced', 'slice', 'slices'
];

const NON_INGREDIENT_PATTERNS = [
  /手机|电脑|桌子|椅子|书包|作业|考试|衣服|鞋|汽车|房子|天气|游戏|电影|音乐|小说|代码|程序|键盘|鼠标/,
  /哈哈|呵呵|嘻嘻|测试|随便|不知道|无所谓|乱填|你好|谢谢|拜拜/,
  /我要|我想|帮我|给我|请问|怎么|为什么|多少|今天|明天|昨天/,
  /\b(phone|mobile|computer|laptop|table|chair|homework|exam|car|house|weather|game|movie|music|code|keyboard|mouse)\b/i,
  /\b(test|hello|thanks|random|whatever|nothing|anything|blah|haha|lol)\b/i,
  /\b(i want|please|how to|why|today|tomorrow|yesterday)\b/i
];

function normalizeIngredient(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
}

function hasInvalidShape(ingredient) {
  if (!ingredient || ingredient.length > MAX_INGREDIENT_LENGTH) return true;
  if (/https?:\/\//i.test(ingredient) || /@/.test(ingredient)) return true;
  if (/^\d+$/.test(ingredient)) return true;
  if (/[{}[\]<>\\|~^=]/.test(ingredient)) return true;
  if (/[😀-🙏🌀-🗿🚀-🛿🇀-🇿]/u.test(ingredient)) return true;
  return false;
}

function containsKeyword(ingredient, keywords) {
  const normalized = ingredient.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
}

function looksLikeIngredient(ingredient) {
  const normalized = normalizeIngredient(ingredient);
  if (hasInvalidShape(normalized)) return false;
  if (NON_INGREDIENT_PATTERNS.some((pattern) => pattern.test(normalized))) return false;

  if (/[\u4e00-\u9fff]/.test(normalized)) {
    return containsKeyword(normalized, CHINESE_INGREDIENT_KEYWORDS);
  }

  if (/^[a-z][a-z\s-]*$/i.test(normalized)) {
    return containsKeyword(normalized, ENGLISH_INGREDIENT_KEYWORDS);
  }

  return false;
}

function validateIngredients(rawIngredients) {
  const ingredients = Array.isArray(rawIngredients)
    ? rawIngredients.map(normalizeIngredient).filter(Boolean)
    : [];

  const invalidIngredients = ingredients.filter((ingredient) => !looksLikeIngredient(ingredient));

  return {
    ingredients,
    invalidIngredients,
    isValid: ingredients.length > 0 && invalidIngredients.length === 0
  };
}

module.exports = {
  looksLikeIngredient,
  normalizeIngredient,
  validateIngredients
};
