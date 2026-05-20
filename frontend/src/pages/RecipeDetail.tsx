import { useEffect, useState } from 'react';
import { ArrowLeft, Bookmark, BookmarkCheck, Clock, ExternalLink, PenLine, PlayCircle, ShoppingCart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import apiClient from '../api/client';
import { RecipeVisual, buildRecipeSummary } from '../utils/recipeImages';
import { readSavedRecipeIds, SAVED_RECIPE_IDS_EVENT, SAVED_RECIPE_IDS_KEY, updateSavedRecipeId, writeSavedRecipeIds } from '../utils/savedRecipes';
import { readShoppingRecipeIds, updateShoppingRecipeId, SHOPPING_RECIPE_IDS_EVENT } from '../utils/shoppingRecipes';

interface RecipeDetailData {
  id: number;
  title: string;
  ingredients: string[];
  summary?: string;
  category?: string;
  instructions: string;
  image_prompt?: string;
  owner_user_id?: number | null;
  source_recipe_id?: number | null;
  created_at: string;
}

interface RecipeVersion {
  id: number;
  version_number: number;
  title: string;
  ingredients: string[];
  summary?: string;
  category?: string;
  instructions: string;
  change_note?: string;
  editor_username?: string;
  created_at: string;
}

function DouyinLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-9 w-9" aria-hidden="true">
      <rect width="48" height="48" rx="12" fill="#111827" />
      <path d="M28 9v20.5a8.5 8.5 0 1 1-8.5-8.5c.9 0 1.8.1 2.5.4v5.1a3.8 3.8 0 1 0 1.2 2.8V9h4.8Z" fill="#fff" />
      <path d="M31.4 12.2c1.7 3 4 4.8 7.1 5.3v5.1c-3.2-.2-5.8-1.2-7.9-3v-7.4h.8Z" fill="#25F4EE" />
      <path d="M29.8 10.7c1.8 3.2 4.1 5.1 7.1 5.7v3.2c-3.4-.5-6.3-2.2-8.4-5.4v-3.5h1.3Z" fill="#FE2C55" />
    </svg>
  );
}

function BilibiliLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-9 w-9" aria-hidden="true">
      <rect width="48" height="48" rx="12" fill="#00A1D6" />
      <path d="M15 17h18a6 6 0 0 1 6 6v8a6 6 0 0 1-6 6H15a6 6 0 0 1-6-6v-8a6 6 0 0 1 6-6Z" fill="#fff" />
      <path d="m17 11 5 5M31 11l-5 5" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <path d="M18 26v4M30 26v4" stroke="#00A1D6" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function YouTubeLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-9 w-9" aria-hidden="true">
      <rect width="48" height="48" rx="12" fill="#FF0033" />
      <path d="M20 16.5 33 24 20 31.5v-15Z" fill="#fff" />
    </svg>
  );
}

