import { BrowserRouter as Router, Routes, Route, Link, NavLink } from 'react-router-dom';
import { ChefHat, Utensils, Library, Settings, Globe, User, Menu, X, ShoppingCart, Sun, Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';

import Home from './pages/Home';
import Auth from './pages/Auth';
import Collection from './pages/Collection';
import Admin from './pages/Admin';
import RecipeDetail from './pages/RecipeDetail';
import ShoppingList from './pages/ShoppingList';
import apiClient from './api/client';

const DEFAULT_HERO_IMAGE = "https://images.unsplash.com/photo-1495521821757-a1efb6729352?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80";
const DEFAULT_BRAND_NAME = '智能食谱';
const DEFAULT_BROWSER_TITLE = '智能食谱';
const DEFAULT_HERO_TITLE = '探索美食的无限可能';
const DEFAULT_HERO_SUBTITLE = '输入现有食材，AI 为你智能搭配菜谱、规划步骤，并自动整理采购清单。';
const DEFAULT_HERO_TITLE_EN = 'Discover Endless Culinary Possibilities';
const DEFAULT_HERO_SUBTITLE_EN = 'Enter your ingredients, and AI will intelligently pair recipes, plan each step, and organize your shopping list.';

export interface AppearanceSettings {
  brandName: string;
  logoImage: string;
  faviconImage: string;
  browserTitle: string;
  heroImage: string;
  heroTitle: string;
  heroSubtitle: string;
  heroTitleEn: string;
  heroSubtitleEn: string;
}

function App() {
  const { t, i18n } = useTranslation();

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);
  
  const [appearance, setAppearance] = useState<AppearanceSettings>({
    brandName: DEFAULT_BRAND_NAME,
    logoImage: '',
    faviconImage: '',
    browserTitle: DEFAULT_BROWSER_TITLE,
    heroImage: DEFAULT_HERO_IMAGE,
    heroTitle: DEFAULT_HERO_TITLE,
    heroSubtitle: DEFAULT_HERO_SUBTITLE,
    heroTitleEn: DEFAULT_HERO_TITLE_EN,
    heroSubtitleEn: DEFAULT_HERO_SUBTITLE_EN
  });

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Check initial auth state
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (token) {
      setIsAuthenticated(true);
      setUserRole(role);
    }

    // Listen for auth expiration
    const handleAuthExpired = () => {
      setIsAuthenticated(false);
      setUserRole(null);
    };
    window.addEventListener('auth_expired', handleAuthExpired);

    const loadAppearance = async () => {
      try {
        const res = await apiClient.get('/api/settings/appearance');
        const remoteAppearance = res.data?.appearance || {};

        setAppearance({
          brandName: remoteAppearance.app_brand_name || DEFAULT_BRAND_NAME,
          logoImage: remoteAppearance.app_logo_image || '',
          faviconImage: remoteAppearance.app_favicon_image || '',
          browserTitle: remoteAppearance.app_browser_title || remoteAppearance.app_brand_name || DEFAULT_BROWSER_TITLE,
          heroImage: remoteAppearance.app_hero_image || DEFAULT_HERO_IMAGE,
          heroTitle: remoteAppearance.app_hero_title || DEFAULT_HERO_TITLE,
          heroSubtitle: remoteAppearance.app_hero_subtitle || DEFAULT_HERO_SUBTITLE,
          heroTitleEn: remoteAppearance.app_hero_title_en || DEFAULT_HERO_TITLE_EN,
          heroSubtitleEn: remoteAppearance.app_hero_subtitle_en || DEFAULT_HERO_SUBTITLE_EN
        });
      } catch {
        const savedImage = localStorage.getItem('app_hero_image');
        if (savedImage) {
          setAppearance((current) => ({
            ...current,
            heroImage: savedImage
          }));
        }
      }
    };

    loadAppearance();

    return () => {
      window.removeEventListener('auth_expired', handleAuthExpired);
    };
  }, []);

  useEffect(() => {
    document.title = appearance.browserTitle || appearance.brandName || DEFAULT_BROWSER_TITLE;

    const favicon = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (favicon && appearance.faviconImage) {
      favicon.href = appearance.faviconImage;
    }
  }, [appearance.browserTitle, appearance.brandName, appearance.faviconImage]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    setIsAuthenticated(false);
    setUserRole(null);
    setIsMobileMenuOpen(false);
  };

  const updateAppearance = (newAppearance: AppearanceSettings) => {
    setAppearance(newAppearance);
    localStorage.setItem('app_hero_image', newAppearance.heroImage);
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(newLang);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const getLinkClass = ({ isActive }: { isActive: boolean }) => 
    `font-semibold flex items-center gap-2 transition-all duration-200 text-sm px-3.5 py-1.5 rounded-full ${
      isActive 
        ? 'bg-orange-500/10 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 font-bold border border-orange-500/15' 
        : 'text-zinc-650 dark:text-zinc-300 hover:text-orange-500 dark:hover:text-orange-400 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40 border border-transparent'
    }`;

  const navLinks = (
    <>
      <NavLink to="/" onClick={closeMobileMenu} className={getLinkClass}>
        <Utensils size={17} /> {t('nav_generate')}
      </NavLink>
      <NavLink to="/collection" onClick={closeMobileMenu} className={getLinkClass}>
        <Library size={17} /> {t('nav_collection')}
      </NavLink>
      <NavLink to="/shopping-list" onClick={closeMobileMenu} className={getLinkClass}>
        <ShoppingCart size={17} /> {t('nav_shopping')}
      </NavLink>
      {userRole === 'admin' && (
        <NavLink to="/admin" onClick={closeMobileMenu} className={getLinkClass}>
          <Settings size={17} /> {t('nav_admin')}
        </NavLink>
      )}
    </>
  );

  const authAction = isAuthenticated ? (
    <button
      onClick={handleLogout}
      className="text-gray-600 dark:text-zinc-300 hover:text-red-500 dark:hover:text-red-400 font-semibold flex items-center gap-2 transition-colors text-sm"
    >
      {t('nav_logout')}
    </button>
  ) : (
    <Link to="/auth" onClick={closeMobileMenu} className="bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-900/40 text-orange-600 dark:text-orange-400 font-semibold px-4 py-2 rounded-full flex items-center gap-2 transition-all duration-200 ios-active-scale text-sm">
      <User size={18} /> {t('nav_login')}
    </Link>
  );

  return (
    <Router>
      <div className="min-h-screen bg-[var(--ios-bg)] text-[var(--ios-text)] flex flex-col font-sans transition-colors duration-200">
        {/* Navigation Bar */}
        <nav className="ios-glass bg-white/70 dark:bg-zinc-900/60 sticky top-0 z-50 shadow-sm border-b dark:border-zinc-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <Link to="/" onClick={closeMobileMenu} className="flex min-w-0 items-center gap-2.5">
                {appearance.logoImage ? (
                  <img src={appearance.logoImage} alt={appearance.brandName} className="h-9 w-9 rounded-xl object-cover" />
                ) : (
                  <ChefHat className="text-orange-500 dark:text-orange-400" size={32} />
                )}
                <span className="truncate font-extrabold text-xl tracking-tight text-zinc-950 dark:text-white sm:text-2xl font-sans">{appearance.brandName || t('app_name')}</span>
              </Link>
              <div className="hidden items-center space-x-5 md:flex">
                {navLinks}
                
                <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-800 mx-1"></div>

                {authAction}

                {/* Dark Mode Toggle */}
                <button
                  onClick={() => setIsDarkMode(prev => !prev)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200 ios-active-scale"
                  title="切换外观"
                >
                  {isDarkMode ? <Sun size={18} className="text-orange-400" /> : <Moon size={18} />}
                </button>

                {/* Language Toggle */}
                <button 
                  onClick={toggleLanguage} 
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200 ios-active-scale"
                  title={t('lang_switch_tooltip')}
                >
                  <Globe size={16} />
                  <span className="text-xs font-extrabold tracking-wider">{i18n.language === 'zh' ? 'EN' : '中'}</span>
                </button>
              </div>
              <div className="flex items-center gap-2 md:hidden">
                <button
                  onClick={() => setIsDarkMode(prev => !prev)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  {isDarkMode ? <Sun size={18} className="text-orange-400" /> : <Moon size={18} />}
                </button>
                <button
                  onClick={toggleLanguage}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  title={t('lang_switch_tooltip')}
                  aria-label={t('lang_switch_tooltip')}
                >
                  <Globe size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen((value) => !value)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  aria-label={isMobileMenuOpen ? t('nav_close_menu') : t('nav_open_menu')}
                  aria-expanded={isMobileMenuOpen}
                >
                  {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
              </div>
            </div>
            {isMobileMenuOpen && (
              <div className="border-t border-zinc-100 dark:border-zinc-800 py-4 md:hidden">
                <div className="flex flex-col gap-4 px-2">
                  {navLinks}
                  <div className="h-px bg-zinc-100 dark:bg-zinc-800" />
                  {authAction}
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
          <Routes>
            <Route path="/" element={<Home heroImage={appearance.heroImage} heroTitle={appearance.heroTitle} heroSubtitle={appearance.heroSubtitle} heroTitleEn={appearance.heroTitleEn} heroSubtitleEn={appearance.heroSubtitleEn} />} />
            <Route path="/auth" element={<Auth setAuth={setIsAuthenticated} setUserRole={setUserRole} />} />
            <Route path="/collection" element={<Collection />} />
            <Route path="/shopping-list" element={<ShoppingList appearance={appearance} />} />
            <Route path="/recipes/:id" element={<RecipeDetail />} />
            <Route path="/admin" element={<Admin isAuthenticated={isAuthenticated} userRole={userRole} appearance={appearance} setAppearance={updateAppearance} />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
