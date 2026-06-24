import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useScroll } from 'motion/react';
import {
  Menu,
  X,
  ShoppingBag,
  Flame,
  Settings,
  UtensilsCrossed,
  MessageSquare,
  Landmark,
  LogIn,
  UserRound,
} from 'lucide-react';

interface NavbarProps {
  cartCount: number;
  onOpenCart: () => void;
  activeView: 'client' | 'admin' | 'banking' | 'profile';
  onChangeView: (view: 'client' | 'admin' | 'banking' | 'profile') => void;
  onOpenBanking: () => void;
  onScrollTo: (elementId: string) => void;
  isAdminUser: boolean;
  isAuthenticated: boolean;
  onOpenAuth: () => void;
}

type NavItem = {
  label: string;
  icon: React.ReactNode;
  action: () => void;
  active?: boolean;
};

export default function Navbar({
  cartCount,
  onOpenCart,
  activeView,
  onChangeView,
  onOpenBanking,
  onScrollTo,
  isAdminUser,
  isAuthenticated,
  onOpenAuth,
}: NavbarProps) {
  const { scrollYProgress } = useScroll();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [activeView]);

  const desktopItems = useMemo<NavItem[]>(() => {
    if (activeView !== 'client') return [];

    return [
      {
        label: 'მენიუ',
        icon: <UtensilsCrossed className="w-4 h-4 text-amber-500/80" />,
        action: () => onScrollTo('menu'),
      },
      {
        label: 'ანატომია',
        icon: <Flame className="w-4 h-4 text-amber-500/80" />,
        action: () => onScrollTo('anatomy'),
      },
      {
        label: 'შეფასებები',
        icon: <MessageSquare className="w-4 h-4 text-amber-500/80" />,
        action: () => onScrollTo('reviews'),
      },
      ...(isAdminUser
        ? [
            {
              label: 'ანგარიშები',
              icon: <Landmark className="w-4 h-4 text-amber-500/80" />,
              action: onOpenBanking,
            },
          ]
        : []),
    ];
  }, [activeView, isAdminUser, onOpenBanking, onScrollTo]);

  const mobileItems = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [];

    if (activeView === 'client') {
      items.push(
        {
          label: 'მენიუ',
          icon: <UtensilsCrossed className="w-4 h-4" />,
          action: () => onScrollTo('menu'),
        },
        {
          label: 'ანატომია',
          icon: <Flame className="w-4 h-4" />,
          action: () => onScrollTo('anatomy'),
        },
        {
          label: 'შეფასებები',
          icon: <MessageSquare className="w-4 h-4" />,
          action: () => onScrollTo('reviews'),
        },
        ...(isAdminUser
          ? [
              {
                label: 'ანგარიშები',
                icon: <Landmark className="w-4 h-4" />,
                action: onOpenBanking,
              },
            ]
          : [])
      );
    }

    if ((activeView === 'banking' && isAdminUser) || activeView === 'profile') {
      items.push({
        label: 'საიტზე დაბრუნება',
        icon: <Landmark className="w-4 h-4" />,
        action: () => onChangeView('client'),
      });
    }

    if (activeView === 'admin' && isAdminUser) {
      items.push({
        label: 'საიტზე დაბრუნება',
        icon: <Landmark className="w-4 h-4" />,
        action: () => onChangeView('client'),
      });
    }

    if (isAdminUser) {
      items.push({
        label: activeView === 'admin' ? 'ადმინი' : 'ადმინ პანელი',
        icon: <Settings className={`w-4 h-4 ${activeView === 'admin' ? 'animate-spin' : ''}`} />,
        action: () => onChangeView(activeView === 'client' ? 'admin' : 'client'),
      });
    }

    items.push({
      label: isAuthenticated ? 'პროფილი / Profile' : 'შესვლა / Sign In',
      icon: isAuthenticated ? <UserRound className="w-4 h-4" /> : <LogIn className="w-4 h-4" />,
      action: isAuthenticated ? () => onChangeView('profile') : onOpenAuth,
    });

    return items;
  }, [activeView, isAdminUser, isAuthenticated, onChangeView, onOpenAuth, onOpenBanking, onScrollTo]);

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        className="fixed top-0 left-0 right-0 z-50 bg-stone-900/95 backdrop-blur-md shadow-2xl border-b border-stone-800"
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
                <span className="block text-xl font-black tracking-tighter text-white font-mono sm:text-2xl">
                  Shaurm<span className="text-amber-500">YAN</span>
                </span>
                <span className="block text-[8px] font-mono uppercase tracking-widest text-amber-500/80 sm:text-[9px]">
                  Premium Quality
                </span>
              </div>
            </button>

            <div className="hidden items-center gap-6 md:flex">
              {desktopItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.action}
                  className="flex cursor-pointer items-center gap-1.5 text-sm font-medium tracking-wide text-stone-300 transition-colors hover:text-amber-500"
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}

              {(activeView === 'banking' || activeView === 'profile') && (
                <button
                  type="button"
                  onClick={() => onChangeView('client')}
                  className="rounded-xl border border-stone-800 bg-stone-900 px-4 py-2.5 text-sm font-black text-stone-300 transition-colors cursor-pointer hover:bg-stone-800 hover:text-amber-400"
                >
                  საიტზე დაბრუნება
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {activeView === 'client' && (
                <>
                  <motion.button
                    id="checkout-cart-btn"
                    onClick={onOpenCart}
                    whileTap={{ scale: 0.95 }}
                    className="relative flex cursor-pointer items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-3 font-black text-stone-950 shadow-lg shadow-amber-500/20 transition-all hover:from-amber-600 hover:to-amber-700 sm:px-5 sm:py-2.5"
                  >
                    <ShoppingBag className="h-5 w-5 sm:mr-2" />
                    <span className="hidden sm:inline">კალათა</span>
                    {cartCount > 0 && (
                      <motion.span
                        key={cartCount}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                        className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-stone-900 bg-red-600 px-1.5 text-xs font-bold text-white shadow-md"
                      >
                        {cartCount}
                      </motion.span>
                    )}
                  </motion.button>
                </>
              )}

              {isAdminUser && (
                <button
                  type="button"
                  onClick={() => onChangeView(activeView === 'client' ? 'admin' : 'client')}
                  className={`hidden cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-black transition-all sm:flex sm:text-sm
                    ${
                      activeView === 'admin'
                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                        : 'border-transparent bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 hover:from-amber-600 hover:to-amber-700'
                    }`}
                  title={activeView === 'admin' ? 'ადმინ პანელიდან გასვლა' : 'ადმინ პანელში გადასვლა'}
                >
                  <Settings className={`h-4.5 w-4.5 ${activeView === 'admin' ? 'animate-spin' : ''}`} />
                  <span>{activeView === 'admin' ? 'ადმინი' : 'ადმინ პანელი'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={isAuthenticated ? () => onChangeView('profile') : onOpenAuth}
                className={`hidden cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-black transition-all sm:flex sm:text-sm ${
                  activeView === 'profile'
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                    : 'border-stone-800 bg-stone-900 text-stone-300 hover:bg-stone-800 hover:text-amber-400'
                }`}
              >
                {isAuthenticated ? <UserRound className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                <span>{isAuthenticated ? 'პროფილი / Profile' : 'შესვლა / Sign In'}</span>
              </button>

              <button
                type="button"
                onClick={() => setMobileOpen((prev) => !prev)}
                className="flex cursor-pointer items-center justify-center rounded-xl border border-stone-800 bg-stone-900 p-3 text-stone-200 transition-colors hover:bg-stone-800 md:hidden"
                aria-expanded={mobileOpen}
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
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
            className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm md:hidden"
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
              className="absolute right-0 top-0 h-full w-[84vw] max-w-sm border-l border-stone-800 bg-stone-950 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-stone-800 px-4 py-4">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-amber-400">
                    Navigation
                  </p>
                  <h2 className="text-lg font-black text-white">ShaurmYAN</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl border border-stone-800 bg-stone-900 p-2 text-stone-200 transition-colors cursor-pointer hover:bg-stone-800"
                  aria-label="Close menu"
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
                    className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-stone-800 bg-stone-900 px-4 py-3 text-left text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800 hover:text-amber-400"
                  >
                    <span className="text-amber-400">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}

                {activeView === 'client' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      onOpenCart();
                    }}
                    className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3 text-sm font-black text-stone-950 shadow-lg shadow-amber-500/20 transition-colors hover:from-amber-400 hover:to-amber-500"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    <span>კალათა</span>
                    <span className="rounded-full bg-stone-950/10 px-2 py-0.5 text-xs">
                      {cartCount}
                    </span>
                  </button>
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
