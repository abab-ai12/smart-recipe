class AiRecipeStrategy {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async generateRecipes() {
    throw new Error('generateRecipes must be implemented by a concrete AI strategy');
  }
}

module.exports = AiRecipeStrategy;
