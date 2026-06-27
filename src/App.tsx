import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
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
import RequireAdmin from './components/RequireAdmin';
import UserProfile from './components/UserProfile';
import { INITIAL_MENU, INITIAL_REVIEWS } from './data/initialData';
import { useAuth } from './hooks/useAuth';

type CheckoutArgs = [
  string,
  string,
  string,
  Order['paymentMethod'],
  string?
];

const SITE_NAME = 'ShaurmYAN';
const SITE_TITLE = 'ShaurmYAN | Premium Shaurma & Street Food in Tbilisi';
const SITE_TITLE_GE = 'ShaurmYAN | პრემიუმ შაურმა და სტრიტ ფუდი თბილისში';
const SITE_DESCRIPTION =
  'Order premium shaurma, grilled street food, and fast delivery from ShaurmYAN in Tbilisi. Fresh ingredients, bold flavor, and a polished checkout experience.';
const SITE_DESCRIPTION_GE =
  'შეუკვეთე პრემიუმ შაურმა და სტრიტ ფუდი ShaurmYAN-იდან თბილისში. სწრაფი მიწოდება, ხარისხიანი ინგრედიენტები და განსაკუთრებული გემო.';

function getSiteUrl() {
  return typeof window !== 'undefined' ? window.location.origin : 'https://shaurmyan.ge';
}

function getShareImageUrl() {
  return `${getSiteUrl()}/goliath-shaurma.png`;
}

function getSchemaJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': ['Restaurant', 'FoodEstablishment'],
    name: SITE_NAME,
    alternateName: 'ShaurmYAN Georgia',
    url: getSiteUrl(),
    image: getShareImageUrl(),
    description: SITE_DESCRIPTION,
    priceRange: '$',
    servesCuisine: ['Shawarma', 'Street Food', 'Fast Casual'],
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 41.7151,
      longitude: 44.8271,
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Tbilisi',
      addressCountry: 'GE',
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        opens: '10:00',
        closes: '23:30',
      },
    ],
    sameAs: [],
  };
}

