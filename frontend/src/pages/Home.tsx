import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Sparkles, Clock, Flame, Bookmark, BookmarkCheck, X, RotateCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { RecipeVisual, buildRecipeSummary } from '../utils/recipeImages';
import { readSavedRecipeIds, SAVED_RECIPE_IDS_EVENT, SAVED_RECIPE_IDS_KEY, updateSavedRecipeId, writeSavedRecipeIds } from '../utils/savedRecipes';

interface HomeProps {
  heroImage: string;
  heroTitle: string;
  heroSubtitle: string;
}

interface Recipe {
  title: string;
  ingredients: string[];
  summary?: string;
  category?: string;
  instructions: string;
  image_prompt?: string;
  image_url?: string;
  image_source?: string;
  is_saved?: boolean;
  id?: number;
}

const ALL_RECIPE_FILTER = '全部';
const OTHER_RECIPE_CATEGORY = '其他';

const RECIPE_FILTERS = [
  { value: ALL_RECIPE_FILTER, labelKey: 'home_filter_all' },
  { value: '炒菜', labelKey: 'recipe_category_stir_fry' },
  { value: '汤', labelKey: 'recipe_category_soup' },
  { value: '凉拌', labelKey: 'recipe_category_cold' },
  { value: '蒸菜', labelKey: 'recipe_category_steamed' },
  { value: '煎炸烤', labelKey: 'recipe_category_pan_fry_bake' },
  { value: '主食', labelKey: 'recipe_category_staple' },
  { value: OTHER_RECIPE_CATEGORY, labelKey: 'recipe_category_other' }
];

const INSPIRATION_POOL = [
  { key: 'tomato_egg', icon: '🍅' },
  { key: 'tomato_beef', icon: '🍲' },
  { key: 'steamed_bass', icon: '🐟' },
  { key: 'chicken_broccoli', icon: '🥗' },
  { key: 'tofu_pork', icon: '🍳' },
  { key: 'spicy_chicken', icon: '🌶️' },
  { key: 'cola_wings', icon: '🍗' },
  { key: 'di_san_xian', icon: '🍆' },
  { key: 'sour_spicy_potato', icon: '🥔' },
  { key: 'shrimp_egg', icon: '🍤' },
  { key: 'braised_pork', icon: '🥩' },
  { key: 'crucian_tofu_soup', icon: '🥣' }
];

