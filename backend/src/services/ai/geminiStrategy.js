const AiRecipeStrategy = require('./baseStrategy');

class GeminiRecipeStrategy extends AiRecipeStrategy {
  constructor(apiKey, options = {}) {
    super(apiKey);
    this.baseUrl = (options.baseUrl || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '');
    this.model = options.model || 'gemini-1.5-flash';
  }

  async generateRecipes(ingredients, options = {}) {
    if (!this.apiKey) {
      const error = new Error('Gemini API key is not configured');
      error.status = 400;
      throw error;
    }

    const count = Math.max(1, Number(options.count || 6));
    const batchLabel = options.batchLabel ? `本批次主题：${options.batchLabel}。` : '';
    const randomInstruction = options.randomDish
      ? '这是“随机一菜”功能，请只生成一道有惊喜感、完整可执行、适合今日推荐的菜，不要像批量生成那样列多个备选。'
      : '';
    const preferenceInstruction = buildPreferenceInstruction(options.preferences);

    const response = await fetch(
      `${this.baseUrl}/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `请根据这些食材生成 ${count} 道中文菜谱：${ingredients.join('、')}。${batchLabel}${randomInstruction}${preferenceInstruction}只返回 JSON：{"recipes":[{"title":"","ingredients":[],"summary":"","category":"","instructions":"","image_prompt":""}]}，不要 Markdown。category 只能是：炒菜、汤、凉拌、蒸菜、煎炸烤、主食、其他；如果生成多道菜，尽量覆盖不同分类。summary 用 40-80 个中文字符做卡片摘要；instructions 要详细、可执行，并包含编号步骤；image_prompt 用英文写一句菜品视觉描述。`
                }
              ]
            }
          ]
        })
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      const error = new Error(`Gemini recipe generation failed: ${extractGeminiError(detail)}`);
      error.status = 502;
      error.details = detail;
      throw error;
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
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

function extractGeminiError(detail) {
  try {
    const parsed = JSON.parse(detail);
    return parsed.error?.message || detail;
  } catch (error) {
    return detail || 'unknown Gemini error';
  }
}

function parseRecipesJson(content) {
  const cleaned = content.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed.recipes)) {
    throw new Error('AI response did not include recipes');
  }

  return parsed.recipes;
}

module.exports = GeminiRecipeStrategy;