export default function App() {
  const { user, loading: authLoading, isAdmin: isAdminUser } = useAuth();
  const [activeView, setActiveView] = useState<'client' | 'admin' | 'banking' | 'profile'>('client');
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
  const pendingProtectedViewRef = useRef<'banking' | 'profile' | null>(null);

  useEffect(() => {
    localStorage.setItem('shaurmyan_menu', JSON.stringify(menuItems));
  }, [menuItems]);

  useEffect(() => {
    localStorage.setItem('shaurmyan_reviews', JSON.stringify(reviews));
  }, [reviews]);

  useEffect(() => {
    localStorage.setItem('shaurmyan_cart', JSON.stringify(cartItems));
  }, [cartItems]);

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
    paymentMethod: Order['paymentMethod'],
    notes?: string
  ) => {
    const itemsTotal = cartItems.reduce(
      (sum, item) => sum + item.selectedPrice * item.quantity,
      0
    );
    const deliveryFee = itemsTotal > 30 ? 0 : 3.0;
    if (!user) {
      throw new Error('Authentication is required to complete checkout.');
    }

    const orderRef = doc(collection(db, 'orders'));
    const orderId = orderRef.id;
    const trimmedName = customerName.trim();
    const trimmedPhone = customerPhone.trim();
    const trimmedAddress = customerAddress.trim();

    try {
      await setDoc(orderRef, {
        id: orderId,
        customerName: trimmedName,
        phone: trimmedPhone,
        address: trimmedAddress,
        customerPhone: trimmedPhone,
        customerAddress: trimmedAddress,
        paymentMethod,
        userId: user.uid,
        userEmail: user.email ?? null,
        items: cartItems.map((item) => ({
          productId: item.menuItem.id,
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
        status: 'pending',
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

    if (isAdminUser) {
      setActiveView('banking');
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      return;
    }

    return;
  };

  const handleOpenProfile = () => {
    if (authLoading) {
      return;
    }

    if (user) {
      setActiveView('profile');
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      return;
    }

    pendingProtectedViewRef.current = 'profile';
    setAuthModalOpen(true);
  };

  const handleSignedOut = () => {
    pendingCheckoutRef.current = null;
    pendingProtectedViewRef.current = null;
    setAuthModalOpen(false);
    setIsCartOpen(false);
    setActiveView('client');
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const handleChangeView = (view: 'client' | 'admin' | 'banking' | 'profile') => {
    if ((view === 'admin' || view === 'banking') && !isAdminUser) {
      return;
    }

    if (view === 'profile' && !user) {
      pendingProtectedViewRef.current = 'profile';
      setAuthModalOpen(true);
      return;
    }

    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const handleAuthSuccess = () => {
    if (pendingCheckoutRef.current) {
      void resumePendingCheckout();
      return;
    }

    if (pendingProtectedViewRef.current === 'banking' || pendingProtectedViewRef.current === 'profile') {
      const nextView = pendingProtectedViewRef.current;
      pendingProtectedViewRef.current = null;
      setActiveView(nextView);
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
    paymentMethod: Order['paymentMethod'],
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
      const orderRef = doc(db, 'orders', orderId);
      const snapshot = await getDoc(orderRef);

      if (!snapshot.exists()) {
        throw new Error('Order not found.');
      }

      await updateDoc(orderRef, { status });
    } catch (error) {
      console.error('Failed to update order status:', error);
      throw error;
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
  const siteUrl = getSiteUrl();
  const shareImageUrl = getShareImageUrl();
  const schemaJsonLd = getSchemaJsonLd();
  const isHomeView = activeView === 'client';

  const seoTitle =
    activeView === 'banking'
      ? `${SITE_NAME} Banking | Secure Account Overview`
      : activeView === 'profile'
        ? `${SITE_NAME} Profile | Account and Saved Cards`
      : activeView === 'admin'
        ? `${SITE_NAME} Admin | Restaurant Operations`
        : SITE_TITLE;

  const seoDescription =
    activeView === 'banking'
      ? 'Securely review connected balances, transactions, and exportable statements in the ShaurmYAN banking dashboard.'
      : activeView === 'profile'
        ? 'Manage your ShaurmYAN profile, saved payment cards, and recent online order history.'
      : activeView === 'admin'
        ? 'Manage menu items, orders, and reviews in the ShaurmYAN operations dashboard.'
        : SITE_DESCRIPTION;

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-amber-500 selection:text-stone-950">
      <Helmet htmlAttributes={{ lang: isHomeView ? 'ka' : 'en' }}>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <link rel="canonical" href={siteUrl} />
        <meta
          name="keywords"
          content="ShaurmYAN, shaurma Tbilisi, street food Tbilisi, premium shaurma, delivery Tbilisi, Georgian fast food"
        />
        <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />

        {isHomeView && (
          <>
            <meta property="og:title" content={SITE_TITLE} />
            <meta property="og:description" content={`${SITE_DESCRIPTION} ${SITE_DESCRIPTION_GE}`} />
            <meta property="og:image" content={shareImageUrl} />
            <meta property="og:type" content="website" />
            <meta property="og:url" content={siteUrl} />
            <meta property="og:site_name" content={SITE_NAME} />
            <meta property="og:locale" content="ka_GE" />
            <meta property="og:locale:alternate" content="en_US" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={SITE_TITLE} />
            <meta name="twitter:description" content={SITE_DESCRIPTION} />
            <meta name="twitter:image" content={shareImageUrl} />
            <meta name="theme-color" content="#0c0a09" />
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaJsonLd) }}
            />
          </>
        )}
      </Helmet>

      <Navbar
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        activeView={activeView}
        onChangeView={handleChangeView}
        onScrollTo={handleScrollTo}
        isAuthenticated={Boolean(user)}
        onOpenAuth={() => setAuthModalOpen(true)}
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
          <RequireAdmin>
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
          </RequireAdmin>
        ) : activeView === 'banking' ? (
          <RequireAdmin>
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
          </RequireAdmin>
        ) : activeView === 'profile' && user ? (
          <UserProfile
            onSignedOut={handleSignedOut}
            onOpenAdmin={() => handleChangeView('admin')}
            onOpenBanking={handleOpenBanking}
          />
        ) : (
          <section className="min-h-[60vh] bg-stone-950 text-stone-100 charcoal-grid-bg flex items-center justify-center px-4">
            <div className="max-w-md w-full rounded-3xl border border-stone-800 bg-stone-950/90 p-8 text-center shadow-2xl">
              <span className="block text-amber-500 font-black text-xs uppercase tracking-widest font-mono mb-2">
                Secure Access
              </span>
              <h2 className="text-2xl font-black text-white">Sign-in required</h2>
              <p className="mt-3 text-sm text-stone-400 leading-relaxed">
                Sign in to open your protected ShaurmYAN profile, saved cards, and account activity.
              </p>
              <button
                type="button"
                onClick={handleOpenProfile}
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
        isAuthenticated={Boolean(user)}
        onRequireAuth={() => setAuthModalOpen(true)}
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
