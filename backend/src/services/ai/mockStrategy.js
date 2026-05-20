const AiRecipeStrategy = require('./baseStrategy');

class MockRecipeStrategy extends AiRecipeStrategy {
  async generateRecipes(ingredients, options = {}) {
    const cleanIngredients = ingredients.map((item) => String(item).trim()).filter(Boolean);
    const count = Math.max(1, Number(options.count || 5));
    const baseName = cleanIngredients.slice(0, 2).join('') || '智能';
    const preferences = options.preferences || {};
    const preferenceText = buildPreferenceText(preferences);
    const themeName = options.batchLabel ? `${baseName}${options.batchLabel}` : baseName;
    const templates = [
      {
        title: `${themeName}家常小炒`,
        category: '炒菜',
        summary: `这是一道以${cleanIngredients.slice(0, 3).join('、')}为主的家常小炒，香气足、下饭快，适合日常正餐。${preferenceText}`,
        steps: ['热锅下油，先放入耐炒食材煸香。', '加入其余食材大火翻炒。', '用盐、生抽调味，炒至断生出锅。']
      },
      {
        title: `${themeName}暖汤`,
        category: '汤',
        summary: `用${cleanIngredients.slice(0, 3).join('、')}做一碗清爽暖汤，口味轻盈，适合搭配米饭或晚餐。${preferenceText}`,
        steps: ['锅中加水烧开，先放入需要久煮的食材。', '转中火煮出味道。', '最后调味，撒入葱花即可。']
      },
      {
        title: `凉拌${themeName}`,
        category: '凉拌',
        summary: `把${cleanIngredients.slice(0, 3).join('、')}做成清爽凉拌菜，开胃省时，适合作为配菜。${preferenceText}`,
        steps: ['食材洗净切好，能焯水的先焯熟过凉。', '加入蒜末、生抽、醋和少量香油。', '拌匀后静置 5 分钟入味。']
      },
      {
        title: `${themeName}蒸菜`,
        category: '蒸菜',
        summary: `这道蒸菜保留食材本味，口感清淡，适合想吃得轻一点的时候。${preferenceText}`,
        steps: ['食材处理成大小均匀的块。', '码入盘中并加少量盐或酱汁。', '上锅蒸熟，出锅后淋少量热油。']
      },
      {
        title: `${themeName}煎香料理`,
        category: '煎炸烤',
        summary: `通过煎香让食材表面更有口感，外香内嫩，适合作为主菜。${preferenceText}`,
        steps: ['食材擦干水分并简单调味。', '平底锅少油，中火煎至两面上色。', '转小火焖熟，出锅前补一点黑胡椒或酱汁。']
      }
    ];

    return templates.slice(0, count).map((template) => ({
      title: template.title,
      ingredients: cleanIngredients,
      summary: template.summary,
      category: template.category,
      instructions: [
        `准备食材：${cleanIngredients.join('、')}。`,
        '将食材清洗并切成适口大小。',
        ...template.steps
      ].join('\n'),
      image_prompt: `${template.title}, ${template.category}, Chinese home cooking`
    }));
  }
}

function buildPreferenceText(preferences = {}) {
  const parts = [];

  if (preferences.servings) parts.push(`${preferences.servings}人份`);
  if (preferences.taste) parts.push(preferences.taste);
  if (preferences.cookingTime) parts.push(preferences.cookingTime);
  if (preferences.dietaryGoal) parts.push(preferences.dietaryGoal);
  if (preferences.avoidIngredients) parts.push(`避开${preferences.avoidIngredients}`);

  return parts.length > 0 ? ` 已按${parts.join('、')}调整。` : '';
}

module.exports = MockRecipeStrategy;
