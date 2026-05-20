export const SAVED_RECIPE_IDS_KEY = 'saved_recipe_ids';
export const SAVED_RECIPE_IDS_EVENT = 'saved_recipe_ids_changed';

export function readSavedRecipeIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVED_RECIPE_IDS_KEY) || '[]');
    return Array.isArray(parsed)
      ? parsed.map(Number).filter((id) => Number.isInteger(id) && id > 0)
      : [];
  } catch {
    return [];
  }
}

export function writeSavedRecipeIds(ids: number[]) {
  const uniqueIds = [...new Set(ids)].filter((id) => Number.isInteger(id) && id > 0);
  localStorage.setItem(SAVED_RECIPE_IDS_KEY, JSON.stringify(uniqueIds));
  window.dispatchEvent(new CustomEvent(SAVED_RECIPE_IDS_EVENT, { detail: { ids: uniqueIds } }));
  return uniqueIds;
}

export function updateSavedRecipeId(recipeId: number, isSaved: boolean) {
  const currentIds = readSavedRecipeIds();
  const nextIds = isSaved
    ? [...currentIds, recipeId]
    : currentIds.filter((id) => id !== recipeId);

  return writeSavedRecipeIds(nextIds);
}
