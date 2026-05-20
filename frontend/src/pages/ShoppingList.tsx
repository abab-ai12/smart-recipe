import { useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Check, Plus, ShoppingCart, Trash2, Printer, Download, X, RotateCcw, AlertCircle, ChefHat } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import apiClient from '../api/client';
import html2canvas from 'html2canvas-pro';
import type { AppearanceSettings } from '../App';
import { readShoppingRecipeIds, writeShoppingRecipeIds, SHOPPING_RECIPE_IDS_EVENT } from '../utils/shoppingRecipes';

interface SavedRecipe {
  id: number;
  title: string;
  ingredients: string[];
}

interface ShoppingItem {
  key: string;
  name: string;
  displayName: string;
  quantity: number | null;
  unit: string;
  recipes: string[];
}

interface ShoppingListProps {
  appearance: AppearanceSettings;
}

const CHECKED_ITEMS_KEY = 'shopping_checked_items';
const CUSTOM_ITEMS_KEY = 'shopping_custom_items';
const HIDDEN_ITEMS_KEY = 'shopping_hidden_items';

const UNIT_ALIASES: Record<string, string> = {
  克: 'g',
  g: 'g',
  G: 'g',
  kg: 'kg',
  KG: 'kg',
  千克: 'kg',
  斤: '斤',
  个: '个',
  只: '个',
  枚: '个',
  颗: '个',
  根: '根',
  条: '条',
  片: '片',
  勺: '勺',
  汤匙: '勺',
  小勺: '小勺',
  杯: '杯',
  ml: 'ml',
  ML: 'ml',
  毫升: 'ml',
  L: 'L',
  升: 'L'
};

function readStringList(key: string) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeStringList(key: string, values: string[]) {
  const nextValues = [...new Set(values.map((item) => item.trim()).filter(Boolean))];
  localStorage.setItem(key, JSON.stringify(nextValues));
  return nextValues;
}

function parseIngredient(raw: string) {
  const normalized = raw
    .trim()
    .replace(/[：:]/g, '')
    .replace(/\s+/g, ' ');
  const units = Object.keys(UNIT_ALIASES).sort((a, b) => b.length - a.length).join('|');
  const patterns = [
    new RegExp(`^(.+?)\\s*(\\d+(?:\\.\\d+)?)\\s*(${units})$`),
    new RegExp(`^(\\d+(?:\\.\\d+)?)\\s*(${units})\\s*(.+)$`)
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (!match) continue;

    if (Number.isFinite(Number(match[2]))) {
      return {
        name: match[1].trim(),
        quantity: Number(match[2]),
        unit: UNIT_ALIASES[match[3]] || match[3]
      };
    }

    return {
      name: match[3].trim(),
      quantity: Number(match[1]),
      unit: UNIT_ALIASES[match[2]] || match[2]
    };
  }

  return {
    name: normalized,
    quantity: null,
    unit: ''
  };
}

