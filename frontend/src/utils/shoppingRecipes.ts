const SHOPPING_RECIPE_IDS_KEY = 'shopping_recipe_ids';
export const SHOPPING_RECIPE_IDS_EVENT = 'shopping_recipe_ids_changed';

export function readShoppingRecipeIds(): number[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(SHOPPING_RECIPE_IDS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.map(Number).filter((n) => !isNaN(n)) : [];
  } catch {
    return [];
  }
}

export function writeShoppingRecipeIds(ids: number[]) {
  const uniqueIds = [...new Set(ids.map(Number).filter((n) => !isNaN(n)))];
  localStorage.setItem(SHOPPING_RECIPE_IDS_KEY, JSON.stringify(uniqueIds));
  window.dispatchEvent(new CustomEvent(SHOPPING_RECIPE_IDS_EVENT, { detail: { ids: uniqueIds } }));
  return uniqueIds;
}

export function updateShoppingRecipeId(id: number, inList: boolean) {
  const current = readShoppingRecipeIds();
  const next = inList
    ? [...current, id]
    : current.filter((x) => x !== id);
  return writeShoppingRecipeIds(next);
}
