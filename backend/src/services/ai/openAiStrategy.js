const AiRecipeStrategy = require('./baseStrategy');

class OpenAiRecipeStrategy extends AiRecipeStrategy {
  constructor(apiKey, options = {}) {
    super(apiKey);
    this.baseUrl = (options.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
    this.model = options.model || 'gpt-4o-mini';
  }

  async generateRecipes(ingredients, options = {}) {
    if (!this.apiKey) {
      const error = new Error('OpenAI API key is not configured');
      error.status = 400;
      throw error;
    }

    const count = Math.max(1, Number(options.count || 6));
    const batchLabel = options.batchLabel ? `本批次主题：${options.batchLabel}。` : '';
    const randomInstruction = options.randomDish
      ? '这是“随机一菜”功能，请只生成一道有惊喜感、完整可执行、适合今日推荐的菜，不要像批量生成那样列多个备选。'
      : '';
    const preferenceInstruction = buildPreferenceInstruction(options.preferences);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: `You generate Chinese recipe JSON only. Return {"recipes":[{"title":"","ingredients":[],"summary":"","category":"","instructions":"","image_prompt":""}]} with no markdown. Generate exactly ${count} recipe${count > 1 ? 's' : ''}. category must be one of: 炒菜, 汤, 凉拌, 蒸菜, 煎炸烤, 主食, 其他. Include varied categories when count is greater than 1. summary should be 40-80 Chinese characters. instructions should be detailed, practical, and include numbered cooking steps. image_prompt should be a short English visual description of the dish.`
          },
          {
            role: 'user',
            content: `请根据这些食材生成 ${count} 道可执行菜谱：${ingredients.join('、')}。${batchLabel}${randomInstruction}${preferenceInstruction}摘要用于卡片预览，详细步骤用于点开后查看。`
          }
        ]
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      const error = new Error(`OpenAI recipe generation failed: ${extractOpenAiError(detail)}`);
      error.status = 502;
      error.details = detail;
      throw error;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    return parseRecipesJson(content);
  }
}

function buildPreferenceInstruction(preferences = {}) {
  const parts = [];

  if (preferences.servings) parts.push(`用餐人数：${preferences.servings}人`);
  if (preferences.taste) parts.push(`口味偏好：${preferences.taste}`);
  if (preferences.cookingTime) parts.push(`期望耗时：${preferences.cookingTime}`);
  if (preferences.dietaryGoal) parts.push(`饮食目标：${preferences.dietaryGoal}`);
  if (preferences.avoidIngredients) parts.push(`忌口或过敏：${preferences.avoidIngredients}`);

  return parts.length > 0 ? `请同时满足这些偏好：${parts.join('；')}。` : '';
}

function extractOpenAiError(detail) {
  try {
    const parsed = JSON.parse(detail);
    return parsed.error?.message || detail;
  } catch (error) {
    return detail || 'unknown OpenAI error';
  }
}

function parseRecipesJson(content) {
  const parsed = JSON.parse(content);
  if (!Array.isArray(parsed.recipes)) {
    throw new Error('AI response did not include recipes');
  }

  return parsed.recipes;
}

module.exports = OpenAiRecipeStrategy;
