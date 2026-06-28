import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MenuItem, Review } from '../types';
import { Check, ChevronDown, Flame, Heart, Plus, RotateCcw, Search, ShieldAlert, ShoppingCart, SlidersHorizontal, Star, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MenuProps {
  menuItems: MenuItem[];
  reviews: Review[];
  currentUserId: string | null;
  isAuthenticated: boolean;
  favoriteProductIds?: string[];
  onRequireAuth: () => void;
  onToggleFavorite?: (productId: string) => Promise<void>;
  favoriteProductIds: string[];
  onRequireAuth: () => void;
  onToggleFavorite: (productId: string) => Promise<void>;
  onAddToCart: (item: MenuItem, selectedSize: string, selectedPrice: number, addedCustomizations: string[], quantity: number) => void;
  onSaveReview: (productId: string, rating: number, comment: string) => Promise<void>;
  onDeleteReview: (reviewId: string) => Promise<void>;
}

export default function Menu({
  menuItems,
  reviews,
  currentUserId,
  isAuthenticated,
  favoriteProductIds,
  onRequireAuth,
  onToggleFavorite,
  onAddToCart,
  onSaveReview,
  onDeleteReview,
}: MenuProps) {
  const { t, i18n } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [discountedOnly, setDiscountedOnly] = useState(false);
  const [minRating, setMinRating] = useState('all');
  const [sortMode, setSortMode] = useState('default');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [favoriteUpdatingId, setFavoriteUpdatingId] = useState<string | null>(null);
  
  // Customization state
  const [selectedSizeIdx, setSelectedSizeIdx] = useState<number>(0);
  const [selectedCustomizations, setSelectedCustomizations] = useState<string[]>([]);
  const [quantity, setQuantity] = useState<number>(1);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const predefinedCategories = [
    { id: 'all', icon: '✦', translationKey: 'menu.categories.all' },
    { id: 'special', icon: '✨', translationKey: 'menu.categories.special' },
    { id: 'classic', icon: '🌯', translationKey: 'menu.categories.classic' },
    { id: 'combos', icon: '🍟', translationKey: 'menu.categories.combos' },
    { id: 'drinks', icon: '🥤', translationKey: 'menu.categories.drinks' },
    { id: 'sides', icon: '🧀', translationKey: 'menu.categories.sides' }
  ];

  const categories = useMemo(() => {
    const existingIds = new Set(predefinedCategories.map((category) => category.id));
    const customCategories = Array.from(new Set(menuItems.map((item) => item.category)))
      .filter((category) => category && !existingIds.has(category))
      .map((category) => ({ id: category, icon: '•', label: category }));

    return [...predefinedCategories, ...customCategories];
  }, [menuItems]);

  const approvedReviewsByProduct = useMemo(() => {
    return reviews.reduce<Record<string, Review[]>>((acc, review) => {
      if (!review.productId || review.approved === false) return acc;
      acc[review.productId] = [...(acc[review.productId] ?? []), review];
      return acc;
    }, {});
  }, [reviews]);

  const getReviewSummary = (productId: string) => {
    const productReviews = approvedReviewsByProduct[productId] ?? [];
    const average = productReviews.length
      ? productReviews.reduce((sum, review) => sum + review.rating, 0) / productReviews.length
      : 0;

    return {
      average,
      count: productReviews.length,
      reviews: productReviews,
    };
  };

  const getDiscountedPrice = (item: MenuItem) => {
    if (!item.discountPercent || item.discountPercent <= 0) return item.price;
    return Number((item.price * (1 - Math.min(item.discountPercent, 100) / 100)).toFixed(2));
  };

  const productReviewSummaries = useMemo(() => {
    return menuItems.reduce<Record<string, { average: number; count: number }>>((acc, item) => {
      const productReviews = approvedReviewsByProduct[item.id] ?? [];
      acc[item.id] = {
        average: productReviews.length
          ? productReviews.reduce((sum, review) => sum + review.rating, 0) / productReviews.length
          : 0,
        count: productReviews.length,
      };
      return acc;
    }, {});
  }, [approvedReviewsByProduct, menuItems]);

  const filteredItems = useMemo(() => {
    const queryText = searchTerm.trim().toLowerCase();
    const min = minPrice === '' ? null : Number(minPrice);
    const max = maxPrice === '' ? null : Number(maxPrice);
    const ratingFloor = minRating === 'all' ? null : Number(minRating);

    const matches = menuItems.filter((item) => {
      const discountedPrice = getDiscountedPrice(item);
      const summary = productReviewSummaries[item.id] ?? { average: 0, count: 0 };
      const searchableText = [
        item.name,
        item.nameEn,
        item.description,
        item.descriptionEn,
        item.category,
      ].join(' ').toLowerCase();

      return (
        (selectedCategory === 'all' || item.category === selectedCategory)
        && (!queryText || searchableText.includes(queryText))
        && (min === null || discountedPrice >= min)
        && (max === null || discountedPrice <= max)
        && (!availableOnly || item.available !== false)
        && (!discountedOnly || Boolean(item.discountPercent && item.discountPercent > 0))
        && (ratingFloor === null || (summary.count > 0 && summary.average >= ratingFloor))
      );
    });

    return [...matches].sort((a, b) => {
      const priceA = getDiscountedPrice(a);
      const priceB = getDiscountedPrice(b);
      const ratingA = productReviewSummaries[a.id] ?? { average: 0, count: 0 };
      const ratingB = productReviewSummaries[b.id] ?? { average: 0, count: 0 };

      switch (sortMode) {
        case 'price-asc':
          return priceA - priceB;
        case 'price-desc':
          return priceB - priceA;
        case 'rating-desc':
          return ratingB.average - ratingA.average || ratingB.count - ratingA.count;
        case 'review-count-desc':
          return ratingB.count - ratingA.count || ratingB.average - ratingA.average;
        case 'discounted-first':
          return Number(Boolean(b.discountPercent)) - Number(Boolean(a.discountPercent)) || priceA - priceB;
        default:
          return 0;
      }
    });
  }, [
    availableOnly,
    discountedOnly,
    maxPrice,
    menuItems,
    minPrice,
    minRating,
    productReviewSummaries,
    searchTerm,
    selectedCategory,
    sortMode,
  ]);

  const hasActiveDiscoveryFilters = Boolean(
    searchTerm
    || selectedCategory !== 'all'
    || minPrice
    || maxPrice
    || availableOnly
    || discountedOnly
    || minRating !== 'all'
    || sortMode !== 'default'
  );

  const clearDiscoveryFilters = () => {
    setSelectedCategory('all');
    setSearchTerm('');
    setMinPrice('');
    setMaxPrice('');
    setAvailableOnly(false);
    setDiscountedOnly(false);
    setMinRating('all');
    setSortMode('default');
  };

  const handleFavoriteClick = async (item: MenuItem) => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }

    setFavoriteUpdatingId(item.id);
    try {
<<<<<<< HEAD
      await onToggleFavorite?.(item.id);
=======
      await onToggleFavorite(item.id);
>>>>>>> origin/main
    } finally {
      setFavoriteUpdatingId(null);
    }
  };

  const handleOpenCustomize = (item: MenuItem) => {
    if (item.available === false) return;
    const existingReview = reviews.find(
      (review) => review.productId === item.id && review.userId === currentUserId
    );
    setCustomizingItem(item);
    setSelectedSizeIdx(0);
    setSelectedCustomizations([]);
    setQuantity(1);
    setReviewRating(existingReview?.rating ?? 5);
    setReviewComment(existingReview?.comment ?? '');
    setReviewError(null);
  };

  const toggleCustomization = (id: string) => {
    setSelectedCustomizations(prev =>
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  // Dynamic price calculation
  const calculateCurrentPrice = () => {
    if (!customizingItem) return 0;
    const sizeMultiplier = customizingItem.sizes[selectedSizeIdx]?.multiplier || 1;
    const basePrice = getDiscountedPrice(customizingItem) * sizeMultiplier;
    
    const customizationsPrice = selectedCustomizations.reduce((acc, cId) => {
      const custObj = customizingItem.customizations.find(c => c.id === cId);
      return acc + (custObj?.price || 0);
    }, 0);

    return (basePrice + customizationsPrice) * quantity;
  };

  const handleAddConfirm = () => {
    if (!customizingItem) return;
    
    const sizeLabel = customizingItem.sizes[selectedSizeIdx].label;
    const finalSinglePrice = (getDiscountedPrice(customizingItem) * customizingItem.sizes[selectedSizeIdx].multiplier) + 
      selectedCustomizations.reduce((acc, cId) => {
        const custObj = customizingItem?.customizations.find(c => c.id === cId);
        return acc + (custObj?.price || 0);
      }, 0);

    onAddToCart(
      customizingItem,
      sizeLabel,
      finalSinglePrice,
      selectedCustomizations,
      quantity
    );

    setCustomizingItem(null);
  };

  const handleSubmitReview = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!customizingItem) return;

    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }

    setReviewSubmitting(true);
    setReviewError(null);

    try {
      await onSaveReview(customizingItem.id, reviewRating, reviewComment);
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : 'Could not save review.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleDeleteOwnReview = async () => {
    if (!customizingItem) return;
    const existingReview = reviews.find(
      (review) => review.productId === customizingItem.id && review.userId === currentUserId
    );
    if (!existingReview) return;

    setReviewSubmitting(true);
    setReviewError(null);

    try {
      await onDeleteReview(existingReview.id);
      setReviewRating(5);
      setReviewComment('');
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : 'Could not delete review.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const selectedProductReviewSummary = customizingItem ? getReviewSummary(customizingItem.id) : null;
  const existingUserReview = customizingItem
    ? reviews.find((review) => review.productId === customizingItem.id && review.userId === currentUserId)
    : undefined;
  const currentLanguage = (i18n.resolvedLanguage || i18n.language || 'ka').split('-')[0];
  const getProductName = (item: MenuItem) =>
    currentLanguage === 'en' && item.nameEn ? item.nameEn : item.name;
  const getProductDescription = (item: MenuItem) =>
    currentLanguage === 'en' && item.descriptionEn ? item.descriptionEn : item.description;

  return (
    <section id="menu" className="py-24 cream-grid-bg relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Title */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-amber-500 font-black text-xs uppercase tracking-widest font-mono block mb-2">
            {t('menu.sectionEyebrow')}
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-stone-950 font-sans tracking-tight mb-4">
            {t('menu.sectionTitle')}
          </h2>
          <p className="text-stone-600 text-sm font-light">
            {t('menu.sectionDescription')}
          </p>
        </div>

        {/* Category Tabs */}
        <div className="mb-12 flex flex-row gap-3 overflow-x-auto whitespace-nowrap pb-3 scrollbar-hide [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:justify-start lg:grid lg:grid-cols-6 lg:overflow-visible lg:pb-0">
          {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`min-h-12 shrink-0 cursor-pointer select-none rounded-2xl px-5 py-3 text-xs sm:px-6 sm:text-sm ${
                selectedCategory === cat.id
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-lg shadow-amber-500/20 transform scale-105 transition-all duration-300'
                  : 'bg-stone-900 text-stone-400 border border-stone-800 hover:border-amber-500/50 hover:text-amber-500 transition-all duration-200'
              }`}
              aria-pressed={selectedCategory === cat.id}
            >
              <span className="mr-2" aria-hidden="true">{cat.icon}</span>
              {'translationKey' in cat ? t(cat.translationKey) : cat.label}
            </button>
          ))}
        </div>

        <div className="mb-8 rounded-3xl border border-stone-100 bg-white shadow-xl shadow-stone-900/5">
          <div className="px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <label className="relative flex-1">
                <span className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20">
                  <Search className="h-4 w-4" />
                </span>
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
<<<<<<< HEAD
                  placeholder={t('menu.discovery.searchPlaceholder')}
