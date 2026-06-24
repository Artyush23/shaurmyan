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
  const [activeView, setActiveView] = useState<'client' | 'admin'>('client');
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
    setAuthModalOpen(false);

    if (pending) {
      pending.reject(new Error('Authentication is required to complete checkout.'));
    }
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
        ) : (
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
        onSuccess={() => {
          void resumePendingCheckout();
        }}
      />

      {activeView === 'client' && <Footer />}
    </div>
  );
}