export default function RecipeDetail() {
  const { t, i18n } = useTranslation();
  const recipeId = window.location.pathname.split('/').pop();
  const [recipe, setRecipe] = useState<RecipeDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [savedRecipeIds, setSavedRecipeIds] = useState<Set<number>>(() => new Set(readSavedRecipeIds()));
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editCategory, setEditCategory] = useState('其他');
  const [editIngredients, setEditIngredients] = useState('');
  const [editInstructions, setEditInstructions] = useState('');
  const [versions, setVersions] = useState<RecipeVersion[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [restoringVersionId, setRestoringVersionId] = useState<number | null>(null);
  const [shoppingRecipeIds, setShoppingRecipeIds] = useState<number[]>(() => readShoppingRecipeIds());

  useEffect(() => {
    const fetchRecipe = async () => {
      if (!recipeId) {
        setErrorMsg(t('detail_missing'));
        setIsLoading(false);
        return;
      }

      try {
        const res = await apiClient.get(`/api/recipes/${recipeId}`);
        setRecipe(res.data?.recipe || null);
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err.response?.data?.message || t('detail_load_failed'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecipe();
  }, [recipeId, t]);

  useEffect(() => {
    const syncSavedRecipeIds = (ids: number[]) => {
      setSavedRecipeIds(new Set(ids));
    };

    const fetchSavedRecipeIds = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        syncSavedRecipeIds([]);
        writeSavedRecipeIds([]);
        return;
      }

      try {
        const res = await apiClient.get('/api/recipes/saved');
        const ids = Array.isArray(res.data?.saved_recipes)
          ? res.data.saved_recipes.map((item: { id: number }) => item.id).filter(Boolean)
          : [];
        syncSavedRecipeIds(writeSavedRecipeIds(ids));
      } catch {
        syncSavedRecipeIds(readSavedRecipeIds());
      }
    };

    const handleSavedRecipesChanged = (event: Event) => {
      const ids = (event as CustomEvent<{ ids?: number[] }>).detail?.ids;
      syncSavedRecipeIds(Array.isArray(ids) ? ids : readSavedRecipeIds());
    };

    const handleShoppingRecipesChanged = (event: Event) => {
      const ids = (event as CustomEvent<{ ids?: number[] }>).detail?.ids;
      setShoppingRecipeIds(Array.isArray(ids) ? ids : readShoppingRecipeIds());
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === SAVED_RECIPE_IDS_KEY) {
        syncSavedRecipeIds(readSavedRecipeIds());
      }
      if (event.key === 'shopping_recipe_ids') {
        setShoppingRecipeIds(readShoppingRecipeIds());
      }
    };

    fetchSavedRecipeIds();
    window.addEventListener(SAVED_RECIPE_IDS_EVENT, handleSavedRecipesChanged);
    window.addEventListener(SHOPPING_RECIPE_IDS_EVENT, handleShoppingRecipesChanged);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(SAVED_RECIPE_IDS_EVENT, handleSavedRecipesChanged);
      window.removeEventListener(SHOPPING_RECIPE_IDS_EVENT, handleShoppingRecipesChanged);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const handleToggleSaveRecipe = async () => {
    if (!recipe) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/auth';
      return;
    }

    const isSaved = savedRecipeIds.has(recipe.id);
    setIsSaving(true);

    try {
      if (isSaved) {
        await apiClient.delete(`/api/recipes/saved/${recipe.id}`);
        // Auto-remove from shopping list as well
        updateShoppingRecipeId(recipe.id, false);
      } else {
        await apiClient.post('/api/recipes/save', recipe);
        // Auto-add to shopping list on new save
        updateShoppingRecipeId(recipe.id, true);
      }

      setSavedRecipeIds(new Set(updateSavedRecipeId(recipe.id, !isSaved)));
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || t('save_status_error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleShoppingRecipe = () => {
    if (!recipe) return;
    const isCurrentlyIn = shoppingRecipeIds.includes(recipe.id);
    setShoppingRecipeIds(updateShoppingRecipeId(recipe.id, !isCurrentlyIn));
  };

  const startEditRecipe = () => {
    if (!recipe) return;
    setEditTitle(recipe.title);
    setEditSummary(recipe.summary || '');
    setEditCategory(recipe.category || '其他');
    setEditIngredients(recipe.ingredients.join('\n'));
    setEditInstructions(recipe.instructions);
    setIsEditing(true);
  };

  const handleUpdateRecipe = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!recipe) return;

    setIsUpdating(true);
    setErrorMsg('');

    try {
      const ingredients = editIngredients
        .split(/\r?\n|[,，]/)
        .map((item) => item.trim())
        .filter(Boolean);
      const res = await apiClient.put(`/api/recipes/${recipe.id}`, {
        title: editTitle,
        summary: editSummary,
        category: editCategory,
        ingredients,
        instructions: editInstructions,
        image_prompt: recipe.image_prompt || ''
      });

      const updatedRecipe = res.data?.recipe || recipe;
      setRecipe(updatedRecipe);
      if (res.data?.created_personal_copy && updatedRecipe.id) {
        window.history.replaceState(null, '', `/recipes/${updatedRecipe.id}`);
      }
      await loadVersions(updatedRecipe.id);
      setIsEditing(false);
      alert(t('detail_update_success'));
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || t('detail_update_failed'));
    } finally {
      setIsUpdating(false);
    }
  };

  const loadVersions = async (targetRecipeId = recipe?.id) => {
    if (!targetRecipeId || !localStorage.getItem('token')) return;
    setIsLoadingVersions(true);

    try {
      const res = await apiClient.get(`/api/recipes/${targetRecipeId}/versions`);
      setVersions(res.data?.versions || []);
    } catch {
      setVersions([]);
    } finally {
      setIsLoadingVersions(false);
    }
  };

  const restoreVersion = async (version: RecipeVersion) => {
    if (!recipe) return;
    if (!window.confirm(t('detail_restore_confirm', { version: version.version_number }))) return;

    setRestoringVersionId(version.id);
    setErrorMsg('');

    try {
      const res = await apiClient.post(`/api/recipes/${recipe.id}/versions/${version.id}/restore`);
      setRecipe(res.data?.recipe || recipe);
      await loadVersions(recipe.id);
      alert(t('detail_restore_success'));
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || t('detail_restore_failed'));
    } finally {
      setRestoringVersionId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto py-16 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (errorMsg || !recipe) {
    return (
      <div className="max-w-4xl mx-auto py-16">
        <div className="rounded-2xl border border-red-100 bg-red-50 p-8 text-center text-red-600">
          {errorMsg || t('detail_missing')}
        </div>
      </div>
    );
  }

  const videoSearchQuery = i18n.language === 'en'
    ? `${recipe.title} cooking tutorial`
    : `${recipe.title} 做法 教程`;
  const douyinSearchUrl = `https://www.douyin.com/search/${encodeURIComponent(videoSearchQuery)}`;
  const bilibiliSearchUrl = `https://search.bilibili.com/all?keyword=${encodeURIComponent(videoSearchQuery)}`;
  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(videoSearchQuery)}`;

  const isSaved = savedRecipeIds.has(recipe.id);
  const isPersonalRecipe = Boolean(recipe.owner_user_id);

  return (
    <article className="max-w-5xl mx-auto pb-12 animate-fade-in">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.close()}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 px-4 py-2 text-xs md:text-sm font-extrabold text-zinc-650 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-855 transition-all duration-200 ios-active-scale cursor-pointer"
          >
            <ArrowLeft size={15} />
            {t('detail_close')}
          </button>
          {localStorage.getItem('token') && (
            <button
              type="button"
              onClick={startEditRecipe}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 px-4 py-2 text-xs md:text-sm font-extrabold text-zinc-650 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-855 transition-all duration-200 ios-active-scale cursor-pointer"
            >
              <PenLine size={15} />
              {t('detail_edit')}
            </button>
          )}
          {isPersonalRecipe && (
            <button
              type="button"
              onClick={() => loadVersions()}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 px-4 py-2 text-xs md:text-sm font-extrabold text-zinc-650 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-855 transition-all duration-200 ios-active-scale cursor-pointer"
            >
              {isLoadingVersions ? t('detail_versions_loading') : t('detail_versions')}
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {isSaved && (
            <button
              type="button"
              onClick={handleToggleShoppingRecipe}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs md:text-sm font-extrabold transition-all duration-200 ios-active-scale cursor-pointer ${
                shoppingRecipeIds.includes(recipe.id)
                  ? 'bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 hover:bg-orange-200/50'
                  : 'bg-orange-500 text-white hover:bg-orange-600 shadow-md'
              }`}
            >
              <ShoppingCart size={16} />
              {shoppingRecipeIds.includes(recipe.id) ? '已在采购清单中' : '加入采购清单'}
            </button>
          )}
          <button
            type="button"
            onClick={handleToggleSaveRecipe}
            disabled={isSaving}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs md:text-sm font-extrabold transition-all duration-200 ios-active-scale cursor-pointer disabled:opacity-50 ${
              isSaved
                ? 'bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 hover:bg-orange-200/50'
                : 'bg-orange-500 text-white hover:bg-orange-600 shadow-md'
            }`}
          >
            {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
            {isSaved ? t('home_saved') : t('home_save')}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[32px] ios-glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-150/60 dark:border-zinc-800/80 shadow-xl">
        <RecipeVisual recipe={recipe} className="h-[400px]" />

        <div className="p-6 md:p-8">
          {isEditing && (
            <form onSubmit={handleUpdateRecipe} className="mb-8 rounded-[24px] border border-orange-200/50 dark:border-orange-900/30 bg-orange-500/5 p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{t('detail_edit_title')}</span>
                  <input
                    required
                    value={editTitle}
                    onChange={(event) => setEditTitle(event.target.value)}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-850 bg-white/50 dark:bg-zinc-950/40 text-zinc-900 dark:text-white px-3 py-2 text-sm outline-none focus:border-orange-400 dark:focus:border-orange-500 focus:ring-1 focus:ring-orange-100 transition-all duration-200"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{t('detail_edit_category')}</span>
                  <select
                    value={editCategory}
                    onChange={(event) => setEditCategory(event.target.value)}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-850 bg-white/50 dark:bg-zinc-950/40 text-zinc-900 dark:text-white px-3 py-2.5 text-sm outline-none focus:border-orange-400 dark:focus:border-orange-500 focus:ring-1 focus:ring-orange-100 transition-all duration-200 cursor-pointer"
                  >
                    {['炒菜', '汤', '凉拌', '蒸菜', '煎炸烤', '主食', '其他'].map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{t('detail_edit_summary')}</span>
                <input
                  value={editSummary}
                  onChange={(event) => setEditSummary(event.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-850 bg-white/50 dark:bg-zinc-950/40 text-zinc-900 dark:text-white px-3 py-2 text-sm outline-none focus:border-orange-400 dark:focus:border-orange-500 focus:ring-1 focus:ring-orange-100 transition-all duration-200"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{t('detail_edit_ingredients')}</span>
                <textarea
                  required
                  value={editIngredients}
                  onChange={(event) => setEditIngredients(event.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-850 bg-white/50 dark:bg-zinc-950/40 text-zinc-900 dark:text-white px-3 py-2 text-sm outline-none focus:border-orange-400 dark:focus:border-orange-500 focus:ring-1 focus:ring-orange-100 transition-all duration-200"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{t('detail_edit_instructions')}</span>
                <textarea
                  required
                  value={editInstructions}
                  onChange={(event) => setEditInstructions(event.target.value)}
                  rows={6}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-850 bg-white/50 dark:bg-zinc-950/40 text-zinc-900 dark:text-white px-3 py-2 text-sm outline-none focus:border-orange-400 dark:focus:border-orange-500 focus:ring-1 focus:ring-orange-100 transition-all duration-200"
                />
              </label>
              <div className="mt-4 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-xs md:text-sm font-extrabold text-zinc-650 dark:text-zinc-350 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  {t('detail_cancel_edit')}
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="rounded-xl bg-orange-500 px-4 py-2 text-xs md:text-sm font-extrabold text-white disabled:opacity-60 cursor-pointer hover:bg-orange-600"
                >
                  {isUpdating ? t('admin_deleting') : t('detail_save_edit')}
                </button>
              </div>
            </form>
          )}
          <div className="mb-8 flex flex-wrap items-center gap-4 text-xs font-semibold text-zinc-400 dark:text-zinc-500">
            <span className="inline-flex items-center gap-1">
              <Clock size={14} />
              {t('detail_created_at', { time: new Date(recipe.created_at).toLocaleString() })}
            </span>
            <span>ID: {recipe.id}</span>
            {recipe.source_recipe_id && <span className="text-orange-500">{t('detail_personal_copy')}</span>}
          </div>

          {isPersonalRecipe && versions.length > 0 && (
            <section className="mb-8 rounded-3xl border border-zinc-150/45 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 p-5">
              <h2 className="mb-4 text-base font-extrabold text-zinc-850 dark:text-zinc-200">{t('detail_versions')}</h2>
              <div className="space-y-3">
                {versions.map((version) => (
                  <div key={version.id} className="rounded-2xl border border-zinc-200/80 dark:border-zinc-850 bg-white/60 dark:bg-zinc-900/50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                          {t('detail_version_item', { version: version.version_number, title: version.title })}
                        </p>
                        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-550 font-medium">
                          {new Date(version.created_at).toLocaleString()}
                          {version.change_note ? ` · ${version.change_note}` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => restoreVersion(version)}
                        disabled={restoringVersionId === version.id}
                        className="rounded-full bg-orange-100/60 dark:bg-orange-950/40 px-4 py-1.5 text-xs font-extrabold text-orange-600 dark:text-orange-400 hover:bg-orange-100 disabled:opacity-60 ios-active-scale cursor-pointer"
                      >
                        {restoringVersionId === version.id ? t('detail_restoring') : t('detail_restore')}
                      </button>
                    </div>
                    <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-450 font-medium">{version.summary || version.instructions}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="mb-8 border-b border-zinc-100 dark:border-zinc-850 pb-6">
            <h2 className="text-base md:text-lg font-extrabold text-zinc-900 dark:text-white mb-3">{t('detail_summary')}</h2>
            <p className="text-zinc-650 dark:text-zinc-300 text-sm md:text-base leading-relaxed font-medium">{buildRecipeSummary(recipe)}</p>
          </section>

          <section className="mb-8 border-b border-zinc-100 dark:border-zinc-850 pb-6">
            <h2 className="text-base md:text-lg font-extrabold text-zinc-900 dark:text-white mb-4.5">{t('detail_ingredients')}</h2>
            <div className="flex flex-wrap gap-2.5">
              {recipe.ingredients.map((ingredient, index) => (
                <span key={`${ingredient}-${index}`} className="rounded-xl bg-orange-100/55 dark:bg-orange-950/30 px-3.5 py-1.5 text-xs md:text-sm font-extrabold text-orange-650 dark:text-orange-400 border border-orange-200/20">
                  {ingredient}
                </span>
              ))}
            </div>
          </section>

          <section className="mb-8 border-b border-zinc-100 dark:border-zinc-850 pb-6">
            <h2 className="text-base md:text-lg font-extrabold text-zinc-900 dark:text-white mb-3.5">{t('detail_instructions')}</h2>
            <p className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-350 text-sm md:text-base leading-relaxed md:leading-loose font-medium">{recipe.instructions}</p>
          </section>

          <section>
            <div className="mb-4">
              <h2 className="flex items-center gap-2 text-base md:text-lg font-extrabold text-zinc-900 dark:text-white">
                <PlayCircle size={20} className="text-orange-500" />
                {t('detail_video')}
              </h2>
            </div>
            <div className="rounded-3xl border border-zinc-200/80 dark:border-zinc-850 bg-zinc-55/60 dark:bg-zinc-950/20 p-5">
              <p className="mb-4 text-xs md:text-sm text-zinc-450 dark:text-zinc-500 font-medium">{t('detail_video_hint')}</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <a
                  href={douyinSearchUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-4 rounded-[20px] bg-white/60 dark:bg-zinc-900/50 p-4.5 text-zinc-850 dark:text-zinc-250 border border-zinc-200/70 dark:border-zinc-800 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-all duration-200 ios-active-scale"
                >
                  <span className="flex items-center gap-3">
                    <DouyinLogo />
                    <span>
                      <span className="block text-sm md:text-base font-extrabold">抖音</span>
                      <span className="text-[10px] md:text-xs text-zinc-500 dark:text-zinc-400 font-semibold">{t('detail_douyin_desc')}</span>
                    </span>
                  </span>
                  <ExternalLink size={16} className="text-zinc-450" />
                </a>
                <a
                  href={bilibiliSearchUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-4 rounded-[20px] bg-white/60 dark:bg-zinc-900/50 p-4.5 text-zinc-850 dark:text-zinc-250 border border-zinc-200/70 dark:border-zinc-800 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-all duration-200 ios-active-scale"
                >
                  <span className="flex items-center gap-3">
                    <BilibiliLogo />
                    <span>
                      <span className="block text-sm md:text-base font-extrabold">B站</span>
                      <span className="text-[10px] md:text-xs text-zinc-500 dark:text-zinc-400 font-semibold">{t('detail_bilibili_desc')}</span>
                    </span>
                  </span>
                  <ExternalLink size={16} className="text-zinc-450" />
                </a>
                <a
                  href={youtubeSearchUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-4 rounded-[20px] bg-white/60 dark:bg-zinc-900/50 p-4.5 text-zinc-850 dark:text-zinc-250 border border-zinc-200/70 dark:border-zinc-800 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-all duration-200 ios-active-scale"
                >
                  <span className="flex items-center gap-3">
                    <YouTubeLogo />
                    <span>
                      <span className="block text-sm md:text-base font-extrabold">YouTube</span>
                      <span className="text-[10px] md:text-xs text-zinc-500 dark:text-zinc-400 font-semibold">{t('detail_youtube_desc')}</span>
                    </span>
                  </span>
                  <ExternalLink size={16} className="text-zinc-450" />
                </a>
              </div>
            </div>
          </section>
        </div>
      </div>
    </article>
  );
}
