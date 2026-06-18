import React, { useEffect, useState } from 'react';
import { motion, useScroll } from 'motion/react';
import { ShoppingBag, Flame, Settings, UtensilsCrossed, MessageSquare } from 'lucide-react';
import { getCurrentUser } from '../firebase';

interface NavbarProps {
  cartCount: number;
  onOpenCart: () => void;
  activeView: 'client' | 'admin';
  onChangeView: (view: 'client' | 'admin') => void;
  onScrollTo: (elementId: string) => void;
}

const ADMIN_EMAIL = "artyushcharchyan0@gmail.com";

export default function Navbar({
  cartCount,
  onOpenCart,
  activeView,
  onChangeView,
  onScrollTo,
}: NavbarProps) {
  const { scrollYProgress } = useScroll();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser()
      .then((user) => {
        if (user && user.email) {
          setUserEmail(user.email);
        } else {
          setUserEmail(null);
        }
      })
      .catch(() => {
        setUserEmail(null);
      });
  }, [activeView]); // Re-check when view toggles to keep state fresh

  const isUserAdmin = userEmail === ADMIN_EMAIL;

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        className="fixed top-0 left-0 right-0 z-50 bg-stone-900/95 backdrop-blur-md shadow-2xl border-b border-stone-800"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div
              className="flex items-center space-x-2 cursor-pointer group"
              onClick={() => {
                onChangeView('client');
                setTimeout(() => onScrollTo('hero'), 100);
              }}
            >
              <motion.div
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.5 }}
                className="bg-gradient-to-br from-amber-500 to-red-600 p-2.5 rounded-xl shadow-lg shadow-red-500/20"
              >
                <Flame className="w-6 h-6 text-white" />
              </motion.div>
              <div className="leading-tight">
                <span className="text-2xl font-black tracking-tighter text-white font-mono">
                  Shaurm<span className="text-amber-500">YAN</span>
                </span>
                <span className="block text-[9px] text-amber-500/80 font-mono tracking-widest uppercase">
                  Premium Quality
                </span>
              </div>
            </div>

            {/* Navigation links (only for client view) */}
            <div className="hidden md:flex items-center space-x-8">
              {activeView === 'client' ? (
                <>
                  <button
                    onClick={() => onScrollTo('menu')}
                    className="flex items-center space-x-1.5 text-stone-300 hover:text-amber-500 font-medium tracking-wide transition-colors text-sm"
                  >
                    <UtensilsCrossed className="w-4 h-4 text-amber-500/80" />
                    <span>მენიუ</span>
                  </button>
                  <button
                    onClick={() => onScrollTo('anatomy')}
                    className="flex items-center space-x-1.5 text-stone-300 hover:text-amber-500 font-medium tracking-wide transition-colors text-sm"
                  >
                    <Flame className="w-4 h-4 text-amber-500/80" />
                    <span>ანატომია</span>
                  </button>
                  <button
                    onClick={() => onScrollTo('reviews')}
                    className="flex items-center space-x-1.5 text-stone-300 hover:text-amber-500 font-medium tracking-wide transition-colors text-sm"
                  >
                    <MessageSquare className="w-4 h-4 text-amber-500/80" />
                    <span>შეფასებები</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => onChangeView('client')}
                  className="text-stone-300 hover:text-amber-500 font-medium transition-colors text-sm"
                >
                  ◀ საიტზე დაბრუნება
                </button>
              )}
            </div>

            {/* Actions (Cart / Admin toggling) */}
            <div className="flex items-center space-x-4">
              {activeView === 'client' && (
                <motion.button
                  id="checkout-cart-btn"
                  onClick={onOpenCart}
                  whileTap={{ scale: 0.95 }}
                  className="relative flex items-center justify-center p-3 sm:px-5 sm:py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 font-black rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer text-sm"
                >
                  <ShoppingBag className="w-5 h-5 sm:mr-2" />
                  <span className="hidden sm:inline">კალათა</span>
                  {cartCount > 0 && (
                    <motion.span
                      key={cartCount}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                      className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-xs font-bold rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center border-2 border-stone-900 shadow-md"
                    >
                      {cartCount}
                    </motion.span>
                  )}
                </motion.button>
              )}

              {/* View Switcher Button (Only if user is admin) */}
              {isUserAdmin && (
                <button
                  onClick={() => onChangeView(activeView === 'client' ? 'admin' : 'client')}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition-all ${
                    activeView === 'admin'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      : 'bg-stone-800 border-stone-700 text-stone-300 hover:bg-stone-700 hover:text-white'
                  }`}
                  title={activeView === 'admin' ? 'ადმინ პანელიდან გასვლა' : 'ადმინ პანელში შესვლა'}
                >
                  <Settings className={`w-4.5 h-4.5 ${activeView === 'admin' ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">
                    {activeView === 'admin' ? 'ადმინი' : 'ადმინ პანელი'}
                  </span>
                </button>
              )}

              {/* DEBUG: Force Admin View Button (remove in production) */}
              {!isUserAdmin && activeView === 'client' && (
                <button
                  onClick={() => onChangeView('admin')}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-red-600/20 border border-red-500/50 hover:bg-red-600/30 text-red-400 text-xs font-bold rounded-lg transition-colors"
                  title="Debug: Force admin view (remove in production)"
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Force Admin View</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Scroll Progress indicator */}
        <motion.div
          className="h-1 bg-gradient-to-r from-amber-500 via-red-500 to-amber-600 origin-left"
          style={{ scaleX: scrollYProgress }}
        />
      </motion.nav>
      {/* Spacer to avoid navbar overlap */}
      <div className="h-20" />
    </>
  );
}
