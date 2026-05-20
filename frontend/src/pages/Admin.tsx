import { useTranslation } from 'react-i18next';
import { Settings, Key, Image as ImageIcon, Upload, Link as LinkIcon, Cpu, User, Users, BarChart3, BookOpen, Trash2, UserPlus, Search, ClipboardList } from 'lucide-react';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import apiClient from '../api/client';
import { RecipeVisual, buildRecipeSummary } from '../utils/recipeImages';
import type { AppearanceSettings } from '../App';

interface AdminProps {
  isAuthenticated: boolean;
  userRole: string | null;
  appearance: AppearanceSettings;
  setAppearance: (settings: AppearanceSettings) => void;
}

interface AdminUser {
  id: number;
  username: string;
  role: string;
  created_at: string;
}

interface AdminRecipe {
  id: number;
  title: string;
  ingredients: string[];
  summary?: string;
  category?: string;
  instructions: string;
  image_prompt?: string;
  created_at: string;
  save_count: number;
}

interface UsageLog {
  id: number;
  actor_user_id?: number | null;
  actor_username?: string | null;
  actor_role?: string | null;
  action: string;
  target_type?: string | null;
  target_id?: string | null;
  message: string;
  metadata?: Record<string, unknown>;
  ip_address?: string | null;
  created_at: string;
}

type AdminSection = 'dashboard' | 'users' | 'logs' | 'account' | 'appearance' | 'ai';
type RecipeDeleteTarget =
  | { type: 'single'; id: number; title: string }
  | { type: 'bulk'; ids: number[] };
type UserDeleteTarget =
  | { type: 'single'; id: number; username: string }
  | { type: 'bulk'; ids: number[] };
type RecipeSortKey = 'newest' | 'oldest' | 'saves_desc' | 'saves_asc' | 'title';