export default function Home({ heroImage, heroTitle, heroSubtitle }: HomeProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const generationTimerRef = useRef<number[]>([]);

  const [ingredientInput, setIngredientInput] = useState('');
  const [ingredientsTags, setIngredientsTags] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRandoming, setIsRandoming] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [savedRecipeIds, setSavedRecipeIds] = useState<Set<number>>(() => new Set(readSavedRecipeIds()));
  const [savingRecipeId, setSavingRecipeId] = useState<number | null>(null);
  const [activeRecipeFilter, setActiveRecipeFilter] = useState(ALL_RECIPE_FILTER);
  const [servings, setServings] = useState(2);
  const [taste, setTaste] = useState('家常');
  const [cookingTime, setCookingTime] = useState('30分钟内');
  const [dietaryGoal, setDietaryGoal] = useState('日常均衡');
  const [avoidIngredients, setAvoidIngredients] = useState('');

  // Choose 4 random inspirations initially
  const [inspirations, setInspirations] = useState(() => {
    return [...INSPIRATION_POOL].sort(() => 0.5 - Math.random()).slice(0, 4);
  });

  const handleShuffleInspirations = () => {
    setInspirations([...INSPIRATION_POOL].sort(() => 0.5 - Math.random()).slice(0, 4));
  };

  const getInspirationTitle = (key: string) => t(`home_inspiration_${key}_title`);
  const getInspirationTags = (key: string) =>
    t(`home_inspiration_${key}_tags`)
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

  const clearGenerationStatusTimers = () => {
    generationTimerRef.current.forEach((timer) => window.clearTimeout(timer));
    generationTimerRef.current = [];
  };

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
          ? res.data.saved_recipes.map((recipe: Recipe) => recipe.id).filter(Boolean)
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

    const handleStorage = (event: StorageEvent) => {
      if (event.key === SAVED_RECIPE_IDS_KEY) {
        syncSavedRecipeIds(readSavedRecipeIds());
      }
    };

    fetchSavedRecipeIds();
    window.addEventListener(SAVED_RECIPE_IDS_EVENT, handleSavedRecipesChanged);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(SAVED_RECIPE_IDS_EVENT, handleSavedRecipesChanged);
      window.removeEventListener('storage', handleStorage);
      clearGenerationStatusTimers();
    };
  }, []);

  const startGenerationStatus = (isRandom = false) => {
    clearGenerationStatusTimers();
    setGenerationStatus(isRandom ? t('home_status_random') : t('home_status_start'));
    generationTimerRef.current = [
      window.setTimeout(() => setGenerationStatus(t('home_status_working')), 3000),
      window.setTimeout(() => setGenerationStatus(t('home_status_slow')), 12000)
    ];
  };

  const buildPreferences = () => ({
    servings,
    taste,
    cookingTime,
    dietaryGoal,
    avoidIngredients
  });

  const handleGenerate = async () => {
    const activeTokens = [...ingredientsTags];
    if (ingredientInput.trim()) {
      const tokens = ingredientInput.split(/[,，\s\n]+/).filter(Boolean);
      activeTokens.push(...tokens);
    }

    if (activeTokens.length === 0) return;

    setIsGenerating(true);
    setErrorMsg('');
    setRecipes([]);
    setActiveRecipeFilter(ALL_RECIPE_FILTER);
    startGenerationStatus(false);

    try {
      const res = await apiClient.post('/api/recipes/generate', {
        ingredients: activeTokens,
        preferences: buildPreferences()
      });
      if (res.data && res.data.recipes) {
        const nextRecipes = res.data.recipes;
        setRecipes(nextRecipes);
        const savedIds = nextRecipes.filter((recipe: Recipe) => recipe.is_saved && recipe.id).map((recipe: Recipe) => recipe.id as number);
        if (savedIds.length > 0) {
          setSavedRecipeIds(new Set(writeSavedRecipeIds([...readSavedRecipeIds(), ...savedIds])));
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || t('home_generate_error'));
    } finally {
      setIsGenerating(false);
      clearGenerationStatusTimers();
      setGenerationStatus('');
    }
  };

  const handleToggleSaveRecipe = async (recipe: Recipe) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert(t('home_login_before_save'));
      navigate('/auth');
      return;
    }

    if (!recipe.id) {
      alert(t('home_detail_unavailable'));
      return;
    }

    const isSaved = savedRecipeIds.has(recipe.id);
    setSavingRecipeId(recipe.id);

    try {
      if (isSaved) {
        await apiClient.delete(`/api/recipes/saved/${recipe.id}`);
      } else {
        await apiClient.post('/api/recipes/save', recipe);
      }

      setSavedRecipeIds(new Set(updateSavedRecipeId(recipe.id, !isSaved)));
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || t('home_save_error'));
    } finally {
      setSavingRecipeId(null);
    }
  };

  const handleRandomRecipe = async () => {
    setIsRandoming(true);
    setErrorMsg('');
    setRecipes([]);
    setActiveRecipeFilter(ALL_RECIPE_FILTER);
    startGenerationStatus(true);

    try {
      const res = await apiClient.post('/api/recipes/random', {
        preferences: buildPreferences()
      });
      const randomRecipe = res.data?.recipe;
      const ingredients = Array.isArray(res.data?.ingredients) ? res.data.ingredients : [];

      if (randomRecipe) {
        setRecipes([randomRecipe]);
        setIngredientsTags(ingredients);
        setIngredientInput('');
        if (randomRecipe.is_saved && randomRecipe.id) {
          setSavedRecipeIds(new Set(updateSavedRecipeId(randomRecipe.id, true)));
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || t('home_generate_error'));
    } finally {
      setIsRandoming(false);
      clearGenerationStatusTimers();
      setGenerationStatus('');
    }
  };

  const openRecipeDetail = (recipe: Recipe) => {
    if (!recipe.id) {
      alert(t('home_detail_unavailable'));
      return;
    }

    window.open(`/recipes/${recipe.id}`, '_blank', 'noopener,noreferrer');
  };

  const visibleRecipes = activeRecipeFilter === ALL_RECIPE_FILTER
    ? recipes
    : recipes.filter((recipe) => (recipe.category || OTHER_RECIPE_CATEGORY) === activeRecipeFilter);

  return (
    <div className="w-full space-y-16 animate-fade-in">
      {/* High-end Hero Section */}
      <div 
        className="relative w-full h-[400px] rounded-[32px] overflow-hidden shadow-xl flex items-center justify-center transition-all duration-500 border border-zinc-200/10"
        style={{
          backgroundImage: `url('${heroImage}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"></div>

        <div className="relative z-10 text-center px-6 max-w-3xl transform -translate-y-2">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight drop-shadow-md leading-tight font-sans">
            {heroTitle || t('home_hero_title')}
          </h1>
          <p className="text-base md:text-lg text-zinc-200 mb-8 drop-shadow font-medium">
            {heroSubtitle || t('home_hero_subtitle')}
          </p>

          <div className={`ios-glass bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl p-2 rounded-[22px] flex flex-wrap items-center gap-2 shadow-2xl transition-all duration-300 focus-within:scale-[1.01] ${isGenerating || isRandoming ? 'ai-glowing' : 'border-zinc-200/60 dark:border-zinc-800/80'}`}>
            <div className="pl-3.5 text-zinc-400 dark:text-zinc-500 shrink-0">
              <Search size={20} />
            </div>
            
            <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
              {ingredientsTags.map((tag, idx) => (
                <span 
                  key={`${tag}-${idx}`}
                  className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-850 hover:bg-zinc-200 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 text-xs md:text-sm font-semibold pl-3 pr-1.5 py-1.5 rounded-full border border-zinc-200/50 dark:border-zinc-700/60 shrink-0 select-none animate-fade-in"
                >
                  {tag}
                  <button 
                    type="button" 
                    onClick={() => {
                      setIngredientsTags(prev => prev.filter((_, i) => i !== idx));
                    }} 
                    className="hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 p-0.5 rounded-full transition-colors cursor-pointer"
                  >
                    <X size={12} className="stroke-[2.5]" />
                  </button>
                </span>
              ))}
              
              <input 
                type="text" 
                value={ingredientInput}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.includes(',') || val.includes('，') || val.includes('\n') || (val.includes(' ') && val.trim() !== val)) {
                    const parts = val.split(/[,，\s\n]+/).filter(Boolean);
                    if (parts.length > 0) {
                      const endsWithSeparator = /[,，\s\n]$/.test(val);
                      if (endsWithSeparator) {
                        setIngredientsTags(prev => [...prev, ...parts]);
                        setIngredientInput('');
                      } else {
                        const newTags = parts.slice(0, -1);
                        setIngredientsTags(prev => [...prev, ...newTags]);
                        setIngredientInput(parts[parts.length - 1] || '');
                      }
                    } else {
                      setIngredientInput('');
                    }
                  } else {
                    setIngredientInput(val);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const trimmed = ingredientInput.trim();
                    if (trimmed) {
                      const tokens = trimmed.split(/[,，\s\n]+/).filter(Boolean);
                      setIngredientsTags(prev => [...prev, ...tokens]);
                      setIngredientInput('');
                    } else if (ingredientsTags.length > 0) {
                      handleGenerate();
                    }
                  } else if (e.key === 'Backspace' && !ingredientInput) {
                    setIngredientsTags(prev => prev.slice(0, -1));
                  } else if (e.key === ' ' || e.key === ',' || e.key === '，') {
                    e.preventDefault();
                    const trimmed = ingredientInput.trim();
                    if (trimmed) {
                      const tokens = trimmed.split(/[,，\s\n]+/).filter(Boolean);
                      setIngredientsTags(prev => [...prev, ...tokens]);
                      setIngredientInput('');
                    }
                  }
                }}
                placeholder={ingredientsTags.length === 0 ? t('home_input_placeholder') : ''}
                className="flex-1 bg-transparent border-none outline-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 px-2 py-2 text-sm md:text-base min-w-[120px] font-medium"
              />
            </div>
            
            <button 
              onClick={handleGenerate}
              disabled={isGenerating || isRandoming}
              className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-400 text-white font-extrabold py-2.5 px-6 md:px-7 rounded-2xl transition-all duration-200 shadow-md flex items-center gap-1.5 ios-active-scale cursor-pointer shrink-0"
            >
              <Sparkles size={16} className={isGenerating ? "animate-spin" : ""} />
              {isGenerating ? t('home_generating') : t('home_generate_btn')}
            </button>
          </div>
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={handleRandomRecipe}
              disabled={isGenerating || isRandoming}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-xs md:text-sm font-semibold text-white shadow-lg backdrop-blur-md transition-all duration-200 hover:bg-white/20 disabled:opacity-60 ios-active-scale cursor-pointer"
            >
              <Sparkles size={16} className={isRandoming ? 'animate-spin' : ''} />
              {isRandoming ? t('home_randoming') : t('home_random_recipe_btn')}
            </button>
          </div>
          {generationStatus && (
            <p className="mt-3.5 text-xs font-semibold text-orange-300 drop-shadow animate-pulse">{generationStatus}</p>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto -mt-10 relative z-20 rounded-[28px] ios-glass bg-white/80 dark:bg-zinc-900/60 p-6 shadow-xl border border-zinc-150/40 dark:border-zinc-800/80 transition-all duration-300">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5">
          <label className="block">
            <span className="mb-1.5 block text-xs font-extrabold text-zinc-500 dark:text-zinc-400 tracking-wider uppercase">{t('home_pref_servings')}</span>
            <input
              type="number"
              min={1}
              max={20}
              value={servings}
              onChange={(event) => setServings(Number(event.target.value) || 1)}
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-850 bg-white/50 dark:bg-zinc-950/40 text-zinc-900 dark:text-white px-3 py-2 text-sm outline-none focus:border-orange-400 dark:focus:border-orange-500 focus:ring-1 focus:ring-orange-100 dark:focus:ring-orange-950/20 transition-all duration-200"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-extrabold text-zinc-500 dark:text-zinc-400 tracking-wider uppercase">{t('home_pref_taste')}</span>
            <select
              value={taste}
              onChange={(event) => setTaste(event.target.value)}
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-850 bg-white/50 dark:bg-zinc-950/40 text-zinc-900 dark:text-white px-3 py-2.5 text-sm outline-none focus:border-orange-400 dark:focus:border-orange-500 focus:ring-1 focus:ring-orange-100 dark:focus:ring-orange-950/20 transition-all duration-200 cursor-pointer"
            >
              <option value="家常">{t('home_pref_taste_home')}</option>
              <option value="清淡">{t('home_pref_taste_light')}</option>
              <option value="香辣">{t('home_pref_taste_spicy')}</option>
              <option value="低盐">{t('home_pref_taste_low_salt')}</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-extrabold text-zinc-500 dark:text-zinc-400 tracking-wider uppercase">{t('home_pref_time')}</span>
            <select
              value={cookingTime}
              onChange={(event) => setCookingTime(event.target.value)}
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-850 bg-white/50 dark:bg-zinc-950/40 text-zinc-900 dark:text-white px-3 py-2.5 text-sm outline-none focus:border-orange-400 dark:focus:border-orange-500 focus:ring-1 focus:ring-orange-100 dark:focus:ring-orange-950/20 transition-all duration-200 cursor-pointer"
            >
              <option value="15分钟内">{t('home_pref_time_15')}</option>
              <option value="30分钟内">{t('home_pref_time_30')}</option>
              <option value="1小时内">{t('home_pref_time_60')}</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-extrabold text-zinc-500 dark:text-zinc-400 tracking-wider uppercase">{t('home_pref_goal')}</span>
            <select
              value={dietaryGoal}
              onChange={(event) => setDietaryGoal(event.target.value)}
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-850 bg-white/50 dark:bg-zinc-950/40 text-zinc-900 dark:text-white px-3 py-2.5 text-sm outline-none focus:border-orange-400 dark:focus:border-orange-500 focus:ring-1 focus:ring-orange-100 dark:focus:ring-orange-950/20 transition-all duration-200 cursor-pointer"
            >
              <option value="日常均衡">{t('home_pref_goal_balanced')}</option>
              <option value="减脂">{t('home_pref_goal_fat_loss')}</option>
              <option value="高蛋白">{t('home_pref_goal_protein')}</option>
              <option value="儿童友好">{t('home_pref_goal_kids')}</option>
            </select>
          </label>
          <label className="block col-span-1 sm:col-span-2 md:col-span-1">
            <span className="mb-1.5 block text-xs font-extrabold text-zinc-500 dark:text-zinc-400 tracking-wider uppercase">{t('home_pref_avoid')}</span>
            <input
              type="text"
              value={avoidIngredients}
              onChange={(event) => setAvoidIngredients(event.target.value)}
              placeholder={t('home_pref_avoid_placeholder')}
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-850 bg-white/50 dark:bg-zinc-950/40 text-zinc-900 dark:text-white px-3 py-2 text-sm outline-none focus:border-orange-400 dark:focus:border-orange-500 focus:ring-1 focus:ring-orange-100 dark:focus:ring-orange-950/20 transition-all duration-200"
            />
          </label>
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="max-w-5xl mx-auto px-4">
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 p-4 rounded-2xl text-sm font-medium">
            {errorMsg}
          </div>
        </div>
      )}

      {/* Generated Recipes Section */}
      {recipes.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 pb-12">
          <h2 className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-white mb-6 flex items-center gap-2.5">
            <Sparkles className="text-orange-500" /> {t('home_generated_title')}
          </h2>
          <div className="mb-6 flex flex-wrap gap-2">
            {RECIPE_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setActiveRecipeFilter(filter.value)}
                className={`rounded-full px-4 py-2 text-xs md:text-sm font-bold transition-all duration-200 ios-active-scale cursor-pointer ${
                  activeRecipeFilter === filter.value
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'bg-white/60 dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-800/80 hover:bg-orange-50/50 dark:hover:bg-orange-950/20'
                }`}
              >
                {t(filter.labelKey)}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {visibleRecipes.map((recipe, idx) => {
              return (
                <article key={recipe.id || `${recipe.title}-${idx}`} className="ios-glass bg-white/70 dark:bg-zinc-900/50 rounded-3xl border border-zinc-150/60 dark:border-zinc-800/80 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => openRecipeDetail(recipe)}
                    className="block w-full text-left cursor-pointer group"
                  >
                    <RecipeVisual recipe={recipe} className="h-56 bg-orange-50 dark:bg-zinc-950/40 group-hover:scale-105 transition-transform duration-500" />

                    <div className="p-6">
                      <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300 font-medium">{buildRecipeSummary(recipe)}</p>
                      <p className="mt-4 text-sm font-bold text-orange-500 dark:text-orange-400 flex items-center gap-1">
                        {t('home_open_full_recipe')} &rarr;
                      </p>
                    </div>
                  </button>

                  <div className="px-6 pb-6">
                    <div className="flex justify-end border-t border-zinc-100 dark:border-zinc-850 pt-4">
                      <button
                        type="button"
                        onClick={() => handleToggleSaveRecipe(recipe)}
                        disabled={!recipe.id || savingRecipeId === recipe.id}
                        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs md:text-sm font-extrabold transition-all duration-200 ios-active-scale cursor-pointer disabled:opacity-50 ${recipe.id && savedRecipeIds.has(recipe.id) ? 'bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-orange-500 dark:hover:text-orange-400'}`}
                        title={t('home_save_recipe')}
                      >
                        {recipe.id && savedRecipeIds.has(recipe.id) ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                        {recipe.id && savedRecipeIds.has(recipe.id) ? t('home_saved') : t('home_save')}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          {visibleRecipes.length === 0 && (
            <div className="rounded-3xl ios-glass bg-white/60 dark:bg-zinc-900/40 p-12 text-center text-zinc-400 dark:text-zinc-500 font-medium">
              {t('home_no_category')}
            </div>
          )}
        </div>
      )}

      {/* Exploration Suggestions (Only visible when no recipes generated yet to fill empty space beautifully) */}
      {recipes.length === 0 && (
        <div className="max-w-5xl mx-auto px-4 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="text-orange-500" size={17} />
              <h3 className="text-xs font-extrabold text-zinc-400 dark:text-zinc-500 tracking-wider uppercase">{t('home_inspiration_title')}</h3>
            </div>
            <button
              type="button"
              onClick={handleShuffleInspirations}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-350 transition-colors ios-active-scale cursor-pointer"
            >
              <RotateCw size={13} className="hover:rotate-180 transition-transform duration-500" />
              <span>{t('home_inspiration_shuffle')}</span>
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {inspirations.map((item) => {
              const title = getInspirationTitle(item.key);
              const tags = getInspirationTags(item.key);

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setIngredientsTags(tags);
                  }}
                  className="ios-glass bg-white/60 dark:bg-zinc-900/40 border border-zinc-150/45 dark:border-zinc-800/80 p-4 rounded-2xl text-left hover:border-orange-500/30 dark:hover:border-orange-400/30 hover:bg-orange-50/15 dark:hover:bg-orange-950/10 transition-all duration-200 ios-active-scale cursor-pointer flex flex-col justify-between h-24 group shadow-sm"
                >
                  <span className="text-xl">{item.icon}</span>
                  <div>
                    <h4 className="font-extrabold text-zinc-800 dark:text-zinc-200 text-sm group-hover:text-orange-500 transition-colors">{title}</h4>
                    <p className="text-xs text-zinc-450 dark:text-zinc-500 mt-0.5 truncate">{tags.join(', ')}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Features Section (Hide if recipes generated to save vertical space) */}
      {recipes.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto px-4 pb-12">
          <div className="ios-glass bg-white/60 dark:bg-zinc-900/40 p-6 rounded-3xl border border-zinc-150/40 dark:border-zinc-800/80 flex items-start gap-4 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
            <div className="bg-orange-100 dark:bg-orange-950/60 p-3.5 rounded-2xl text-orange-500 dark:text-orange-400 shrink-0">
              <Sparkles size={22} />
            </div>
            <div>
              <h3 className="font-extrabold text-zinc-850 dark:text-zinc-100 text-base mb-1">{t('home_feature_ai_title')}</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed">{t('home_feature_ai_desc')}</p>
            </div>
          </div>

          <div className="ios-glass bg-white/60 dark:bg-zinc-900/40 p-6 rounded-3xl border border-zinc-150/40 dark:border-zinc-800/80 flex items-start gap-4 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
            <div className="bg-orange-100 dark:bg-orange-950/60 p-3.5 rounded-2xl text-orange-500 dark:text-orange-400 shrink-0">
              <Clock size={22} />
            </div>
            <div>
              <h3 className="font-extrabold text-zinc-850 dark:text-zinc-100 text-base mb-1">{t('home_feature_choice_title')}</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed">{t('home_feature_choice_desc')}</p>
            </div>
          </div>

          <div className="ios-glass bg-white/60 dark:bg-zinc-900/40 p-6 rounded-3xl border border-zinc-150/40 dark:border-zinc-800/80 flex items-start gap-4 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
            <div className="bg-orange-100 dark:bg-orange-950/60 p-3.5 rounded-2xl text-orange-500 dark:text-orange-400 shrink-0">
              <Flame size={22} />
            </div>
            <div>
              <h3 className="font-extrabold text-zinc-850 dark:text-zinc-100 text-base mb-1">{t('home_feature_skill_title')}</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed">{t('home_feature_skill_desc')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
