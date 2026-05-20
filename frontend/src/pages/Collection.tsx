import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChefHat, Bookmark, Clock, Trash2, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { RecipeVisual, buildRecipeSummary } from '../utils/recipeImages';
import { readSavedRecipeIds, SAVED_RECIPE_IDS_EVENT, SAVED_RECIPE_IDS_KEY, updateSavedRecipeId, writeSavedRecipeIds } from '../utils/savedRecipes';
import { readShoppingRecipeIds, updateShoppingRecipeId, SHOPPING_RECIPE_IDS_EVENT } from '../utils/shoppingRecipes';

interface SavedRecipe {
  id: number;
  title: string;
  ingredients: string[];
  summary?: string;
  category?: string;
  instructions: string;
  image_prompt?: string;
  saved_at: string;
}

export default function Collection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [shoppingRecipeIds, setShoppingRecipeIds] = useState<number[]>(() => readShoppingRecipeIds());

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/auth');
      return;
    }

    const fetchSavedRecipes = async () => {
      try {
        const res = await apiClient.get('/api/recipes/saved');
        if (res.data && res.data.saved_recipes) {
          setRecipes(res.data.saved_recipes);
          writeSavedRecipeIds(res.data.saved_recipes.map((recipe: SavedRecipe) => recipe.id));
        }
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err.response?.data?.message || '无法获取收藏记录');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSavedRecipes();

    const handleSavedRecipesChanged = (event: Event) => {
      const ids = (event as CustomEvent<{ ids?: number[] }>).detail?.ids || readSavedRecipeIds();
      setRecipes((current) => current.filter((recipe) => ids.includes(recipe.id)));
    };

    const handleShoppingRecipesChanged = (event: Event) => {
      const ids = (event as CustomEvent<{ ids?: number[] }>).detail?.ids;
      setShoppingRecipeIds(Array.isArray(ids) ? ids : readShoppingRecipeIds());
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === SAVED_RECIPE_IDS_KEY) {
        const ids = readSavedRecipeIds();
        setRecipes((current) => current.filter((recipe) => ids.includes(recipe.id)));
      }
      if (event.key === 'shopping_recipe_ids') {
        setShoppingRecipeIds(readShoppingRecipeIds());
      }
    };

    window.addEventListener(SAVED_RECIPE_IDS_EVENT, handleSavedRecipesChanged);
    window.addEventListener(SHOPPING_RECIPE_IDS_EVENT, handleShoppingRecipesChanged);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(SAVED_RECIPE_IDS_EVENT, handleSavedRecipesChanged);
      window.removeEventListener(SHOPPING_RECIPE_IDS_EVENT, handleShoppingRecipesChanged);
      window.removeEventListener('storage', handleStorage);
    };
  }, [navigate]);

  const handleUnsaveRecipe = async (recipeId: number) => {
    if (!window.confirm('确定取消收藏这道菜谱吗？')) {
      return;
    }

    setRemovingId(recipeId);
    setErrorMsg('');

    try {
      await apiClient.delete(`/api/recipes/saved/${recipeId}`);
      setRecipes((current) => current.filter((recipe) => recipe.id !== recipeId));
      updateSavedRecipeId(recipeId, false);
      // Auto-remove from shopping list active recipes
      updateShoppingRecipeId(recipeId, false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || '取消收藏失败');
    } finally {
      setRemovingId(null);
    }
  };

  const handleToggleShoppingRecipe = (recipeId: number) => {
    const isCurrentlyIn = shoppingRecipeIds.includes(recipeId);
    setShoppingRecipeIds(updateShoppingRecipeId(recipeId, !isCurrentlyIn));
  };

  const openRecipeDetail = (recipeId: number) => {
    window.open(`/recipes/${recipeId}`, '_blank', 'noopener,noreferrer');
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto py-12 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="max-w-5xl mx-auto py-12">
        <div className="bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400 p-6 rounded-2xl text-center font-medium border border-red-200/35">
          {errorMsg}
        </div>
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <div className="max-w-5xl mx-auto py-12">
        <div className="ios-glass bg-white/60 dark:bg-zinc-900/40 p-12 rounded-[32px] text-center border border-zinc-150/40 dark:border-zinc-800/80">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-[22px] bg-orange-100/70 dark:bg-orange-950/40 mb-6">
            <ChefHat className="text-orange-500" size={40} />
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-white mb-3">{t('collection_title')}</h1>
          <p className="text-zinc-550 dark:text-zinc-400 text-base font-medium">{t('collection_empty')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 animate-fade-in">
      <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-white mb-8 flex items-center gap-2.5">
        <Bookmark className="text-orange-500" /> {t('collection_title')}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {recipes.map((recipe) => {
          return (
            <article key={recipe.id} className="ios-glass bg-white/70 dark:bg-zinc-900/50 rounded-3xl border border-zinc-150/60 dark:border-zinc-800/85 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col relative overflow-hidden">
              <button
                type="button"
                onClick={() => openRecipeDetail(recipe.id)}
                className="block w-full text-left cursor-pointer group"
              >
                <RecipeVisual recipe={recipe} className="h-52 bg-orange-50 dark:bg-zinc-950/40 group-hover:scale-103 transition-transform duration-500" />
              </button>

              <div className="p-6">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center text-xs text-zinc-400 dark:text-zinc-500 gap-1.5 font-semibold uppercase tracking-wide">
                      <Clock size={13} /> 收藏于 {new Date(recipe.saved_at).toLocaleDateString()}
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-zinc-650 dark:text-zinc-300 font-medium">{buildRecipeSummary(recipe)}</p>
                    <button
                      type="button"
                      onClick={() => openRecipeDetail(recipe.id)}
                      className="mt-3 text-sm font-extrabold text-orange-500 dark:text-orange-400 hover:text-orange-650 cursor-pointer"
                    >
                      点击打开完整菜单 &rarr;
                    </button>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleShoppingRecipe(recipe.id)}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-extrabold transition-all duration-200 ios-active-scale cursor-pointer ${
                        shoppingRecipeIds.includes(recipe.id)
                          ? 'bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 hover:bg-orange-200/50'
                          : 'bg-orange-500 text-white hover:bg-orange-600 shadow-sm'
                      }`}
                    >
                      <ShoppingCart size={13} />
                      {shoppingRecipeIds.includes(recipe.id) ? '已在采购' : '加入采购'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUnsaveRecipe(recipe.id)}
                      disabled={removingId === recipe.id}
                      className="inline-flex items-center justify-center gap-1.5 rounded-full bg-red-50 dark:bg-red-950/30 px-3.5 py-2 text-xs font-extrabold text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/25 disabled:opacity-50 ios-active-scale cursor-pointer"
                      title="取消收藏"
                    >
                      <Trash2 size={13} />
                      {removingId === recipe.id ? '取消中...' : '取消收藏'}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