export default function Admin({ isAuthenticated, userRole, appearance, setAppearance }: AdminProps) {
  const { t } = useTranslation();
  const [localAppearance, setLocalAppearance] = useState<AppearanceSettings>(appearance);
  const heroFileInputRef = useRef<HTMLInputElement>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const faviconFileInputRef = useRef<HTMLInputElement>(null);
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');

  // AI Configuration States
  const [channel, setChannel] = useState('mock');
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1');
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('gpt-3.5-turbo');

  // Fetch Models State
  const [customModels, setCustomModels] = useState<string[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isTestingModel, setIsTestingModel] = useState(false);
  const [modelTestResult, setModelTestResult] = useState('');
  const [isModelTestSuccess, setIsModelTestSuccess] = useState(false);

  // Password Change States
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Dashboard Stats State
  const [stats, setStats] = useState({ totalUsers: 0, totalRecipes: 0, totalSaves: 0 });
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [generatedRecipes, setGeneratedRecipes] = useState<AdminRecipe[]>([]);
  const [showGeneratedRecipes, setShowGeneratedRecipes] = useState(false);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(false);
  const [recipeSearch, setRecipeSearch] = useState('');
  const [recipeCategoryFilter, setRecipeCategoryFilter] = useState('all');
  const [recipeSort, setRecipeSort] = useState<RecipeSortKey>('newest');
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [usageLogAction, setUsageLogAction] = useState('all');
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'user' | 'admin'>('user');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [userDeleteTarget, setUserDeleteTarget] = useState<UserDeleteTarget | null>(null);
  const [isDeletingUsers, setIsDeletingUsers] = useState(false);
  const [deletingRecipeId, setDeletingRecipeId] = useState<number | null>(null);
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<number[]>([]);
  const [recipeDeleteTarget, setRecipeDeleteTarget] = useState<RecipeDeleteTarget | null>(null);
  const [isDeletingRecipes, setIsDeletingRecipes] = useState(false);

  const menuItems = [
    { key: 'dashboard' as const, label: t('admin_dashboard'), icon: BarChart3 },
    { key: 'users' as const, label: t('admin_users'), icon: Users },
    { key: 'logs' as const, label: t('admin_usage_logs'), icon: ClipboardList },
    { key: 'account' as const, label: t('admin_account'), icon: User },
    { key: 'appearance' as const, label: t('admin_appearance'), icon: ImageIcon },
    { key: 'ai' as const, label: t('admin_provider'), icon: Settings },
  ];
  const usageLogActionOptions = [
    { value: 'all', label: t('admin_log_filter_all') },
    { value: 'user.register', label: t('admin_log_action_user_register') },
    { value: 'user.login', label: t('admin_log_action_user_login') },
    { value: 'user.create', label: t('admin_log_action_user_create') },
    { value: 'user.delete', label: t('admin_log_action_user_delete') },
    { value: 'user.bulk_delete', label: t('admin_log_action_user_bulk_delete') },
    { value: 'user.password_update', label: t('admin_log_action_password_update') },
    { value: 'recipe.generate', label: t('admin_log_action_recipe_generate') },
    { value: 'recipe.random', label: t('admin_log_action_recipe_random') },
    { value: 'recipe.delete', label: t('admin_log_action_recipe_delete') },
    { value: 'recipe.bulk_delete', label: t('admin_log_action_recipe_bulk_delete') },
    { value: 'ai.test', label: t('admin_log_action_ai_test') },
    { value: 'settings.update', label: t('admin_log_action_settings_update') }
  ];

  useEffect(() => {
    if (!isAuthenticated || userRole !== 'admin') return;

    const fetchAdminData = async () => {
      setIsAdminLoading(true);
      setAdminError('');

      try {
        const [statsRes, settingsRes, usersRes] = await Promise.all([
          apiClient.get('/api/admin/stats'),
          apiClient.get('/api/admin/settings'),
          apiClient.get('/api/admin/users'),
        ]);

        if (statsRes.data) {
          setStats({
            totalUsers: statsRes.data.totalUsers || 0,
            totalRecipes: statsRes.data.totalRecipes || 0,
            totalSaves: statsRes.data.totalSaves || 0,
          });
        }

        if (settingsRes.data && settingsRes.data.settings) {
          const s = settingsRes.data.settings;
          const activeProvider = ['mock', 'openai', 'gemini'].includes(s.active_ai_provider)
            ? s.active_ai_provider
            : 'mock';
          setChannel(activeProvider);
          setLocalAppearance({
            brandName: s.app_brand_name || appearance.brandName,
            logoImage: s.app_logo_image || '',
            faviconImage: s.app_favicon_image || '',
            browserTitle: s.app_browser_title || s.app_brand_name || appearance.browserTitle,
            heroImage: s.app_hero_image || appearance.heroImage,
            heroTitle: s.app_hero_title || appearance.heroTitle,
            heroSubtitle: s.app_hero_subtitle || appearance.heroSubtitle,
            heroTitleEn: s.app_hero_title_en || appearance.heroTitleEn,
            heroSubtitleEn: s.app_hero_subtitle_en || appearance.heroSubtitleEn
          });
          if (activeProvider === 'openai') {
            setApiKey(s.openai_api_key || '');
            setBaseUrl(s.openai_base_url || 'https://api.openai.com/v1');
            setModelName(s.openai_model || '');
          } else if (activeProvider === 'gemini') {
            setApiKey(s.gemini_api_key || '');
            setBaseUrl(s.gemini_base_url || 'https://generativelanguage.googleapis.com/v1beta');
            setModelName(s.gemini_model || '');
          } else {
            setApiKey('');
            setBaseUrl('');
            setModelName('mock');
          }
        }

      if (usersRes.data && usersRes.data.users) {
        setUsers(usersRes.data.users);
        setSelectedUserIds((selected) => selected.filter((id) => usersRes.data.users.some((item: AdminUser) => item.id === id)));
      }
      } catch (err: any) {
        console.error('Failed to load admin data:', err);
        setAdminError(err.response?.data?.message || 'Failed to load admin data');
      } finally {
        setIsAdminLoading(false);
      }
    };

    fetchAdminData();
  }, [appearance.brandName, appearance.browserTitle, appearance.heroImage, isAuthenticated, userRole]);

  const buildAiSettingsPayload = () => {
    const settings: Record<string, string> = {
      active_ai_provider: channel
    };

    if (channel === 'openai') {
      settings.openai_api_key = apiKey;
      settings.openai_base_url = baseUrl;
      settings.openai_model = modelName;
    } else if (channel === 'gemini') {
      settings.gemini_api_key = apiKey;
      settings.gemini_base_url = baseUrl;
      settings.gemini_model = modelName;
    }

    settings.app_brand_name = localAppearance.brandName;
    settings.app_logo_image = localAppearance.logoImage;
    settings.app_favicon_image = localAppearance.faviconImage;
    settings.app_browser_title = localAppearance.browserTitle;
    settings.app_hero_image = localAppearance.heroImage;
    settings.app_hero_title = localAppearance.heroTitle;
    settings.app_hero_subtitle = localAppearance.heroSubtitle;
    settings.app_hero_title_en = localAppearance.heroTitleEn;
    settings.app_hero_subtitle_en = localAppearance.heroSubtitleEn;

    return settings;
  };

  const handleSaveSettings = async () => {
    setAppearance(localAppearance);
    
    try {
      const payload = {
        settings: buildAiSettingsPayload()
      };

      await apiClient.put('/api/admin/settings', payload);
      alert(t('admin_saved_toast'));
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to save settings');
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert(t('admin_password_mismatch'));
      return;
    }
    
    try {
      await apiClient.put('/api/auth/password', {
        oldPassword,
        newPassword
      });
      alert(t('admin_password_updated'));
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update password');
    }
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    key: 'heroImage' | 'logoImage' | 'faviconImage'
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setLocalAppearance((current) => ({
          ...current,
          [key]: base64String
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChannelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setChannel(val);
    setCustomModels([]); // Reset fetched models when channel changes
    setApiKey(''); // Clear key when switching to avoid saving wrong key to wrong provider
    if (val === 'openai') {
      setBaseUrl('https://api.openai.com/v1');
      setModelName('gpt-3.5-turbo');
    } else if (val === 'gemini') {
      setBaseUrl('https://generativelanguage.googleapis.com/v1beta');
      setModelName('gemini-1.5-flash');
    } else if (val === 'mock') {
      setBaseUrl('');
      setModelName('mock');
    }
  };

  const handleTestModel = async () => {
    setIsTestingModel(true);
    setModelTestResult('');
    setIsModelTestSuccess(false);

    try {
      const res = await apiClient.post('/api/admin/ai/test', {
        settings: buildAiSettingsPayload()
      });
      const recipeTitle = res.data?.recipe?.title ? `: ${res.data.recipe.title}` : '';
      setModelTestResult(t('admin_model_test_success', { recipeTitle }));
      setIsModelTestSuccess(true);
    } catch (err: any) {
      console.error(err);
      setModelTestResult(err.response?.data?.message || t('admin_model_test_failed'));
      setIsModelTestSuccess(false);
    } finally {
      setIsTestingModel(false);
    }
  };

  const refreshUsersAndStats = async () => {
    const [usersRes, statsRes] = await Promise.all([
      apiClient.get('/api/admin/users'),
      apiClient.get('/api/admin/stats'),
    ]);

    if (usersRes.data && usersRes.data.users) {
      setUsers(usersRes.data.users);
    }

    if (statsRes.data) {
      setStats({
        totalUsers: statsRes.data.totalUsers || 0,
        totalRecipes: statsRes.data.totalRecipes || 0,
        totalSaves: statsRes.data.totalSaves || 0,
      });
    }
  };

  const loadGeneratedRecipes = async () => {
    setIsLoadingRecipes(true);
    setAdminError('');

    try {
      const res = await apiClient.get('/api/admin/recipes');
      const recipes = res.data?.recipes || [];
      setGeneratedRecipes(recipes);
      setSelectedRecipeIds((selected) => selected.filter((id) => recipes.some((recipe: AdminRecipe) => recipe.id === id)));
    } catch (err: any) {
      console.error(err);
      setAdminError(err.response?.data?.message || t('admin_load_recipes_failed'));
    } finally {
      setIsLoadingRecipes(false);
    }
  };

  const loadUsageLogs = useCallback(async () => {
    setIsLoadingLogs(true);
    setAdminError('');

    try {
      const res = await apiClient.get('/api/admin/usage-logs', {
        params: {
          action: usageLogAction,
          limit: 100
        }
      });
      setUsageLogs(res.data?.logs || []);
    } catch (err: any) {
      console.error(err);
      setAdminError(err.response?.data?.message || t('admin_load_logs_failed'));
    } finally {
      setIsLoadingLogs(false);
    }
  }, [t, usageLogAction]);

  useEffect(() => {
    if (!isAuthenticated || userRole !== 'admin' || activeSection !== 'logs') {
      return;
    }

    loadUsageLogs();
  }, [activeSection, isAuthenticated, loadUsageLogs, userRole]);

  const handleToggleGeneratedRecipes = async () => {
    const nextVisible = !showGeneratedRecipes;
    setShowGeneratedRecipes(nextVisible);

    if (nextVisible && generatedRecipes.length === 0) {
      await loadGeneratedRecipes();
    }
  };

  const openRecipeDetail = (recipeId: number) => {
    window.open(`/recipes/${recipeId}`, '_blank', 'noopener,noreferrer');
  };

  const recipeCategories = useMemo(() => {
    return Array.from(new Set(generatedRecipes.map((recipe) => recipe.category).filter(Boolean) as string[]))
      .sort((a, b) => a.localeCompare(b));
  }, [generatedRecipes]);

  const filteredGeneratedRecipes = useMemo(() => {
    const keyword = recipeSearch.trim().toLowerCase();

    return generatedRecipes
      .filter((recipe) => {
        const matchesCategory = recipeCategoryFilter === 'all' || recipe.category === recipeCategoryFilter;
        const searchableText = [
          recipe.title,
          recipe.summary,
          recipe.category,
          recipe.ingredients?.join(' '),
          recipe.instructions
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return matchesCategory && (!keyword || searchableText.includes(keyword));
      })
      .sort((a, b) => {
        switch (recipeSort) {
          case 'oldest':
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          case 'saves_desc':
            return b.save_count - a.save_count;
          case 'saves_asc':
            return a.save_count - b.save_count;
          case 'title':
            return a.title.localeCompare(b.title);
          case 'newest':
          default:
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
      });
  }, [generatedRecipes, recipeCategoryFilter, recipeSearch, recipeSort]);

  const filteredRecipeIds = useMemo(
    () => filteredGeneratedRecipes.map((recipe) => recipe.id),
    [filteredGeneratedRecipes]
  );

  const selectedFilteredRecipeIds = selectedRecipeIds.filter((id) => filteredRecipeIds.includes(id));

  const toggleRecipeSelection = (recipeId: number) => {
    setSelectedRecipeIds((current) =>
      current.includes(recipeId) ? current.filter((id) => id !== recipeId) : [...current, recipeId]
    );
  };

  const toggleSelectAllRecipes = () => {
    if (filteredRecipeIds.length === 0) {
      return;
    }

    if (selectedFilteredRecipeIds.length === filteredRecipeIds.length) {
      setSelectedRecipeIds((current) => current.filter((id) => !filteredRecipeIds.includes(id)));
      return;
    }

    setSelectedRecipeIds((current) => Array.from(new Set([...current, ...filteredRecipeIds])));
  };

  const openDeleteRecipeDialog = (recipeId: number, title: string) => {
    setRecipeDeleteTarget({ type: 'single', id: recipeId, title });
  };

  const openBulkDeleteRecipesDialog = () => {
    if (selectedRecipeIds.length === 0) {
      return;
    }

    setRecipeDeleteTarget({ type: 'bulk', ids: selectedRecipeIds });
  };

  const handleConfirmDeleteRecipes = async () => {
    if (!recipeDeleteTarget) {
      return;
    }

    const ids = recipeDeleteTarget.type === 'single'
      ? [recipeDeleteTarget.id]
      : recipeDeleteTarget.ids;

    setDeletingRecipeId(recipeDeleteTarget.type === 'single' ? recipeDeleteTarget.id : null);
    setIsDeletingRecipes(true);
    setAdminError('');

    try {
      if (recipeDeleteTarget.type === 'single') {
        await apiClient.delete(`/api/admin/recipes/${recipeDeleteTarget.id}`);
      } else {
        await apiClient.post('/api/admin/recipes/bulk-delete', {
          ids
        });
      }

      setGeneratedRecipes((current) => current.filter((recipe) => !ids.includes(recipe.id)));
      setSelectedRecipeIds((current) => current.filter((id) => !ids.includes(id)));
      setStats((current) => ({
        ...current,
        totalRecipes: Math.max(0, current.totalRecipes - ids.length)
      }));
      setRecipeDeleteTarget(null);
    } catch (err: any) {
      console.error(err);
      setAdminError(err.response?.data?.message || t('admin_delete_recipe_failed'));
    } finally {
      setDeletingRecipeId(null);
      setIsDeletingRecipes(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingUser(true);
    setAdminError('');

    try {
      await apiClient.post('/api/admin/users', {
        username: newUsername,
        password: newUserPassword,
        role: newUserRole,
      });

      setNewUsername('');
      setNewUserPassword('');
      setNewUserRole('user');
      setShowCreateUserForm(false);
      await refreshUsersAndStats();
      alert(t('admin_user_created'));
    } catch (err: any) {
      console.error(err);
      setAdminError(err.response?.data?.message || t('admin_create_user_failed'));
    } finally {
      setIsCreatingUser(false);
    }
  };

  const deletableUsers = users.filter((item) => item.role !== 'admin');
  const selectedDeletableIds = selectedUserIds.filter((id) =>
    deletableUsers.some((item) => item.id === id)
  );

  const toggleUserSelection = (id: number) => {
    setSelectedUserIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const toggleSelectAllUsers = () => {
    if (selectedDeletableIds.length === deletableUsers.length) {
      setSelectedUserIds([]);
      return;
    }

    setSelectedUserIds(deletableUsers.map((item) => item.id));
  };

  const handleDeleteUser = (id: number, username: string) => {
    setUserDeleteTarget({ type: 'single', id, username });
  };

  const handleBulkDeleteUsers = () => {
    if (selectedDeletableIds.length === 0) {
      return;
    }

    setUserDeleteTarget({ type: 'bulk', ids: selectedDeletableIds });
  };

  const handleConfirmDeleteUsers = async () => {
    if (!userDeleteTarget) {
      return;
    }

    const ids = userDeleteTarget.type === 'single' ? [userDeleteTarget.id] : userDeleteTarget.ids;

    setIsDeletingUsers(true);
    setAdminError('');

    try {
      if (userDeleteTarget.type === 'single') {
        await apiClient.delete(`/api/admin/users/${userDeleteTarget.id}`);
        alert(t('admin_user_deleted'));
      } else {
        await apiClient.post('/api/admin/users/bulk-delete', {
          ids,
        });
        setSelectedUserIds([]);
        alert(t('admin_bulk_delete_success'));
      }

      await refreshUsersAndStats();
      setUserDeleteTarget(null);
    } catch (err: any) {
      console.error(err);
      setAdminError(err.response?.data?.message || (
        userDeleteTarget.type === 'single' ? t('admin_delete_user_failed') : t('admin_bulk_delete_failed')
      ));
    } finally {
      setIsDeletingUsers(false);
    }
  };

  const handleFetchModels = async () => {
    if (!baseUrl || !apiKey) {
      alert(t('admin_fetch_error'));
      return;
    }
    
    setIsFetching(true);
    try {
      const cleanBaseUrl = baseUrl.replace(/\/chat\/completions$/, '').replace(/\/$/, '');
      const response = await axios.get(`${cleanBaseUrl}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });

      if (response.data && response.data.data) {
        const models = response.data.data.map((m: any) => m.id);
        setCustomModels(models);
        if (models.length > 0) {
          setModelName(models[0]);
        }
        alert(t('admin_fetch_success'));
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Failed to fetch models", error);
      alert(t('admin_fetch_error'));
    } finally {
      setIsFetching(false);
    }
  };

  const recipeDeleteCount = recipeDeleteTarget?.type === 'single'
    ? 1
    : recipeDeleteTarget?.ids.length || 0;
  const userDeleteCount = userDeleteTarget?.type === 'single'
    ? 1
    : userDeleteTarget?.ids.length || 0;

  if (!isAuthenticated || userRole !== 'admin') {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100">
          <p className="text-lg font-medium">{t('admin_unauthorized')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('admin_title')}</h1>
      </div>

      {adminError && (
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl border border-red-100">
          {adminError}
        </div>
      )}

      {isAdminLoading && (
        <div className="bg-white text-gray-500 p-4 rounded-2xl border border-gray-100">
          {t('admin_loading_data')}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 items-start">
        <aside className="bg-white rounded-2xl shadow-sm border border-gray-200 p-3 lg:sticky lg:top-24">
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveSection(item.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-medium transition-colors ${
                    isActive
                      ? 'bg-orange-50 text-orange-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="space-y-8 min-w-0">
          {activeSection === 'dashboard' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-4">
                  <div className="bg-blue-100 p-3 rounded-xl text-blue-600">
                    <Users size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">{t('admin_total_users')}</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleGeneratedRecipes}
                  className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-4 text-left transition-colors hover:border-green-300 hover:bg-green-50/30 focus:outline-none focus:ring-2 focus:ring-green-200"
                >
                  <div className="bg-green-100 p-3 rounded-xl text-green-600">
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">{t('admin_total_recipes')}</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalRecipes}</p>
                    <p className="mt-1 text-xs text-green-700">{showGeneratedRecipes ? t('admin_collapse_recipes') : t('admin_view_recipes')}</p>
                  </div>
                </button>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-4">
                  <div className="bg-purple-100 p-3 rounded-xl text-purple-600">
                    <BarChart3 size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">{t('admin_total_saves')}</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalSaves}</p>
                  </div>
                </div>
              </div>
              {showGeneratedRecipes && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      <BookOpen className="text-green-600" />
                      <div>
                        <h2 className="text-xl font-semibold text-gray-800">{t('admin_generated_recipes')}</h2>
                        <p className="text-sm text-gray-500">{t('admin_generated_recipes_desc')}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={openBulkDeleteRecipesDialog}
                        disabled={selectedRecipeIds.length === 0 || isDeletingRecipes}
                        className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:hover:bg-white"
                      >
                        <Trash2 size={16} />
                        {t('admin_bulk_delete')}{selectedRecipeIds.length > 0 ? ` (${selectedRecipeIds.length})` : ''}
                      </button>
                      <button
                        type="button"
                        onClick={loadGeneratedRecipes}
                        disabled={isLoadingRecipes}
                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {isLoadingRecipes ? t('admin_refreshing') : t('admin_refresh_list')}
                      </button>
                    </div>
                  </div>

                  <div className="p-6">
                    {isLoadingRecipes ? (
                      <div className="text-center text-gray-500 py-8">{t('admin_loading_recipes')}</div>
                    ) : generatedRecipes.length === 0 ? (
                      <div className="text-center text-gray-400 py-8">{t('admin_no_recipes')}</div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_180px_180px]">
                          <label className="relative block">
                            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                            <input
                              type="search"
                              value={recipeSearch}
                              onChange={(e) => setRecipeSearch(e.target.value)}
                              placeholder={t('admin_recipe_search_placeholder')}
                              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-700 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                            />
                          </label>
                          <select
                            value={recipeCategoryFilter}
                            onChange={(e) => setRecipeCategoryFilter(e.target.value)}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                            aria-label={t('admin_recipe_filter_category')}
                          >
                            <option value="all">{t('admin_recipe_filter_all')}</option>
                            {recipeCategories.map((category) => (
                              <option key={category} value={category}>{category}</option>
                            ))}
                          </select>
                          <select
                            value={recipeSort}
                            onChange={(e) => setRecipeSort(e.target.value as RecipeSortKey)}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                            aria-label={t('admin_recipe_sort')}
                          >
                            <option value="newest">{t('admin_recipe_sort_newest')}</option>
                            <option value="oldest">{t('admin_recipe_sort_oldest')}</option>
                            <option value="saves_desc">{t('admin_recipe_sort_saves_desc')}</option>
                            <option value="saves_asc">{t('admin_recipe_sort_saves_asc')}</option>
                            <option value="title">{t('admin_recipe_sort_title')}</option>
                          </select>
                        </div>
                        {filteredGeneratedRecipes.length === 0 && (
                          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                            {t('admin_recipe_no_filter_results')}
                          </div>
                        )}
                        <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-600">
                          <input
                            type="checkbox"
                            checked={filteredRecipeIds.length > 0 && selectedFilteredRecipeIds.length === filteredRecipeIds.length}
                            onChange={toggleSelectAllRecipes}
                            disabled={filteredRecipeIds.length === 0}
                            className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                          />
                          {t('admin_select_current_list')}{selectedFilteredRecipeIds.length > 0 ? ` (${selectedFilteredRecipeIds.length}/${filteredRecipeIds.length})` : ''}
                        </label>
                        {filteredGeneratedRecipes.map((recipe) => {
                          return (
                            <article key={recipe.id} className="overflow-hidden rounded-xl border border-gray-200">
                              <div className="grid grid-cols-1 md:grid-cols-[44px_180px_1fr]">
                                <div className="flex items-start justify-center bg-gray-50 p-4 md:pt-5">
                                  <input
                                    type="checkbox"
                                    checked={selectedRecipeIds.includes(recipe.id)}
                                    onChange={() => toggleRecipeSelection(recipe.id)}
                                    className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                                    aria-label={t('admin_select_recipe', { title: recipe.title })}
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => openRecipeDetail(recipe.id)}
                                  className="text-left"
                                >
                                  <RecipeVisual recipe={recipe} className="h-40 bg-green-50 md:h-full" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openRecipeDetail(recipe.id)}
                                  className="p-5 text-left"
                                >
                                  <h3 className="text-lg font-semibold text-gray-900">{recipe.title}</h3>
                                  <p className="mt-1 text-xs text-gray-500">
                                    {t('admin_recipe_meta', {
                                      id: recipe.id,
                                      createdAt: new Date(recipe.created_at).toLocaleString(),
                                      saveCount: recipe.save_count
                                    })}
                                  </p>
                                  <p className="mt-3 text-sm leading-6 text-gray-600">{buildRecipeSummary(recipe)}</p>
                                  <p className="mt-3 text-sm font-medium text-green-700">{t('admin_open_full_recipe')}</p>
                                </button>
                              </div>
                              <div className="flex justify-end border-t border-gray-100 bg-gray-50 px-5 py-3">
                                <button
                                  type="button"
                                  onClick={() => openDeleteRecipeDialog(recipe.id, recipe.title)}
                                  disabled={deletingRecipeId === recipe.id || isDeletingRecipes}
                                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                                >
                                  <Trash2 size={15} />
                                  {deletingRecipeId === recipe.id ? t('admin_deleting') : t('admin_delete_recipe')}
                                </button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {activeSection === 'users' && (
            <>
              {/* User Management */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="text-gray-400" />
                    <h2 className="text-xl font-semibold text-gray-800">{t('admin_users')}</h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleBulkDeleteUsers}
                      disabled={selectedDeletableIds.length === 0 || isDeletingUsers}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      <Trash2 size={16} />
                      {t('admin_bulk_delete')}{selectedDeletableIds.length > 0 ? ` (${selectedDeletableIds.length})` : ''}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateUserForm((value) => !value)}
                      className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
                    >
                      <UserPlus size={17} />
                      {showCreateUserForm ? t('admin_collapse_form') : t('admin_add_user')}
                    </button>
                  </div>
                </div>
                {showCreateUserForm && (
                <form onSubmit={handleCreateUser} className="p-6 border-b border-gray-100 bg-orange-50/40">
                  <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <UserPlus size={18} className="text-orange-500" />
                    {t('admin_add_user')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      type="text"
                      required
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder={t('admin_username_placeholder')}
                      className="px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder={t('admin_password_placeholder')}
                      className="px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as 'user' | 'admin')}
                      className="px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                    >
                      <option value="user">{t('admin_role_user')}</option>
                      <option value="admin">{t('admin_role_admin')}</option>
                    </select>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={isCreatingUser}
                      className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-lg transition-colors shadow-sm"
                    >
                      <UserPlus size={17} />
                      {isCreatingUser ? t('admin_creating') : t('admin_confirm_add_user')}
                    </button>
                  </div>
                </form>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500">
                      <tr>
                        <th className="text-left font-medium px-6 py-3 w-12">
                          <input
                            type="checkbox"
                            checked={deletableUsers.length > 0 && selectedDeletableIds.length === deletableUsers.length}
                            onChange={toggleSelectAllUsers}
                            className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                          />
                        </th>
                        <th className="text-left font-medium px-6 py-3">{t('admin_table_id')}</th>
                        <th className="text-left font-medium px-6 py-3">{t('admin_table_username')}</th>
                        <th className="text-left font-medium px-6 py-3">{t('admin_table_role')}</th>
                        <th className="text-left font-medium px-6 py-3">{t('admin_table_created_at')}</th>
                        <th className="text-right font-medium px-6 py-3">{t('admin_table_actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {users.map((item) => (
                        <tr key={item.id}>
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              disabled={item.role === 'admin'}
                              checked={selectedUserIds.includes(item.id)}
                              onChange={() => toggleUserSelection(item.id)}
                              className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500 disabled:opacity-30"
                            />
                          </td>
                          <td className="px-6 py-4 text-gray-500">{item.id}</td>
                          <td className="px-6 py-4 font-medium text-gray-900">{item.username}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${item.role === 'admin' ? 'bg-orange-50 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                              {item.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-500">{new Date(item.created_at).toLocaleString()}</td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              disabled={item.role === 'admin' || isDeletingUsers}
                              onClick={() => handleDeleteUser(item.id, item.username)}
                              className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:text-gray-300 disabled:hover:bg-transparent"
                            >
                              <Trash2 size={15} />
                              {t('admin_delete')}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                            {t('admin_no_users')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeSection === 'logs' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <ClipboardList className="text-gray-400" />
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800">{t('admin_usage_logs')}</h2>
                    <p className="text-sm text-gray-500">{t('admin_usage_logs_desc')}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <select
                    value={usageLogAction}
                    onChange={(e) => setUsageLogAction(e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                    aria-label={t('admin_log_filter_action')}
                  >
                    {usageLogActionOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={loadUsageLogs}
                    disabled={isLoadingLogs}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {isLoadingLogs ? t('admin_refreshing') : t('admin_refresh_list')}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="text-left font-medium px-6 py-3">{t('admin_log_time')}</th>
                      <th className="text-left font-medium px-6 py-3">{t('admin_log_action')}</th>
                      <th className="text-left font-medium px-6 py-3">{t('admin_log_actor')}</th>
                      <th className="text-left font-medium px-6 py-3">{t('admin_log_target')}</th>
                      <th className="text-left font-medium px-6 py-3">{t('admin_log_ip')}</th>
                      <th className="text-left font-medium px-6 py-3">{t('admin_log_message')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isLoadingLogs ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                          {t('admin_loading_logs')}
                        </td>
                      </tr>
                    ) : usageLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                          {t('admin_no_logs')}
                        </td>
                      </tr>
                    ) : usageLogs.map((log) => {
                      const actionLabel = usageLogActionOptions.find((option) => option.value === log.action)?.label || log.action;
                      const actor = log.actor_username
                        ? `${log.actor_username}${log.actor_role ? ` (${log.actor_role})` : ''}`
                        : t('admin_log_guest');
                      const target = [log.target_type, log.target_id].filter(Boolean).join(' #') || '-';

                      return (
                        <tr key={log.id} className="align-top">
                          <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700">
                              {actionLabel}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-700">{actor}</td>
                          <td className="px-6 py-4 font-mono text-xs text-gray-500">{target}</td>
                          <td className="px-6 py-4 font-mono text-xs text-gray-500">{log.ip_address || '-'}</td>
                          <td className="min-w-64 px-6 py-4 text-gray-700">{log.message}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeSection === 'account' && (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
          <User className="text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-800">{t('admin_account')}</h2>
        </div>
        <div className="p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-4">{t('admin_change_password')}</h3>
          <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
            <div>
              <input 
                type="password" 
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder={t('admin_old_password')}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
            <div>
              <input 
                type="password" 
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('admin_new_password')}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
            <div>
              <input 
                type="password" 
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('admin_confirm_password')}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
            <button 
              type="submit" 
              className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              {t('admin_update_password')}
            </button>
          </form>
        </div>
      </div>
          )}

      {/* Appearance Settings */}
          {activeSection === 'appearance' && (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
          <ImageIcon className="text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-800">{t('admin_appearance')}</h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin_brand_name')}</label>
              <input
                type="text"
                value={localAppearance.brandName}
                onChange={(e) => setLocalAppearance((current) => ({ ...current, brandName: e.target.value }))}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin_browser_title')}</label>
              <input
                type="text"
                value={localAppearance.browserTitle}
                onChange={(e) => setLocalAppearance((current) => ({ ...current, browserTitle: e.target.value }))}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin_hero_title_zh')}</label>
              <input
                type="text"
                value={localAppearance.heroTitle || ''}
                onChange={(e) => setLocalAppearance((current) => ({ ...current, heroTitle: e.target.value }))}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin_hero_subtitle_zh')}</label>
              <input
                type="text"
                value={localAppearance.heroSubtitle || ''}
                onChange={(e) => setLocalAppearance((current) => ({ ...current, heroSubtitle: e.target.value }))}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin_hero_title_en')}</label>
              <input
                type="text"
                value={localAppearance.heroTitleEn || ''}
                onChange={(e) => setLocalAppearance((current) => ({ ...current, heroTitleEn: e.target.value }))}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin_hero_subtitle_en')}</label>
              <input
                type="text"
                value={localAppearance.heroSubtitleEn || ''}
                onChange={(e) => setLocalAppearance((current) => ({ ...current, heroSubtitleEn: e.target.value }))}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin_logo_image')}</label>
              <div className="mb-4 flex h-24 items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
                {localAppearance.logoImage ? (
                  <img src={localAppearance.logoImage} alt={localAppearance.brandName} className="h-16 w-16 rounded-xl object-cover" />
                ) : (
                  <ImageIcon className="text-gray-300" size={32} />
                )}
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  value={localAppearance.logoImage}
                  onChange={(e) => setLocalAppearance((current) => ({ ...current, logoImage: e.target.value }))}
                  placeholder={t('admin_image_url_placeholder')}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
                />
                <input
                  type="file"
                  accept="image/*"
                  ref={logoFileInputRef}
                  className="hidden"
                  onChange={(e) => handleImageUpload(e, 'logoImage')}
                />
                <button
                  type="button"
                  onClick={() => logoFileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
                >
                  <Upload size={16} /> {t('admin_choose_image')}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin_favicon_image')}</label>
              <div className="mb-4 flex h-24 items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
                {localAppearance.faviconImage ? (
                  <img src={localAppearance.faviconImage} alt={t('admin_favicon_image')} className="h-12 w-12 rounded-lg object-cover" />
                ) : (
                  <ImageIcon className="text-gray-300" size={32} />
                )}
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  value={localAppearance.faviconImage}
                  onChange={(e) => setLocalAppearance((current) => ({ ...current, faviconImage: e.target.value }))}
                  placeholder={t('admin_image_url_placeholder')}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
                />
                <input
                  type="file"
                  accept="image/*"
                  ref={faviconFileInputRef}
                  className="hidden"
                  onChange={(e) => handleImageUpload(e, 'faviconImage')}
                />
                <button
                  type="button"
                  onClick={() => faviconFileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
                >
                  <Upload size={16} /> {t('admin_choose_image')}
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin_hero_image')}</label>
            
            {/* Preview */}
            <div 
              className="w-full h-48 rounded-xl bg-gray-100 mb-4 border border-gray-200 overflow-hidden bg-cover bg-center"
              style={{ backgroundImage: `url(${localAppearance.heroImage})` }}
            ></div>

            <div className="space-y-4">
              {/* URL Input */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">{t('admin_hero_url')}</label>
                <input 
                  type="text" 
                  value={localAppearance.heroImage}
                  onChange={(e) => setLocalAppearance((current) => ({ ...current, heroImage: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">{t('admin_hero_upload')}</label>
                <input 
                  type="file" 
                  accept="image/*"
                  ref={heroFileInputRef}
                  className="hidden"
                  onChange={(e) => handleImageUpload(e, 'heroImage')}
                />
                <button 
                  type="button"
                  onClick={() => heroFileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
                >
                  <Upload size={16} /> {t('admin_choose_image')}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={handleSaveSettings}
            className="bg-gray-900 hover:bg-gray-800 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            {t('admin_save')}
          </button>
        </div>
      </div>
          )}

      {/* API Provider Settings */}
          {activeSection === 'ai' && (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
          <Settings className="text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-800">{t('admin_provider')}</h2>
        </div>
        <div className="p-6 space-y-8">
          
          {/* Channel / Provider */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Cpu size={16} /> {t('admin_channel')}
            </label>
            <select 
              value={channel}
              onChange={handleChannelChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none bg-white"
            >
              <option value="mock">{t('admin_mock_local')}</option>
              <option value="openai">OpenAI</option>
              <option value="gemini">Google Gemini</option>
            </select>
          </div>

          {/* Base URL */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <LinkIcon size={16} /> {t('admin_base_url')}
            </label>
            <input 
              type="text" 
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              disabled={channel === 'mock'}
              placeholder="https://api.openai.com/v1"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none font-mono text-sm disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>

          {/* API Key */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Key size={16} /> {t('admin_api_key')}
            </label>
            <input 
              type="password" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={channel === 'mock'}
              placeholder="sk-..."
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none font-mono disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>

          {/* Model Name */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Cpu size={16} /> {t('admin_model')}
              </label>
              {channel !== 'mock' && (
                <button
                  onClick={handleFetchModels}
                  disabled={isFetching}
                  className="text-xs bg-orange-100 text-orange-700 hover:bg-orange-200 px-3 py-1.5 rounded-md font-medium transition-colors disabled:opacity-50"
                >
                  {isFetching ? t('admin_fetching') : t('admin_fetch_models')}
                </button>
              )}
            </div>
            {channel === 'mock' ? (
              <input
                type="text"
                value="mock"
                disabled
                className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none bg-gray-50 text-gray-400 font-mono text-sm"
              />
            ) : customModels.length > 0 ? (
              <select 
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none bg-white"
              >
                {customModels.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            ) : modelName ? (
              <div className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700">
                {t('admin_current_model')}<span className="font-mono font-medium">{modelName}</span>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-500">
                {t('admin_no_models')}
              </div>
            )}
            <p className="mt-2 text-xs text-gray-500">
              {channel !== 'mock' && customModels.length > 0 
                ? t('admin_models_loaded')
                : channel === 'mock'
                  ? t('admin_mock_no_model')
                  : modelName
                    ? t('admin_model_restored')
                    : t('admin_model_fetch_hint')}
            </p>
          </div>

        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
          {modelTestResult && (
            <div className={`md:mr-auto text-sm ${isModelTestSuccess ? 'text-green-600' : 'text-red-600'}`}>
              {modelTestResult}
            </div>
          )}
          <button
            type="button"
            onClick={handleTestModel}
            disabled={isTestingModel}
            className="bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-700 font-medium py-2 px-6 rounded-lg transition-colors"
          >
            {isTestingModel ? t('admin_testing') : t('admin_test_model')}
          </button>
          <button 
            onClick={handleSaveSettings}
            className="bg-gray-900 hover:bg-gray-800 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            {t('admin_save')}
          </button>
        </div>
      </div>
          )}
        </div>
      </div>
      {recipeDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-100">
            <div className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{t('admin_confirm_delete_recipe_title')}</h2>
                  <p className="text-sm text-gray-500">{t('admin_confirm_delete_recipe_desc')}</p>
                </div>
              </div>
              <p className="text-sm leading-6 text-gray-600">
                {recipeDeleteTarget.type === 'single'
                  ? t('admin_confirm_delete_recipe', { title: recipeDeleteTarget.title })
                  : t('admin_confirm_delete_recipes', { count: recipeDeleteCount })}
              </p>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setRecipeDeleteTarget(null)}
                disabled={isDeletingRecipes}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {t('admin_cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteRecipes}
                disabled={isDeletingRecipes}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 size={16} />
                {isDeletingRecipes ? t('admin_deleting') : `${t('admin_confirm_delete')}${recipeDeleteCount > 1 ? ` (${recipeDeleteCount})` : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
      {userDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-100">
            <div className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{t('admin_confirm_delete_user_title')}</h2>
                  <p className="text-sm text-gray-500">{t('admin_confirm_delete_user_desc')}</p>
                </div>
              </div>
              <p className="text-sm leading-6 text-gray-600">
                {userDeleteTarget.type === 'single'
                  ? t('admin_delete_user_confirm', { username: userDeleteTarget.username })
                  : t('admin_bulk_delete_users_confirm', { count: userDeleteCount })}
              </p>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setUserDeleteTarget(null)}
                disabled={isDeletingUsers}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {t('admin_cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUsers}
                disabled={isDeletingUsers}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 size={16} />
                {isDeletingUsers ? t('admin_deleting') : `${t('admin_confirm_delete')}${userDeleteCount > 1 ? ` (${userDeleteCount})` : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
