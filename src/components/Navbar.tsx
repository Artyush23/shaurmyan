import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useScroll } from 'motion/react';
import {
  ChevronDown,
  Flame,
  Languages,
  Landmark,
  LogIn,
  Menu,
  MessageSquare,
  Route,
  ShoppingBag,
  UserRound,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supportedLanguages, type SupportedLanguage } from '../i18n';

interface NavbarProps {
  cartCount: number;
  onOpenCart: () => void;
  activeOrderCount?: number;
  onOpenTracking?: () => void;
  activeView: 'client' | 'admin' | 'banking' | 'profile';
  onChangeView: (view: 'client' | 'admin' | 'banking' | 'profile') => void;
  onScrollTo: (elementId: string) => void;
  isAuthenticated: boolean;
  onOpenAuth: () => void;
}

type NavItem = {
  label: string;
  icon: React.ReactNode;
  action: () => void;
};

export default function Navbar({
  cartCount,
  onOpenCart,
  activeOrderCount = 0,
  onOpenTracking,
  activeView,
  onChangeView,
  onScrollTo,
  isAuthenticated,
  onOpenAuth,
}: NavbarProps) {
  const { t, i18n } = useTranslation();
  const { scrollYProgress } = useScroll();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const currentLanguage = (i18n.resolvedLanguage || i18n.language || 'ka')
    .split('-')[0] as SupportedLanguage;
  const activeLanguage =
    supportedLanguages.find((language) => language.code === currentLanguage) ??
    supportedLanguages[0];

  useEffect(() => {
    setMobileOpen(false);
  }, [activeView]);

  const homeItems = useMemo<NavItem[]>(
    () => [
      {
        label: t('navbar.menu'),
        icon: <UtensilsCrossed className="h-4 w-4" />,
        action: () => onScrollTo('menu'),
      },
      {
        label: t('navbar.anatomy'),
        icon: <Flame className="h-4 w-4" />,
        action: () => onScrollTo('anatomy'),
      },
      {
        label: t('navbar.reviews'),
        icon: <MessageSquare className="h-4 w-4" />,
        action: () => onScrollTo('reviews'),
      },
    ],
    [onScrollTo, t]
  );

  const mobileItems = useMemo<NavItem[]>(() => {
    const items = activeView === 'client' ? [...homeItems] : [];

    if (activeView !== 'client') {
      items.push({
        label: t('navbar.backToSite'),
        icon: <Landmark className="h-4 w-4" />,
        action: () => onChangeView('client'),
      });
    }

    items.push({
      label: isAuthenticated ? t('navbar.profile') : t('navbar.signIn'),
      icon: isAuthenticated ? <UserRound className="h-4 w-4" /> : <LogIn className="h-4 w-4" />,
      action: isAuthenticated ? () => onChangeView('profile') : onOpenAuth,
    });

    return items;
  }, [activeView, homeItems, isAuthenticated, onChangeView, onOpenAuth, t]);

  const changeLanguage = (language: SupportedLanguage) => {
    localStorage.setItem('i18nextLng', language);
    void i18n.changeLanguage(language);
    setLanguageOpen(false);
  };

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        className="fixed inset-x-0 top-0 z-50 border-b border-stone-800 bg-stone-900/95 shadow-2xl backdrop-blur-md"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between sm:h-20">
            <button
              type="button"
              className="flex cursor-pointer items-center space-x-2 text-left"
              onClick={() => {
                onChangeView('client');
                setTimeout(() => onScrollTo('hero'), 100);
              }}
            >
              <motion.div
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.5 }}
                className="rounded-xl bg-gradient-to-br from-amber-500 to-red-600 p-2.5 shadow-lg shadow-red-500/20"
              >
                <Flame className="h-5 w-5 text-white sm:h-6 sm:w-6" />
              </motion.div>
              <div className="leading-tight">
                <span className="block font-mono text-xl font-black tracking-tighter text-white sm:text-2xl">
                  Shaurm<span className="text-amber-500">YAN</span>
                </span>
                <span className="block font-mono text-[8px] uppercase tracking-widest text-amber-500/80 sm:text-[9px]">
                  {t('navbar.premiumQuality')}
                </span>
              </div>
            </button>

            <div className="hidden items-center gap-5 lg:flex">
              {activeView === 'client' &&
                homeItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.action}
                    className="flex cursor-pointer items-center gap-1.5 text-sm font-medium text-stone-300 transition-colors hover:text-amber-500"
                  >
                    <span className="text-amber-500/80">{item.icon}</span>
                    {item.label}
                  </button>
                ))}

              {activeView !== 'client' && (
                <button
                  type="button"
                  onClick={() => onChangeView('client')}
                  className="cursor-pointer rounded-xl border border-stone-800 bg-stone-900 px-4 py-2.5 text-sm font-black text-stone-300 transition-colors hover:bg-stone-800 hover:text-amber-400"
                >
                  {t('navbar.backToSite')}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative hidden sm:block">
                <button
                  type="button"
                  onClick={() => setLanguageOpen((open) => !open)}
                  className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-stone-800 bg-stone-950 px-3 text-xs font-black text-stone-200 transition-colors hover:border-amber-500/30 hover:text-amber-400"
                  aria-expanded={languageOpen}
                  aria-label={t('navbar.language')}
                >
                  <Languages className="h-4 w-4 text-amber-400" />
                  {activeLanguage.label}
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${languageOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {languageOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="absolute right-0 top-[calc(100%+0.5rem)] w-44 overflow-hidden rounded-2xl border border-stone-800 bg-stone-950 p-1.5 shadow-2xl"
                    >
                      {supportedLanguages.map((language) => (
                        <button
                          key={language.code}
                          type="button"
                          onClick={() => changeLanguage(language.code)}
                          className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs transition-colors ${
                            language.code === activeLanguage.code
                              ? 'bg-amber-500 text-stone-950'
                              : 'text-stone-300 hover:bg-stone-900 hover:text-amber-400'
                          }`}
                        >
                          <span className="font-black">{language.label}</span>
                          <span>{language.name}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {activeView === 'client' && (
                <>
                  {activeOrderCount > 0 && onOpenTracking && (
                    <motion.button
                      type="button"
                      onClick={onOpenTracking}
                      whileTap={{ scale: 0.95 }}
                      className="relative hidden min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 text-xs font-black uppercase tracking-[0.14em] text-amber-400 transition-colors hover:bg-amber-500 hover:text-stone-950 sm:flex"
                    >
                      <Route className="h-4 w-4" />
                      Track
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] text-white">
                        {activeOrderCount}
                      </span>
                    </motion.button>
                  )}
                  <motion.button
                    id="checkout-cart-btn"
                    onClick={onOpenCart}
                    whileTap={{ scale: 0.95 }}
                    className="relative flex cursor-pointer items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-3 font-black text-stone-950 shadow-lg shadow-amber-500/20 transition-all hover:from-amber-400 hover:to-amber-500 sm:px-5 sm:py-2.5"
                  >
                    <ShoppingBag className="h-5 w-5 sm:mr-2" />
                    <span className="hidden sm:inline">{t('navbar.cart')}</span>
                    {cartCount > 0 && (
                      <motion.span
                        key={cartCount}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-stone-900 bg-red-600 px-1.5 text-xs font-bold text-white"
                      >
                        {cartCount}
                      </motion.span>
                    )}
                  </motion.button>
                </>
              )}

              <button
                type="button"
                onClick={isAuthenticated ? () => onChangeView('profile') : onOpenAuth}
                className={`hidden min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-4 text-sm font-black transition-colors md:flex ${
                  activeView === 'profile'
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                    : 'border-stone-800 bg-stone-900 text-stone-300 hover:bg-stone-800 hover:text-amber-400'
                }`}
              >
                {isAuthenticated ? <UserRound className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                {isAuthenticated ? t('navbar.profile') : t('navbar.signIn')}
              </button>

              <button
                type="button"
                onClick={() => setMobileOpen((open) => !open)}
                className="flex cursor-pointer items-center justify-center rounded-xl border border-stone-800 bg-stone-900 p-3 text-stone-200 transition-colors hover:bg-stone-800 lg:hidden"
                aria-expanded={mobileOpen}
                aria-label={mobileOpen ? t('common.close') : t('navbar.navigation')}
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        <motion.div
          className="h-1 origin-left bg-gradient-to-r from-amber-500 via-red-500 to-amber-600"
          style={{ scaleX: scrollYProgress }}
        />
      </motion.nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              className="absolute right-0 top-0 h-full w-[86vw] max-w-sm overflow-y-auto border-l border-stone-800 bg-stone-950 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-stone-800 px-4 py-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-amber-400">
                    {t('navbar.navigation')}
                  </p>
                  <h2 className="text-lg font-black text-white">ShaurmYAN</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="cursor-pointer rounded-xl border border-stone-800 bg-stone-900 p-2 text-stone-200 hover:bg-stone-800"
                  aria-label={t('common.close')}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-2 px-4 py-4">
                {mobileItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      item.action();
                    }}
                    className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-2xl border border-stone-800 bg-stone-900 px-4 py-3 text-left text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800 hover:text-amber-400"
                  >
                    <span className="text-amber-400">{item.icon}</span>
                    {item.label}
                  </button>
                ))}

                <div className="pt-3">
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-stone-500">
                    {t('navbar.language')}
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {supportedLanguages.map((language) => (
                      <button
                        key={language.code}
                        type="button"
                        onClick={() => changeLanguage(language.code)}
                        className={`min-h-11 cursor-pointer rounded-xl border text-xs font-black transition-colors ${
                          language.code === activeLanguage.code
                            ? 'border-amber-500 bg-amber-500 text-stone-950'
                            : 'border-stone-800 bg-stone-900 text-stone-300 hover:text-amber-400'
                        }`}
                      >
                        {language.label}
                      </button>
                    ))}
                  </div>
                </div>

                {activeView === 'client' && (
                  <div className="mt-3 grid grid-cols-1 gap-2">
                    {activeOrderCount > 0 && onOpenTracking && (
                      <button
                        type="button"
                        onClick={() => {
                          setMobileOpen(false);
                          onOpenTracking();
                        }}
                        className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm font-black text-amber-400"
                      >
                        <Route className="h-4 w-4" />
                        Track Order
                        <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">{activeOrderCount}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setMobileOpen(false);
                        onOpenCart();
                      }}
                      className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3 text-sm font-black text-stone-950"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      {t('navbar.cart')}
                      <span className="rounded-full bg-stone-950/10 px-2 py-0.5 text-xs">{cartCount}</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-16 sm:h-20" />
    </>
  );
}