=======
                  placeholder="Search menu..."
>>>>>>> origin/main
                  className="h-14 w-full rounded-2xl border border-stone-200 bg-stone-50 py-3 pl-14 pr-4 text-sm font-bold text-stone-900 shadow-sm outline-none transition-all placeholder:text-stone-400 focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10"
                />
              </label>

              <button
                type="button"
                onClick={() => setFiltersOpen((value) => !value)}
                className={`flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left shadow-sm transition-all lg:min-w-64 ${
                  filtersOpen
                    ? 'border-amber-500 bg-stone-950 text-white shadow-lg shadow-stone-900/10'
                    : 'border-stone-200 bg-white text-stone-950 hover:border-amber-500/40 hover:shadow-md'
                }`}
                aria-expanded={filtersOpen}
                aria-controls="menu-filter-panel"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    filtersOpen ? 'bg-amber-500 text-stone-950' : 'bg-amber-500/10 text-amber-600'
                  }`}>
                    <SlidersHorizontal className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-black uppercase tracking-[0.16em]">
<<<<<<< HEAD
                      {t('menu.discovery.resultsAndFilters')}
=======
                      Results & Filters
>>>>>>> origin/main
                    </span>
                    <span className={`mt-0.5 block text-[10px] font-semibold ${
                      filtersOpen ? 'text-stone-300' : 'text-stone-400'
                    }`}>
<<<<<<< HEAD
                      {filteredItems.length} {t(filteredItems.length === 1 ? 'menu.discovery.productFound' : 'menu.discovery.productsFound')}
=======
                      {filteredItems.length} product{filteredItems.length === 1 ? '' : 's'} found
>>>>>>> origin/main
                    </span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {hasActiveDiscoveryFilters && (
                    <span className="h-2.5 w-2.5 rounded-full bg-red-600 shadow-md shadow-red-600/30" />
                  )}
                  <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${filtersOpen ? 'rotate-180 text-amber-400' : 'text-stone-400'}`} />
                </span>
              </button>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {filtersOpen && (
              <motion.div
                id="menu-filter-panel"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="overflow-hidden border-t border-stone-100"
              >
                <div className="max-h-[70vh] space-y-4 overflow-y-auto bg-stone-50/80 p-4 sm:max-h-none sm:p-5">
                  <div className="rounded-2xl border border-stone-100 bg-white p-3 shadow-sm">
<<<<<<< HEAD
                    <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-stone-400">{t('menu.discovery.sort')}</span>
                    <div className="flex flex-wrap gap-2">
                      {[
                        ['default', t('menu.discovery.default')],
                        ['price-asc', t('menu.discovery.priceLowHigh')],
                        ['price-desc', t('menu.discovery.priceHighLow')],
                        ['rating-desc', t('menu.discovery.highestRated')],
                        ['review-count-desc', t('menu.discovery.mostReviewed')],
                        ['discounted-first', t('menu.discovery.discountedFirst')],
=======
                    <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-stone-400">Sort</span>
                    <div className="flex flex-wrap gap-2">
                      {[
                        ['default', 'Default'],
                        ['price-asc', 'Price low to high'],
                        ['price-desc', 'Price high to low'],
                        ['rating-desc', 'Highest rated'],
                        ['review-count-desc', 'Most reviewed'],
                        ['discounted-first', 'Discounted first'],
>>>>>>> origin/main
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setSortMode(value)}
                          className={`min-h-10 cursor-pointer rounded-2xl border px-3 py-2 text-xs font-black transition-all ${
                            sortMode === value
                              ? 'border-amber-500 bg-amber-500 text-stone-950 shadow-lg shadow-amber-500/20'
                              : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-amber-500/40 hover:bg-white'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <label className="block rounded-2xl border border-stone-100 bg-white p-3 shadow-sm transition-colors focus-within:border-amber-500/60 focus-within:ring-4 focus-within:ring-amber-500/10">
<<<<<<< HEAD
                      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-stone-400">{t('menu.discovery.priceRange')}</span>
=======
                      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-stone-400">Price range</span>
>>>>>>> origin/main
                      <span className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={minPrice}
                          onChange={(event) => setMinPrice(event.target.value)}
<<<<<<< HEAD
                          placeholder={t('menu.discovery.min')}
=======
                          placeholder="Min"
>>>>>>> origin/main
                          className="h-11 min-w-0 rounded-xl border border-stone-200 bg-stone-50 px-3 text-xs font-black text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-amber-500 focus:bg-white"
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={maxPrice}
                          onChange={(event) => setMaxPrice(event.target.value)}
<<<<<<< HEAD
                          placeholder={t('menu.discovery.max')}
=======
                          placeholder="Max"
>>>>>>> origin/main
                          className="h-11 min-w-0 rounded-xl border border-stone-200 bg-stone-50 px-3 text-xs font-black text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-amber-500 focus:bg-white"
                        />
                      </span>
                    </label>

                    <div className="rounded-2xl border border-stone-100 bg-white p-3 shadow-sm">
<<<<<<< HEAD
                      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-stone-400">{t('menu.discovery.rating')}</span>
                      <div className="flex flex-wrap gap-2">
                        {[
                          ['all', t('menu.discovery.anyRating')],
                          ['5', t('menu.discovery.starsPlus', { count: 5 })],
                          ['4', t('menu.discovery.starsPlus', { count: 4 })],
                          ['3', t('menu.discovery.starsPlus', { count: 3 })],
                          ['2', t('menu.discovery.starsPlus', { count: 2 })],
                          ['1', t('menu.discovery.starsPlus', { count: 1 })],
=======
                      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-stone-400">Rating</span>
                      <div className="flex flex-wrap gap-2">
                        {[
                          ['all', 'Any rating'],
                          ['5', '5+ stars'],
                          ['4', '4+ stars'],
                          ['3', '3+ stars'],
                          ['2', '2+ stars'],
                          ['1', '1+ stars'],
>>>>>>> origin/main
                        ].map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setMinRating(value)}
                            className={`min-h-10 cursor-pointer rounded-2xl border px-3 py-2 text-xs font-black transition-all ${
                              minRating === value
                                ? 'border-amber-500 bg-amber-500 text-stone-950 shadow-lg shadow-amber-500/20'
                                : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-amber-500/40 hover:bg-white'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-2xl border px-4 py-2 text-xs font-black transition-all ${
                        availableOnly
                          ? 'border-amber-500 bg-amber-500 text-stone-950 shadow-lg shadow-amber-500/20'
                          : 'border-stone-200 bg-white text-stone-700 hover:border-amber-500/40'
                      }`}>
<<<<<<< HEAD
                        <input type="checkbox" checked={availableOnly} onChange={(event) => setAvailableOnly(event.target.checked)} className="sr-only" />
                        <Check className={`h-4 w-4 ${availableOnly ? 'opacity-100' : 'opacity-30'}`} />
                        {t('menu.discovery.availableOnly')}
=======
                        <input
                          type="checkbox"
                          checked={availableOnly}
                          onChange={(event) => setAvailableOnly(event.target.checked)}
                          className="sr-only"
                        />
                        <Check className={`h-4 w-4 ${availableOnly ? 'opacity-100' : 'opacity-30'}`} />
                        Available only
>>>>>>> origin/main
                      </label>
                      <label className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-2xl border px-4 py-2 text-xs font-black transition-all ${
                        discountedOnly
                          ? 'border-red-600 bg-red-600 text-white shadow-lg shadow-red-600/15'
                          : 'border-stone-200 bg-white text-stone-700 hover:border-amber-500/40'
                      }`}>
<<<<<<< HEAD
                        <input type="checkbox" checked={discountedOnly} onChange={(event) => setDiscountedOnly(event.target.checked)} className="sr-only" />
                        <span className="font-mono text-sm">%</span>
                        {t('menu.discovery.discounted')}
=======
                        <input
                          type="checkbox"
                          checked={discountedOnly}
                          onChange={(event) => setDiscountedOnly(event.target.checked)}
                          className="sr-only"
                        />
                        <span className="font-mono text-sm">%</span>
                        Discounted
>>>>>>> origin/main
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={clearDiscoveryFilters}
                      disabled={!hasActiveDiscoveryFilters}
                      className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-stone-950 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white shadow-lg shadow-stone-900/10 transition-all hover:bg-amber-500 hover:text-stone-950 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400 disabled:shadow-none sm:min-w-44"
                    >
                      <RotateCcw className="h-4 w-4" />
<<<<<<< HEAD
                      {t('menu.discovery.clearFilters')}
=======
                      Clear filters
>>>>>>> origin/main
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Menu Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredItems.map(item => {
              const reviewSummary = getReviewSummary(item.id);
              const isFavorite = favoriteProductIds.includes(item.id);

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.4 }}
                  key={item.id}
                  className="bg-white border border-stone-100 rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl hover:scale-[1.01] transition-all duration-300 flex flex-col group justify-between"
                >
                {/* Image Section */}
                <div className="relative h-48 overflow-hidden bg-stone-100">
                  <img
                    referrerPolicy="no-referrer"
                    src={item.image}
                    alt={getProductName(item)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />

                  <button
                    type="button"
                    onClick={() => void handleFavoriteClick(item)}
                    disabled={favoriteUpdatingId === item.id}
                    className={`absolute top-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-2xl border shadow-md backdrop-blur-md transition-all ${
                      isFavorite
                        ? 'border-red-500/20 bg-red-600 text-white'
                        : 'border-white/40 bg-stone-950/70 text-white hover:bg-amber-500 hover:text-stone-950'
                    } disabled:cursor-wait disabled:opacity-70`}
<<<<<<< HEAD
                    aria-label={isFavorite ? t('menu.card.removeFavorite') : t('menu.card.addFavorite')}
                    title={isAuthenticated ? (isFavorite ? t('menu.card.removeFavorite') : t('menu.card.addFavorite')) : t('menu.card.signInFavorite')}
=======
                    aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    title={isAuthenticated ? (isFavorite ? 'Remove from favorites' : 'Add to favorites') : 'Sign in to favorite'}
>>>>>>> origin/main
                  >
                    <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                  </button>
                  
                  {/* Popular tags or badge */}
                  {item.popular && (
                    <div className="absolute top-3 left-3 bg-amber-500 text-stone-950 px-3 py-1 rounded-full text-[10px] font-black tracking-wide flex items-center space-x-1 shadow-md">
                      <Star className="w-3 h-3 fill-current" />
                      <span>{t('menu.card.popular')}</span>
                    </div>
                  )}

                  {item.available === false && (
                    <div className="absolute inset-x-3 bottom-3 bg-stone-950/90 text-white px-3 py-2 rounded-2xl text-[10px] font-black tracking-wide text-center border border-white/10">
                      {t('common.unavailable').toUpperCase()}
                    </div>
                  )}

                  {item.discountPercent ? (
                    <div className="absolute top-14 right-3 bg-red-600 text-white px-2.5 py-1 rounded-xl text-[10px] font-black shadow-md">
                      -{item.discountPercent}%
                    </div>
                  ) : null}

                  {/* Spicy rate display */}
                  {item.spicyLevel > 0 && !item.discountPercent && (
                    <div className="absolute top-14 right-3 bg-stone-900/90 backdrop-blur-md px-2.5 py-1 rounded-xl flex items-center space-x-0.5 border border-stone-800">
                      {[...Array(item.spicyLevel)].map((_, idx) => (
                        <Flame key={idx} className="w-3.5 h-3.5 text-red-500 fill-current animate-pulse" />
                      ))}
                    </div>
                  )}
                </div>

                {/* Info Section */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-2 mb-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-extrabold text-stone-900 text-lg leading-snug">
                        {getProductName(item)}
                      </h3>
                      <div className="shrink-0 flex items-center gap-1 rounded-full bg-amber-50 border border-amber-100 px-2 py-1 text-[10px] font-black text-stone-800">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span>{reviewSummary.count ? reviewSummary.average.toFixed(1) : t('menu.card.new')}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-stone-400 font-semibold">
                      {reviewSummary.count} {t(reviewSummary.count === 1 ? 'menu.card.review' : 'menu.card.reviews')}
                    </span>
                    <p className="text-stone-500 text-xs font-light line-clamp-3 leading-relaxed">
                      {getProductDescription(item)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                    <div>
                      <span className="text-[10px] text-stone-400 block font-mono font-medium">{t('menu.card.priceStarts')}</span>
                      <span className="text-xl font-mono font-extrabold text-stone-950">
                        ₾{getDiscountedPrice(item).toFixed(2)}
                      </span>
                      {item.discountPercent ? (
                        <span className="ml-2 text-xs font-mono text-stone-400 line-through">
                          ₾{item.price.toFixed(2)}
                        </span>
                      ) : null}
                    </div>

                    <button
                      onClick={() => handleOpenCustomize(item)}
                      disabled={item.available === false}
                      className="px-4 py-2 bg-stone-950 text-white font-extrabold text-xs rounded-xl hover:bg-amber-500 hover:text-stone-950 transition-colors flex items-center space-x-1 shadow-sm cursor-pointer disabled:bg-stone-200 disabled:text-stone-500 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t('menu.card.order')}</span>
                    </button>
                  </div>
                </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* EMPTY STATE */}
        {filteredItems.length === 0 && (
          <div className="text-center py-12 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
            <ShieldAlert className="w-12 h-12 text-stone-400 mx-auto mb-3" />
<<<<<<< HEAD
            <p className="text-stone-500 text-sm font-medium">{t('menu.discovery.empty')}</p>
=======
            <p className="text-stone-500 text-sm font-medium">No products match your search and filters.</p>
            {hasActiveDiscoveryFilters && (
              <button
                type="button"
                onClick={clearDiscoveryFilters}
                className="mt-4 inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-stone-950 px-5 py-3 text-xs font-black text-white transition-colors hover:bg-amber-500 hover:text-stone-950"
              >
                <RotateCcw className="h-4 w-4" />
                Clear filters
              </button>
            )}
>>>>>>> origin/main
          </div>
        )}

      </div>

      {/* CUSTOMIZATION AND ORDERING DIALOG MODAL */}
      <AnimatePresence>
        {customizingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCustomizingItem(null)}
              className="absolute inset-0 bg-stone-950/70 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl z-10 flex flex-col max-h-[90vh]"
            >
              
              {/* Header Box */}
              <div className="p-6 border-b border-stone-100 flex items-start justify-between bg-stone-50">
                <div>
                  <div className="flex items-center space-x-2 mb-1.5">
                    <span className="text-2xl font-black text-stone-900">{getProductName(customizingItem)}</span>
                    {customizingItem.popular && <span className="bg-amber-100 text-amber-800 text-[9px] font-extrabold px-2 py-0.5 rounded-full">{t('menu.modal.popular')}</span>}
                  </div>
                  <p className="text-stone-500 text-xs font-light tracking-wide">{getProductDescription(customizingItem)}</p>
                </div>
                <button
                  onClick={() => setCustomizingItem(null)}
                  className="p-1.5 bg-white border border-stone-200 rounded-lg hover:bg-stone-100 text-stone-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                
                {/* 1. Size Selection */}
                {customizingItem.sizes && customizingItem.sizes.length > 0 && (
                  <div>
                    <span className="block text-xs font-bold font-mono tracking-wider text-stone-400 uppercase mb-3">
                      {t('menu.modal.chooseSize')}
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {customizingItem.sizes.map((size, index) => {
                        const multipliedPrice = getDiscountedPrice(customizingItem) * size.multiplier;
                        const isSelected = selectedSizeIdx === index;
                        return (
                          <button
                            key={size.label}
                            onClick={() => setSelectedSizeIdx(index)}
                            className={`p-4 rounded-2xl border text-center transition-all cursor-pointer ${
                              isSelected
                                ? 'border-amber-500 bg-amber-500/5 text-amber-600 font-bold shadow-md'
                                : 'border-stone-200 bg-white hover:border-stone-300 text-stone-700'
                            }`}
                          >
                            <span className="block text-xs font-medium whitespace-pre-line leading-tight mb-1.5">{size.label}</span>
                            <span className="font-mono text-sm font-black text-stone-900">
                              ₾{multipliedPrice.toFixed(2)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Customizations Addons Selection */}
                {customizingItem.customizations && customizingItem.customizations.length > 0 && (
                  <div>
                    <span className="block text-xs font-bold font-mono tracking-wider text-stone-400 uppercase mb-3">
                      {t('menu.modal.addOns')}
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {customizingItem.customizations.map(c => {
                        const isChecked = selectedCustomizations.includes(c.id);
                        return (
                          <div
                            key={c.id}
                            onClick={() => toggleCustomization(c.id)}
                            className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01] ${
                              isChecked
                                ? 'border-amber-500 bg-amber-500/5'
                                : 'border-stone-150 bg-white hover:border-stone-300'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                                isChecked ? 'bg-amber-500 border-amber-500 text-stone-950' : 'border-stone-300'
                              }`}>
                                {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>
                              <div className="text-left leading-tight">
                                <span className="block text-xs font-bold text-stone-900">{c.name}</span>
                                <span className="text-[10px] text-stone-500 block font-light">{c.description}</span>
                              </div>
                            </div>
                            <span className="font-mono text-xs font-black text-stone-800">
                              +₾{c.price.toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. Spice warning or notice if very spicy */}
                {customizingItem.spicyLevel >= 2 && (
                  <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start space-x-3 text-red-700">
                    <Flame className="w-5 h-5 text-red-500 fill-current flex-shrink-0 mt-0.5 animate-bounce" />
                    <div>
                      <span className="block text-xs font-bold">{t('menu.modal.spicyTitle')}</span>
                      <p className="text-[10px] leading-relaxed text-red-650 font-sans mt-0.5">
                        {t('menu.modal.spicyBody')}
                      </p>
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <span className="block text-xs font-bold font-mono tracking-wider text-stone-400 uppercase">
                        {t('menu.modal.productReviews')}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                selectedProductReviewSummary && star <= Math.round(selectedProductReviewSummary.average)
                                  ? 'text-amber-500 fill-amber-500'
                                  : 'text-stone-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-black text-stone-800">
                          {selectedProductReviewSummary?.count
                            ? `${selectedProductReviewSummary.average.toFixed(1)} (${selectedProductReviewSummary.count})`
                            : t('menu.modal.noReviews')}
                        </span>
                      </div>
                    </div>
                    {!isAuthenticated && (
                      <button
                        type="button"
                        onClick={onRequireAuth}
                        className="px-4 py-2 rounded-xl bg-stone-950 text-white text-xs font-black hover:bg-amber-500 hover:text-stone-950 transition-colors"
                      >
                        {t('menu.modal.signInToReview')}
                      </button>
                    )}
                  </div>

                  {isAuthenticated && (
                    <form onSubmit={handleSubmitReview} className="space-y-3">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewRating(star)}
                            className="p-1 rounded-lg hover:bg-amber-100 transition-colors"
                            aria-label={t('menu.modal.rateStar', { count: star })}
                          >
                            <Star
                              className={`w-6 h-6 ${
                                star <= reviewRating ? 'text-amber-500 fill-amber-500' : 'text-stone-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={reviewComment}
                        onChange={(event) => setReviewComment(event.target.value)}
                        rows={3}
                        maxLength={600}
                        placeholder={t('menu.modal.shareReview')}
                        className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none"
                      />
                      {reviewError && (
                        <p className="text-xs font-semibold text-red-600">{reviewError}</p>
                      )}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          type="submit"
                          disabled={reviewSubmitting || !reviewComment.trim()}
                          className="flex-1 py-2.5 rounded-xl bg-amber-500 text-stone-950 text-xs font-black hover:bg-amber-600 disabled:bg-stone-200 disabled:text-stone-500 disabled:cursor-not-allowed transition-colors"
                        >
                          {reviewSubmitting ? t('common.saving') : existingUserReview ? t('menu.modal.updateReview') : t('menu.modal.saveReview')}
                        </button>
                        {existingUserReview && (
                          <button
                            type="button"
                            disabled={reviewSubmitting}
                            onClick={handleDeleteOwnReview}
                            className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 text-xs font-black hover:bg-red-50 disabled:opacity-60 transition-colors"
                          >
                            {t('common.delete')}
                          </button>
                        )}
                      </div>
                    </form>
                  )}

                  <div className="space-y-2">
                    {(selectedProductReviewSummary?.reviews ?? []).slice(0, 3).map((review) => (
                      <div key={review.id} className="rounded-xl bg-white border border-stone-100 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-black text-stone-900">
                            {review.userName || review.author}
                          </span>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-3 h-3 ${
                                  star <= review.rating ? 'text-amber-500 fill-amber-500' : 'text-stone-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-stone-500 leading-relaxed mt-1">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Bottom Footer Actions with Quantity */}
              <div className="p-6 border-t border-stone-150 bg-stone-50 flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-between gap-4">
                
                {/* Quantity adjustments */}
                <div className="flex items-center justify-center space-x-3 bg-white border border-stone-200 p-1.5 rounded-2xl self-center">
                  <button
                    disabled={quantity <= 1}
                    onClick={() => setQuantity(q => q - 1)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-stone-50 hover:bg-stone-100 text-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    -
                  </button>
                  <span className="font-mono text-base font-black w-8 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(q => q + 1)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-stone-50 hover:bg-stone-100 text-stone-700 transition-colors"
                  >
                    +
                  </button>
                </div>

                {/* Add confirm button with price update */}
                <button
                  onClick={handleAddConfirm}
                  className="flex-1 py-3.5 px-6 rounded-2xl bg-stone-950 text-white font-extrabold text-sm sm:text-base hover:bg-amber-500 hover:text-stone-900 shadow-xl shadow-stone-900/10 transition-colors flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>{t('menu.modal.addToCart')}</span>
                  <span className="font-mono font-black ml-1.5 border-l border-white/25 pl-2">
                    ₾{calculateCurrentPrice().toFixed(2)}
                  </span>
                </button>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
