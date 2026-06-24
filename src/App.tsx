import React, { useEffect, useRef, useState } from 'react';
import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isAdminEmail } from './firebase';
import { MenuItem, CartItem, Order, Review } from './types';

// Component imports
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ScrollShowcase from './components/ScrollShowcase';
import Menu from './components/Menu';
import Reviews from './components/Reviews';
import Cart from './components/Cart';
import AdminPanel from './components/AdminPanel';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import BankingDashboard from './components/BankingDashboard';
import { INITIAL_MENU, INITIAL_REVIEWS } from './data/initialData';
import { useAuth } from './hooks/useAuth';

type CheckoutArgs = [
  string,
  string,
  string,
  'cash' | 'card_courier' | 'card_online',
  string?
];

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const [activeView, setActiveView] = useState<'client' | 'admin' | 'banking'>('client');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    const saved = localStorage.getItem('shaurmyan_menu');
    return saved ? JSON.parse(saved) : INITIAL_MENU;
  });


  const [reviews, setReviews] = useState<Review[]>(() => {
    const saved = localStorage.getItem('shaurmyan_reviews');
    return saved ? JSON.parse(saved) : INITIAL_REVIEWS;
  });

  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('shaurmyan_cart');
    return saved ? JSON.parse(saved) : [];
  });

  const pendingCheckoutRef = useRef<{
    resolve: () => void;
    reject: (error: Error) => void;
    args: CheckoutArgs;
  } | null>(null);
  const pendingProtectedViewRef = useRef<'banking' | null>(null);

  useEffect(() => {
    localStorage.setItem('shaurmyan_menu', JSON.stringify(menuItems));
  }, [menuItems]);

  useEffect(() => {
    localStorage.setItem('shaurmyan_reviews', JSON.stringify(reviews));
  }, [reviews]);

  useEffect(() => {
    localStorage.setItem('shaurmyan_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const isAdminUser = isAdminEmail(user?.email ?? null);

  const handleScrollTo = (elementId: string) => {
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleAddToCart = (
    item: MenuItem,
    selectedSize: string,
    selectedPrice: number,
    addedCustomizations: string[],
    quantity: number
  ) => {
    const cartId = `${item.id}-${selectedSize}-${addedCustomizations.sort().join(',')}`;

    setCartItems((prev) => {
      const existingIdx = prev.findIndex((ci) => ci.id === cartId);
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += quantity;
        return updated;
      }

      return [
        ...prev,
        {
          id: cartId,
          menuItem: item,
          selectedSize,
          selectedPrice,
          addedCustomizations,
          quantity,
        },
      ];
    });

    setIsCartOpen(true);
  };

  const handleUpdateCartQuantity = (cartId: string, delta: number) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.id === cartId) {
          const newQ = item.quantity + delta;
          return newQ > 0 ? { ...item, quantity: newQ } : item;
        }
        return item;
      })
    );
  };

  const handleRemoveCartItem = (cartId: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== cartId));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const handleAddReview = (author: string, rating: number, comment: string) => {
    const newRev: Review = {
      id: `rev-${Date.now()}`,
      author,
      rating,
      comment,
      createdAt: new Date().toISOString(),
      approved: false,
    };
    setReviews((prev) => [newRev, ...prev]);
  };

  const submitOrderNow = async (
    customerName: string,
    customerPhone: string,
    customerAddress: string,
    paymentMethod: 'cash' | 'card_courier' | 'card_online',
    notes?: string
  ) => {
    const itemsTotal = cartItems.reduce(
      (sum, item) => sum + item.selectedPrice * item.quantity,
      0
    );
    const deliveryFee = itemsTotal > 30 ? 0 : 3.0;
    const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      await setDoc(doc(db, 'orders', orderId), {
        customerName,
        customerPhone,
        customerAddress,
        paymentMethod,
        items: cartItems.map((item) => ({
          name: item.menuItem.name,
          size: item.selectedSize,
          extras: item.addedCustomizations.map((cId) => {
            const cObj = item.menuItem.customizations.find((c) => c.id === cId);
            return cObj?.name || cId;
          }),
          price: item.selectedPrice,
          quantity: item.quantity,
        })),
        totalPrice: itemsTotal + deliveryFee,
        status: 'new',
        createdAt: serverTimestamp(),
        notes: notes ?? null,
      });
    } catch (error) {
      console.error('Failed to place order in Firestore:', error);
      throw error;
    }
  };

  const resumePendingCheckout = async () => {
    const pending = pendingCheckoutRef.current;
    if (!pending) {
      setAuthModalOpen(false);
      return;
    }

    pendingCheckoutRef.current = null;

    try {
      const [customerName, customerPhone, customerAddress, paymentMethod, notes] = pending.args;
      await submitOrderNow(customerName, customerPhone, customerAddress, paymentMethod, notes);
      pending.resolve();
    } catch (error) {
      pending.reject(error instanceof Error ? error : new Error('Checkout failed.'));
    } finally {
      setAuthModalOpen(false);
    }
  };

  const handleAuthModalClose = () => {
    const pending = pendingCheckoutRef.current;
    pendingCheckoutRef.current = null;
    pendingProtectedViewRef.current = null;
    setAuthModalOpen(false);

    if (pending) {
      pending.reject(new Error('Authentication is required to complete checkout.'));
    }
  };

  const handleOpenBanking = () => {
    if (authLoading) {
      return;
    }

    if (user) {
      setActiveView('banking');
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      return;
    }

    pendingProtectedViewRef.current = 'banking';
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = () => {
    if (pendingCheckoutRef.current) {
      void resumePendingCheckout();
      return;
    }

    if (pendingProtectedViewRef.current === 'banking') {
      pendingProtectedViewRef.current = null;
      setActiveView('banking');
      setAuthModalOpen(false);
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      return;
    }

    setAuthModalOpen(false);
  };

  const handlePlaceOrder = async (
    customerName: string,
    customerPhone: string,
    customerAddress: string,
    paymentMethod: 'cash' | 'card_courier' | 'card_online',
    notes?: string
  ) => {
    if (authLoading) {
      throw new Error('Authentication is still loading. Please wait a moment and try again.');
    }

    if (!user) {
      return new Promise<void>((resolve, reject) => {
        pendingCheckoutRef.current = {
          resolve,
          reject,
          args: [customerName, customerPhone, customerAddress, paymentMethod, notes],
        };
        setAuthModalOpen(true);
      });
    }

    return submitOrderNow(customerName, customerPhone, customerAddress, paymentMethod, notes);
  };

  const handleUpdateOrderStatus = async (orderId: string, status: Order['status']) => {
    if (!isAdminUser) return;

    try {
      await updateDoc(doc(db, 'orders', orderId), { status });
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!isAdminUser) return;

    try {
      await deleteDoc(doc(db, 'orders', orderId));
    } catch (error) {
      console.error('Failed to delete order:', error);
    }
  };

  const handleUpdateMenuPrice = (itemId: string, newPrice: number) => {
    setMenuItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            price: newPrice,
            sizes: item.sizes.map((s, idx) => ({
              ...s,
              price: idx === 0 ? newPrice : Number((newPrice * s.multiplier).toFixed(2)),
            })),
          };
        }
        return item;
      })
    );
  };

  const handleAddNewMenuItem = (newItem: MenuItem) => {
    setMenuItems((prev) => [...prev, newItem]);
  };

  const handleDeleteMenuItem = (itemId: string) => {
    setMenuItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleApproveReview = (reviewId: string) => {
    setReviews((prev) => prev.map((r) => (r.id === reviewId ? { ...r, approved: true } : r)));
  };

  const handleDeleteReview = (reviewId: string) => {
    setReviews((prev) => prev.filter((r) => r.id !== reviewId));
  };

  const totalCartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-amber-500 selection:text-stone-950">
      <Navbar
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        activeView={activeView}
        onChangeView={(view) => {
          setActiveView(view);
          window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
        }}
        onOpenBanking={handleOpenBanking}
        onScrollTo={handleScrollTo}
      />

      <main className="flex-1">
        {activeView === 'client' ? (
          <>
            <Hero onScrollToMenu={() => handleScrollTo('menu')} />
            <ScrollShowcase />
            <Menu menuItems={menuItems} onAddToCart={handleAddToCart} />
            <Reviews reviews={reviews} onAddReview={handleAddReview} />
          </>
        ) : activeView === 'admin' ? (
          <AdminPanel
            menuItems={menuItems}
            reviews={reviews}
            isAdminAuthorized={isAdminUser}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onDeleteOrder={handleDeleteOrder}
            onUpdateMenuPrice={handleUpdateMenuPrice}
            onAddNewMenuItem={handleAddNewMenuItem}
            onDeleteMenuItem={handleDeleteMenuItem}
            onApproveReview={handleApproveReview}
            onDeleteReview={handleDeleteReview}
          />
        ) : user ? (
          <BankingDashboard
            onRefresh={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onDownloadStatement={() => {
              console.log('Download statement requested');
            }}
            onExportSummary={() => {
              console.log('Export summary requested');
            }}
          />
        ) : (
          <section className="min-h-[60vh] bg-stone-950 text-stone-100 charcoal-grid-bg flex items-center justify-center px-4">
            <div className="max-w-md w-full rounded-3xl border border-stone-800 bg-stone-950/90 p-8 text-center shadow-2xl">
              <span className="block text-amber-500 font-black text-xs uppercase tracking-widest font-mono mb-2">
                Secure Access
              </span>
              <h2 className="text-2xl font-black text-white">Banking requires sign-in</h2>
              <p className="mt-3 text-sm text-stone-400 leading-relaxed">
                Sign in to view balances, transactions, and statements. Your banking data stays behind the authenticated session.
              </p>
              <button
                type="button"
                onClick={handleOpenBanking}
                className="mt-6 w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-extrabold text-sm shadow-xl transition-all duration-200 cursor-pointer"
              >
                Sign in to continue
              </button>
            </div>
          </section>
        )}
      </main>

      <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        onPlaceOrder={handlePlaceOrder}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={handleAuthModalClose}
        onSuccess={handleAuthSuccess}
      />

      {activeView === 'client' && <Footer />}
    </div>
  );
}