function formatQuantity(quantity: number | null, unit: string) {
  if (quantity == null) return '';
  const rounded = Math.round(quantity * 100) / 100;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(2)}${unit}`;
}

export default function ShoppingList({ appearance }: ShoppingListProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [checkedItems, setCheckedItems] = useState<string[]>(() => readStringList(CHECKED_ITEMS_KEY));
  const [customItems, setCustomItems] = useState<string[]>(() => readStringList(CUSTOM_ITEMS_KEY));
  const [hiddenItems, setHiddenItems] = useState<string[]>(() => readStringList(HIDDEN_ITEMS_KEY));
  const [shoppingRecipeIds, setShoppingRecipeIds] = useState<number[]>(() => readShoppingRecipeIds());
  const [newItem, setNewItem] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [isSavingImage, setIsSavingImage] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  // Generate a stable random receipt number
  const receiptNo = useMemo(() => {
    return `SR-${Math.floor(100000 + Math.random() * 900000)}`;
  }, [showReceipt]);

  const currentDateStr = useMemo(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }, [showReceipt]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/auth');
      return;
    }

    const fetchRecipes = async () => {
      try {
        const res = await apiClient.get('/api/recipes/saved');
        setRecipes(res.data?.saved_recipes || []);
      } catch (err: any) {
        setErrorMsg(err.response?.data?.message || t('shopping_load_failed'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecipes();
  }, [navigate, t]);

  useEffect(() => {
    const handleShoppingRecipesChanged = (event: Event) => {
      const ids = (event as CustomEvent<{ ids?: number[] }>).detail?.ids;
      setShoppingRecipeIds(Array.isArray(ids) ? ids : readShoppingRecipeIds());
    };
    window.addEventListener(SHOPPING_RECIPE_IDS_EVENT, handleShoppingRecipesChanged);
    return () => {
      window.removeEventListener(SHOPPING_RECIPE_IDS_EVENT, handleShoppingRecipesChanged);
    };
  }, []);

  // Filter saved recipes that are explicitly in the active shopping list
  const activeRecipes = useMemo(() => {
    return recipes.filter((r) => shoppingRecipeIds.includes(r.id));
  }, [recipes, shoppingRecipeIds]);

  const allAggregatedItems = useMemo(() => {
    const map = new Map<string, ShoppingItem>();

    for (const recipe of activeRecipes) {
      for (const ingredient of recipe.ingredients || []) {
        const parsed = parseIngredient(String(ingredient));
        if (!parsed.name) continue;
        const key = `${parsed.name}|${parsed.unit}`;

        const existing = map.get(key) || {
          key,
          name: parsed.name,
          displayName: parsed.name,
          quantity: parsed.quantity == null ? null : 0,
          unit: parsed.unit,
          recipes: []
        };
        if (parsed.quantity != null && existing.quantity != null) {
          existing.quantity += parsed.quantity;
          existing.displayName = `${parsed.name} ${formatQuantity(existing.quantity, parsed.unit)}`;
        }
        existing.recipes.push(recipe.title);
        map.set(key, existing);
      }
    }

    for (const item of customItems) {
      const parsed = parseIngredient(item);
      const key = `${parsed.name}|${parsed.unit}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          name: parsed.name,
          displayName: parsed.quantity == null ? parsed.name : `${parsed.name} ${formatQuantity(parsed.quantity, parsed.unit)}`,
          quantity: parsed.quantity,
          unit: parsed.unit,
          recipes: [t('shopping_custom')]
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [customItems, activeRecipes, t]);

  // Filter out hidden items
  const visibleItems = useMemo(() => {
    return allAggregatedItems.filter((item) => !hiddenItems.includes(item.key));
  }, [allAggregatedItems, hiddenItems]);

  const toggleItem = (key: string) => {
    const nextChecked = checkedItems.includes(key)
      ? checkedItems.filter((item) => item !== key)
      : [...checkedItems, key];
    setCheckedItems(writeStringList(CHECKED_ITEMS_KEY, nextChecked));
  };

  const addCustomItem = (event: React.FormEvent) => {
    event.preventDefault();
    const item = newItem.trim();
    if (!item) return;
    setCustomItems(writeStringList(CUSTOM_ITEMS_KEY, [...customItems, item]));
    setNewItem('');
  };

  const deleteItem = (item: ShoppingItem) => {
    // Check if it's a custom item
    const isCustom = customItems.some((customItem) => {
      const parsed = parseIngredient(customItem);
      return `${parsed.name}|${parsed.unit}` === item.key;
    });

    if (isCustom) {
      // Remove entirely from custom items
      const nextCustom = customItems.filter((customItem) => {
        const parsed = parseIngredient(customItem);
        return `${parsed.name}|${parsed.unit}` !== item.key;
      });
      setCustomItems(writeStringList(CUSTOM_ITEMS_KEY, nextCustom));
    } else {
      // Add to hidden items
      const nextHidden = [...hiddenItems, item.key];
      setHiddenItems(writeStringList(HIDDEN_ITEMS_KEY, nextHidden));
    }

    // Clean checked status for safety
    const nextChecked = checkedItems.filter((k) => k !== item.key);
    setCheckedItems(writeStringList(CHECKED_ITEMS_KEY, nextChecked));
  };

  const removeRecipeFromShopping = (id: number) => {
    const nextIds = shoppingRecipeIds.filter((x) => x !== id);
    setShoppingRecipeIds(writeShoppingRecipeIds(nextIds));
  };

  const restoreHiddenItems = () => {
    setHiddenItems(writeStringList(HIDDEN_ITEMS_KEY, []));
    alert(t('shopping_hidden_restored'));
  };

  const clearChecked = () => {
    setCheckedItems(writeStringList(CHECKED_ITEMS_KEY, []));
  };

  const saveReceiptAsImage = async () => {
    if (!receiptRef.current) return;
    setIsSavingImage(true);

    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#fcfcf9',
        logging: true,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc) => {
          // Remove all existing styles and links to prevent html2canvas from crashing on Tailwind v4's oklab color spaces
          const styles = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
          styles.forEach((el) => el.parentNode?.removeChild(el));

          // Inject clean, standard receipt CSS styles for the canvas render
          const styleElement = clonedDoc.createElement('style');
          styleElement.textContent = `
            .receipt-paper {
              background-color: #fcfcf9 !important;
              color: #27272a !important;
              padding-left: 1.5rem !important;
              padding-right: 1.5rem !important;
              padding-top: 2rem !important;
              padding-bottom: 2rem !important;
              display: flex !important;
              flex-direction: column !important;
              position: relative !important;
              border-left-width: 1px !important;
              border-right-width: 1px !important;
              border-color: rgba(228, 228, 231, 0.4) !important;
              width: 384px !important;
              box-sizing: border-box !important;
              box-shadow: none !important;
              border: none !important;
            }
            .flex { display: flex !important; }
            .flex-col { flex-direction: column !important; }
            .items-center { align-items: center !important; }
            .justify-between { justify-content: space-between !important; }
            .justify-center { justify-content: center !important; }
            .items-stretch { align-items: stretch !important; }
            .text-center { text-align: center !important; }
            .text-xs { font-size: 0.75rem !important; line-height: 1rem !important; }
            .text-sm { font-size: 0.875rem !important; line-height: 1.25rem !important; }
            .text-base { font-size: 1rem !important; line-height: 1.5rem !important; }
            .text-lg { font-size: 1.125rem !important; line-height: 1.75rem !important; }
            .text-\\[10px\\] { font-size: 10px !important; }
            .text-\\[8px\\] { font-size: 8px !important; }
            .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important; }
            .font-bold { font-weight: 700 !important; }
            .font-semibold { font-weight: 600 !important; }
            .font-black { font-weight: 900 !important; }
            .space-y-1 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.25rem !important; }
            .space-y-2 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.5rem !important; }
            .my-4 { margin-top: 1rem !important; margin-bottom: 1rem !important; }
            .mt-0\\.5 { margin-top: 0.125rem !important; }
            .mt-1 { margin-top: 0.25rem !important; }
            .mt-2 { margin-top: 0.5rem !important; }
            .mt-3 { margin-top: 0.75rem !important; }
            .mt-6 { margin-top: 1.5rem !important; }
            .mb-2 { margin-bottom: 0.5rem !important; }
            .pr-4 { padding-right: 1rem !important; }
            .inline-block { display: inline-block !important; }
            .border-2 { border-width: 2px !important; }
            .border-zinc-800 { border-color: #27272a !important; }
            .p-1 { padding: 0.25rem !important; }
            .border-t { border-top-width: 1px !important; }
            .border-dashed { border-style: dashed !important; }
            .border-zinc-400 { border-color: #a1a1aa !important; }
            .text-zinc-550 { color: #71717a !important; }
            .text-zinc-500 { color: #71717a !important; }
            .text-zinc-650 { color: #4b5563 !important; }
            .text-zinc-400 { color: #a1a1aa !important; }
            .text-zinc-850 { color: #27272a !important; }
            .text-zinc-800 { color: #27272a !important; }
            .uppercase { text-transform: uppercase !important; }
            .tracking-wider { letter-spacing: 0.05em !important; }
            .tracking-widest { letter-spacing: 0.1em !important; }
            .tracking-\\[0\\.25em\\] { letter-spacing: 0.25em !important; }
            .h-10 { height: 2.5rem !important; }
            .bg-white { background-color: #fff !important; }
            .px-2 { padding-left: 0.5rem !important; padding-right: 0.5rem !important; }
            .py-1 { padding-top: 0.25rem !important; padding-bottom: 0.25rem !important; }
            .border { border-width: 1px !important; }
            .border-zinc-200 { border-color: #e4e4e7 !important; }
            .border-zinc-200\\/40 { border-color: rgba(228, 228, 231, 0.4) !important; }
            .shadow-sm { box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05) !important; }
            .w-\\[1px\\] { width: 1px !important; }
            .w-\\[2px\\] { width: 2px !important; }
            .w-\\[3px\\] { width: 3px !important; }
            .w-\\[4px\\] { width: 4px !important; }
            .bg-zinc-900 { background-color: #18181b !important; }
            .mr-\\[1px\\] { margin-right: 1px !important; }
            .mr-\\[2px\\] { margin-right: 2px !important; }
            .shrink-0 { flex-shrink: 0 !important; }
            .w-2\\.5 { width: 10px !important; }
            .h-1\\.5 { height: 6px !important; }
            .text-\\[\\#fcfcf9\\] { color: #fcfcf9 !important; }
            .fill-current { fill: currentColor !important; }
            .absolute { position: absolute !important; }
            .top-0 { top: 0 !important; }
            .bottom-0 { bottom: 0 !important; }
            .left-0 { left: 0 !important; }
            .right-0 { right: 0 !important; }
            .z-20 { z-index: 20 !important; }
            .z-10 { z-index: 10 !important; }
            .w-full { width: 100% !important; }
            .overflow-hidden { overflow: hidden !important; }
            .rotate-180 { transform: rotate(180deg) !important; }
            .truncate { overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; }
            .min-w-0 { min-width: 0 !important; }
            .flex-1 { flex: 1 1 0% !important; }
          `;
          clonedDoc.head.appendChild(styleElement);

          // Force print items to be fully opaque and non-animated in screenshot
          const items = clonedDoc.querySelectorAll('.print-item');
          items.forEach((elem) => {
            const h = elem as HTMLElement;
            h.style.opacity = '1';
            h.style.transform = 'none';
            h.style.animation = 'none';
          });
          
          clonedDoc.body.style.backgroundColor = 'transparent';
          
          const paper = clonedDoc.querySelector('.receipt-paper');
          if (paper) {
            const p = paper as HTMLElement;
            p.classList.remove('shadow-2xl');
            p.style.width = '384px';
            p.style.maxWidth = '384px';
            p.style.minWidth = '384px';
            p.style.transform = 'none';
            p.style.animation = 'none';
            p.style.boxShadow = 'none';
            p.style.border = 'none';
            p.style.outline = 'none';

            // Set parent container backgrounds to transparent to avoid capturing dark background artifacts
            let parent = p.parentElement;
            while (parent) {
              parent.style.backgroundColor = 'transparent';
              parent.style.background = 'transparent';
              parent.style.boxShadow = 'none';
              parent.style.border = 'none';
              parent.style.outline = 'none';
              parent = parent.parentElement;
            }
          }
        }
      });

      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = `Receipt_${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error('Failed to generate image:', err);
      alert(`保存图片失败: ${err?.message || err || '未知错误'}`);
    } finally {
      setIsSavingImage(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto py-12 flex justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 animate-fade-in">
      {/* Style overrides for print roll effect and sawtooth patterns */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes print-paper {
          0% {
            transform: translateY(-80%) scaleY(0.1);
            opacity: 0;
          }
          100% {
            transform: translateY(0) scaleY(1);
            opacity: 1;
          }
        }
        @keyframes print-line {
          0% {
            opacity: 0;
            transform: translateY(8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .receipt-paper-printing {
          transform-origin: top center;
          animation: print-paper 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .print-item {
          opacity: 0;
          animation: print-line 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      ` }} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-white">
            <ShoppingCart className="text-orange-500" />
            {t('shopping_title')}
          </h1>
          <p className="mt-2 text-xs md:text-sm text-zinc-500 dark:text-zinc-400 font-medium">{t('shopping_desc')}</p>
        </div>
        
        <div className="flex gap-2">
          {visibleItems.length > 0 && (
            <button
              type="button"
              onClick={() => setShowReceipt(true)}
              className="rounded-full bg-orange-500 px-5 py-2.5 text-xs md:text-sm font-extrabold text-white hover:bg-orange-600 transition-all duration-200 ios-active-scale flex items-center gap-1.5 shadow-md shadow-orange-500/25 cursor-pointer"
            >
              <Printer size={16} />
              {t('shopping_generate_receipt')}
            </button>
          )}

          <button
            type="button"
            onClick={clearChecked}
            className="rounded-full border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 px-4 py-2.5 text-xs md:text-sm font-extrabold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-850 transition-all duration-200 ios-active-scale cursor-pointer"
          >
            {t('shopping_clear_checked')}
          </button>
        </div>
      </div>

      {/* Active Recipes tag panel */}
      {activeRecipes.length > 0 ? (
        <div className="mb-6 rounded-[22px] ios-glass bg-white/50 dark:bg-zinc-900/30 p-4 border border-zinc-200/10">
          <h3 className="text-xs font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5 font-sans">
            <ChefHat size={14} className="text-orange-500" />
            正在采购的菜谱 (点击移出清单)
          </h3>
          <div className="flex flex-wrap gap-2">
            {activeRecipes.map((recipe) => (
              <button
                key={recipe.id}
                type="button"
                onClick={() => removeRecipeFromShopping(recipe.id)}
                className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 dark:bg-orange-950/45 px-3 py-1.5 text-xs font-extrabold text-orange-600 dark:text-orange-400 border border-orange-200/50 dark:border-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-900/30 transition-colors ios-active-scale cursor-pointer"
                title="点击从采购清单中移出这道菜"
              >
                {recipe.title}
                <X size={12} className="stroke-[3]" />
              </button>
            ))}
          </div>
        </div>
      ) : recipes.length > 0 ? (
        <div className="mb-6 rounded-[22px] border border-dashed border-zinc-300 dark:border-zinc-800 bg-white/30 dark:bg-zinc-950/15 p-5 text-center text-xs md:text-sm text-zinc-500 dark:text-zinc-400 font-medium">
          💡 当前没有选择采购菜谱。去你的 <span onClick={() => navigate('/collection')} className="text-orange-500 hover:underline cursor-pointer font-bold">收藏库</span> 中点击“加入采购”，系统会自动汇总所需食材。
        </div>
      ) : null}

      {/* Hidden Items banner */}
      {hiddenItems.length > 0 && (
        <div className="mb-6 rounded-[22px] border border-orange-200/50 dark:border-orange-900/30 bg-orange-500/5 dark:bg-orange-950/10 p-4 flex items-center justify-between gap-3 text-sm font-medium text-orange-600 dark:text-orange-400">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="shrink-0" />
            <span>{t('shopping_hidden_count', { count: hiddenItems.length })}</span>
          </div>
          <button
            type="button"
            onClick={restoreHiddenItems}
            className="inline-flex items-center gap-1 text-xs font-extrabold border border-orange-300 dark:border-orange-900/50 bg-white dark:bg-zinc-950 px-3 py-1.5 rounded-full hover:bg-orange-50 dark:hover:bg-orange-950/50 transition-colors cursor-pointer"
          >
            <RotateCcw size={12} />
            {t('shopping_restore_hidden')}
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-4 text-sm font-medium text-red-600 dark:text-red-400">
          {errorMsg}
        </div>
      )}

      <form onSubmit={addCustomItem} className="mb-6 flex gap-3 rounded-3xl ios-glass bg-white/70 dark:bg-zinc-900/50 p-4 shadow-sm border border-zinc-200/20">
        <input
          value={newItem}
          onChange={(event) => setNewItem(event.target.value)}
          placeholder={t('shopping_add_placeholder')}
          className="min-w-0 flex-1 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/40 text-zinc-900 dark:text-white px-4 py-2.5 text-sm outline-none focus:border-orange-400 dark:focus:border-orange-500 transition-all duration-200"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 text-white px-5 py-2.5 text-xs md:text-sm font-extrabold hover:bg-orange-600 transition-all duration-200 ios-active-scale cursor-pointer"
        >
          <Plus size={16} />
          {t('shopping_add')}
        </button>
      </form>

      {visibleItems.length === 0 ? (
        <div className="rounded-[32px] ios-glass bg-white/60 dark:bg-zinc-900/40 p-16 text-center text-zinc-500 dark:text-zinc-400 font-medium">
          {t('shopping_empty')}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {visibleItems.map((item) => {
            const checked = checkedItems.includes(item.key);

            return (
              <article key={item.key} className={`rounded-[22px] ios-glass p-4 transition-all duration-300 border border-zinc-200/10 ${checked ? 'bg-green-500/[0.03] dark:bg-green-950/[0.04] opacity-75' : 'bg-white/70 dark:bg-zinc-900/40 hover:bg-white/80 dark:hover:bg-zinc-900/50'}`}>
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggleItem(item.key)}
                    className={`mt-0.5 flex h-6.5 w-6.5 items-center justify-center rounded-full border transition-all duration-300 ios-active-scale cursor-pointer ${checked ? 'border-green-500 bg-green-500 text-white scale-105 shadow-sm' : 'border-zinc-300 dark:border-zinc-700 bg-white/50 dark:bg-zinc-950/30 text-transparent'}`}
                    aria-label={item.displayName}
                  >
                    <Check size={14} className="stroke-[3]" />
                  </button>
                  
                  <div className="min-w-0 flex-1">
                    <h2 className={`text-base font-bold transition-all ${checked ? 'line-through text-zinc-400 dark:text-zinc-500 font-semibold' : 'text-zinc-800 dark:text-zinc-100 font-extrabold'}`}>
                      {item.displayName}
                    </h2>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400 font-medium">
                      {item.recipes.slice(0, 3).join('、')}
                      {item.recipes.length > 3 ? ` +${item.recipes.length - 3}` : ''}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteItem(item)}
                    className="rounded-full bg-red-50 dark:bg-red-950/30 p-2 text-red-500 dark:text-red-450 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all duration-200 ios-active-scale cursor-pointer"
                    title={t('shopping_remove')}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modern Receipt Modal (Rendered via React Portal at body level to escape transform boundaries and prevent clipped/boxed dark frames) */}
      {showReceipt && createPortal(
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-md z-50 flex items-start justify-center p-4 overflow-y-auto transition-all duration-300">
          <div className="w-full max-w-sm my-8 relative flex flex-col items-center">
            
            {/* Dark Metallic Feeder Slot */}
            <div className="w-11/12 h-4 bg-zinc-800 rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] relative z-20 border border-zinc-900 flex items-center justify-center">
              <div className="w-4/5 h-[3px] bg-black rounded-full shadow-[0_1px_1px_rgba(255,255,255,0.1)]"></div>
            </div>

            {/* Receipt Card */}
            <div 
              ref={receiptRef}
              className="receipt-paper receipt-paper-printing w-full bg-[#fcfcf9] text-zinc-850 shadow-2xl relative z-10 -mt-2.5 px-6 py-8 flex flex-col border-x border-zinc-200/40"
              style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}
            >
              {/* Inline SVGs for Sawtooth top & bottom, rendered as actual nodes to be captured perfectly by html2canvas */}
              <div className="absolute top-0 left-0 right-0 flex overflow-hidden h-2 select-none pointer-events-none rotate-180 z-20">
                {Array.from({ length: 45 }).map((_, i) => (
                  <svg key={i} viewBox="0 0 10 6" className="w-2.5 h-1.5 text-[#fcfcf9] fill-current shrink-0">
                    <polygon points="0,6 5,1 10,6" />
                  </svg>
                ))}
              </div>

              {/* Receipt Content */}
              <div className="text-center mt-3 print-item" style={{ animationDelay: '0.1s' }}>
                <div className="inline-block border-2 border-zinc-800 p-1 mb-2">
                  <ShoppingCart size={28} className="text-zinc-800" />
                </div>
                <h3 className="text-lg font-black uppercase tracking-wider">{appearance.brandName || t('app_name')}</h3>
                <p className="text-xs text-zinc-500 font-bold tracking-widest mt-1">- {t('shopping_receipt_title')} -</p>
              </div>

              <div className="my-4 border-t border-dashed border-zinc-400 print-item" style={{ animationDelay: '0.2s' }}></div>

              <div className="space-y-1 text-xs text-zinc-600 print-item font-semibold" style={{ animationDelay: '0.3s' }}>
                <div className="flex justify-between">
                  <span>{t('shopping_receipt_date')}:</span>
                  <span>{currentDateStr}</span>
                </div>
                <div className="flex justify-between">
                  <span>RECEIPT NO:</span>
                  <span>{receiptNo}</span>
                </div>
              </div>

              <div className="my-4 border-t border-dashed border-zinc-400 print-item" style={{ animationDelay: '0.4s' }}></div>

              {/* Items List */}
              <div className="space-y-2 flex-1">
                {visibleItems.map((item, index) => {
                  const isChecked = checkedItems.includes(item.key);
                  return (
                    <div 
                      key={item.key}
                      className="print-item flex justify-between items-start text-xs border-b border-dashed border-zinc-200 pb-1.5 font-semibold"
                      style={{ animationDelay: `${0.45 + index * 0.07}s` }}
                    >
                      <span className="flex-1 pr-4 truncate">
                        {isChecked ? '☑ ' : '☐ '}
                        <span className={isChecked ? 'line-through text-zinc-400' : ''}>{item.name}</span>
                      </span>
                      <span className="shrink-0 text-right font-bold text-zinc-950 font-mono">
                        {formatQuantity(item.quantity, item.unit) || '适量'}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="my-4 border-t-2 border-double border-zinc-400 print-item" style={{ animationDelay: `${0.5 + visibleItems.length * 0.07}s` }}></div>

              <div 
                className="flex justify-between font-bold text-sm text-zinc-900 uppercase tracking-wide print-item"
                style={{ animationDelay: `${0.55 + visibleItems.length * 0.07}s` }}
              >
                <span>{t('shopping_receipt_total', { count: visibleItems.length })}</span>
                <span className="font-mono">ITEMS: {visibleItems.length}</span>
              </div>

              {/* Receipt footer */}
              <div 
                className="mt-6 text-center text-[10px] leading-relaxed text-zinc-500 border-t border-dashed border-zinc-300 pt-4 print-item font-semibold"
                style={{ animationDelay: `${0.62 + visibleItems.length * 0.07}s` }}
              >
                <p className="italic">“{appearance.heroSubtitle || t('home_hero_subtitle')}”</p>
                <p className="mt-2 text-zinc-400 font-bold">{t('shopping_receipt_tip')}</p>
                <p className="mt-1 tracking-widest font-black uppercase text-zinc-700">* THANK YOU / 谢谢惠顾 *</p>
              </div>

              {/* CSS Barcode */}
              <div 
                className="flex flex-col items-center mt-6 select-none print-item"
                style={{ animationDelay: `${0.7 + visibleItems.length * 0.07}s` }}
              >
                <div className="flex h-10 items-stretch bg-white px-2 py-1 border border-zinc-200 shadow-sm">
                  <div className="w-[2px] bg-zinc-900 mr-[1px]"></div>
                  <div className="w-[1px] bg-zinc-900 mr-[2px]"></div>
                  <div className="w-[3px] bg-zinc-900 mr-[1px]"></div>
                  <div className="w-[1px] bg-zinc-900 mr-[1px]"></div>
                  <div className="w-[2px] bg-zinc-900 mr-[2px]"></div>
                  <div className="w-[4px] bg-zinc-900 mr-[1px]"></div>
                  <div className="w-[1px] bg-zinc-900 mr-[1px]"></div>
                  <div className="w-[3px] bg-zinc-900 mr-[2px]"></div>
                  <div className="w-[2px] bg-zinc-900 mr-[1px]"></div>
                  <div className="w-[1px] bg-zinc-900 mr-[1px]"></div>
                  <div className="w-[4px] bg-zinc-900 mr-[2px]"></div>
                  <div className="w-[2px] bg-zinc-900"></div>
                </div>
                <span className="text-[8px] text-zinc-400 tracking-[0.25em] mt-1 font-mono">{receiptNo}</span>
              </div>

              {/* Sawtooth bottom */}
              <div className="absolute bottom-0 left-0 right-0 flex overflow-hidden h-2 select-none pointer-events-none z-20">
                {Array.from({ length: 45 }).map((_, i) => (
                  <svg key={i} viewBox="0 0 10 6" className="w-2.5 h-1.5 text-[#fcfcf9] fill-current shrink-0">
                    <polygon points="0,0 5,5 10,0" />
                  </svg>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex gap-3 w-full justify-center relative z-20">
              <button
                type="button"
                onClick={saveReceiptAsImage}
                disabled={isSavingImage}
                className="flex items-center justify-center gap-2 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-sm px-6 py-3 shadow-lg shadow-orange-500/25 transition-all duration-200 ios-active-scale disabled:opacity-50 cursor-pointer"
              >
                <Download size={16} />
                {isSavingImage ? 'Generating...' : t('shopping_receipt_save')}
              </button>

              <button
                type="button"
                onClick={() => setShowReceipt(false)}
                className="flex items-center justify-center gap-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white font-extrabold text-sm px-6 py-3 transition-all duration-200 ios-active-scale cursor-pointer"
              >
                <X size={16} />
                {t('shopping_receipt_close')}
              </button>
            </div>
            
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
