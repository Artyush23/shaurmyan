import React, { useState, useEffect } from 'react';
import { MenuItem, CartItem, Order, Review } from './types';
import { INITIAL_MENU, INITIAL_REVIEWS, INITIAL_ORDERS } from './data/initialData';

// Component imports
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ScrollShowcase from './components/ScrollShowcase';
import Menu from './components/Menu';
import Reviews from './components/Reviews';
import Cart from './components/Cart';
import AdminPanel from './components/AdminPanel';
import Footer from './components/Footer';

export default function App() {
  const [activeView, setActiveView] = useState<'client' | 'admin'>('client');
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Dynamic persistent states using localStorage so modifications stick around!
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    const saved = localStorage.getItem('shaurmyan_menu');
    return saved ? JSON.parse(saved) : INITIAL_MENU;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('shaurmyan_orders');
    return saved ? JSON.parse(saved) : INITIAL_ORDERS;
  });

  const [reviews, setReviews] = useState<Review[]>(() => {
    const saved = localStorage.getItem('shaurmyan_reviews');
    return saved ? JSON.parse(saved) : INITIAL_REVIEWS;
  });

  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('shaurmyan_cart');
    return saved ? JSON.parse(saved) : [];
  });

  // Save states to local storage on modification
  useEffect(() => {
    localStorage.setItem('shaurmyan_menu', JSON.stringify(menuItems));
  }, [menuItems]);

  useEffect(() => {
    localStorage.setItem('shaurmyan_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('shaurmyan_reviews', JSON.stringify(reviews));
  }, [reviews]);

  useEffect(() => {
    localStorage.setItem('shaurmyan_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  // Scroll target handler helper
  const handleScrollTo = (elementId: string) => {
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // 1. Cart Management logic
  const handleAddToCart = (
    item: MenuItem,
    selectedSize: string,
    selectedPrice: number,
    addedCustomizations: string[],
    quantity: number
  ) => {
    const cartId = `${item.id}-${selectedSize}-${addedCustomizations.sort().join(',')}`;
    
    setCartItems(prev => {
      const existingIdx = prev.findIndex(ci => ci.id === cartId);
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += quantity;
        return updated;
      } else {
        return [...prev, {
          id: cartId,
          menuItem: item,
          selectedSize,
          selectedPrice,
          addedCustomizations,
          quantity
        }];
      }
    });

    // Automatically trigger cart open feedback
    setIsCartOpen(true);
  };

  const handleUpdateCartQuantity = (cartId: string, delta: number) => {
    setCartItems(prev => prev.map(item => {
      if (item.id === cartId) {
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }
      return item;
    }));
  };

  const handleRemoveCartItem = (cartId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== cartId));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  // 2. Client Reviews Action Submissions
  const handleAddReview = (author: string, rating: number, comment: string) => {
    const newRev: Review = {
      id: `rev-${Date.now()}`,
      author,
      rating,
      comment,
      createdAt: new Date().toISOString(),
      approved: false // Pending moderator approval from backoffice!
    };
    setReviews(prev => [newRev, ...prev]);
  };

  // 3. Client Checkout Order placement
  const handlePlaceOrder = (
    customerName: string,
    customerPhone: string,
    customerAddress: string,
    paymentMethod: 'cash' | 'card_courier' | 'card_online',
    notes?: string
  ) => {
    const newOrder: Order = {
      id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName,
      customerPhone,
      customerAddress,
      paymentMethod,
      items: cartItems.map(item => ({
        name: item.menuItem.name,
        size: item.selectedSize,
        extras: item.addedCustomizations.map(cId => {
          const cObj = item.menuItem.customizations.find(c => c.id === cId);
          return cObj?.name || cId;
        }),
        price: item.selectedPrice,
        quantity: item.quantity
      })),
      totalPrice: cartItems.reduce((sum, item) => sum + (item.selectedPrice * item.quantity), 0) + 
        (cartItems.reduce((sum, item) => sum + (item.selectedPrice * item.quantity), 0) > 30 ? 0 : 3.00),
      status: 'new',
      createdAt: new Date().toISOString(),
      notes
    };

    setOrders(prev => [newOrder, ...prev]);
  };

  // 4. BACKOFFICE ADMIN CONTROL HANDLERS
  const handleUpdateOrderStatus = (orderId: string, status: Order['status']) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
  };

  const handleDeleteOrder = (orderId: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
  };

  const handleUpdateMenuPrice = (itemId: string, newPrice: number) => {
    setMenuItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          price: newPrice,
          sizes: item.sizes.map((s, idx) => ({
            ...s,
            price: idx === 0 ? newPrice : Number((newPrice * s.multiplier).toFixed(2))
          }))
        };
      }
      return item;
    }));
  };

  const handleAddNewMenuItem = (newItem: MenuItem) => {
    setMenuItems(prev => [...prev, newItem]);
  };

  const handleDeleteMenuItem = (itemId: string) => {
    setMenuItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleApproveReview = (reviewId: string) => {
    setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, approved: true } : r));
  };

  const handleDeleteReview = (reviewId: string) => {
    setReviews(prev => prev.filter(r => r.id !== reviewId));
  };

  // Calculated count helper
  const totalCartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-amber-500 selection:text-stone-950">
      
      {/* Universal Stick Navigation */}
      <Navbar
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        activeView={activeView}
        onChangeView={(view) => {
          setActiveView(view);
          window.scrollTo({ top: 0, behavior: 'instant' as any });
        }}
        onScrollTo={handleScrollTo}
      />

      {/* Primary Dynamic View rendering */}
      <main className="flex-1">
        {activeView === 'client' ? (
          <>
            {/* 1. HERO SECTION */}
            <Hero onScrollToMenu={() => handleScrollTo('menu')} />

            {/* 2. TIMELINE ANATOMY SECTION */}
            <ScrollShowcase />

            {/* 3. DINING CUSTOMIZABLE MENU GRID */}
            <Menu
              menuItems={menuItems}
              onAddToCart={handleAddToCart}
            />

            {/* 4. CUSTOMER TESTIMONIALS SECTION */}
            <Reviews
              reviews={reviews}
              onAddReview={handleAddReview}
            />
          </>
        ) : (
          /* BACKOFFICE MANAGEMENT CONTAINER PANEL */
          <AdminPanel
            orders={orders}
            menuItems={menuItems}
            reviews={reviews}
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

      {/* Cart Drawer Carriage Side drawer */}
      <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        onPlaceOrder={handlePlaceOrder}
      />

      {/* Universal branding footer */}
      {activeView === 'client' && <Footer />}
    </div>
  );
}
