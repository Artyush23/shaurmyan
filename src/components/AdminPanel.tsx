import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MenuItem, Order, Review } from '../types';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { auth, ADMIN_EMAIL, db } from '../firebase';
import { collection, onSnapshot, Timestamp } from 'firebase/firestore';
import { playNewOrderChime } from '../utils/adminChime';
import {
  TrendingUp, ShoppingCart, MessageSquare, Plus, Trash2,
  Check, DollarSign, ShieldAlert, Loader2, LogIn,
} from 'lucide-react';

interface AdminPanelProps {
  menuItems: MenuItem[];
  reviews: Review[];
  isAdminAuthorized: boolean;
  onUpdateOrderStatus: (orderId: string, status: Order['status']) => void;
  onDeleteOrder: (orderId: string) => void;
  onUpdateMenuPrice: (itemId: string, newPrice: number) => void;
  onAddNewMenuItem: (newItem: MenuItem) => void;
  onDeleteMenuItem: (itemId: string) => void;
  onApproveReview: (reviewId: string) => void;
  onDeleteReview: (reviewId: string) => void;
}

function mapFirestoreOrder(docId: string, data: Record<string, unknown>): Order {
  const createdAtRaw = data.createdAt;
  let createdAt = new Date().toISOString();

  if (createdAtRaw instanceof Timestamp) {
    createdAt = createdAtRaw.toDate().toISOString();
  } else if (typeof createdAtRaw === 'string') {
    createdAt = createdAtRaw;
  }

  return {
    id: docId,
    customerName: String(data.customerName ?? ''),
    customerPhone: String(data.customerPhone ?? ''),
    customerAddress: String(data.customerAddress ?? ''),
    paymentMethod: data.paymentMethod as Order['paymentMethod'],
    items: (data.items as Order['items']) ?? [],
    totalPrice: Number(data.totalPrice ?? 0),
    status: data.status as Order['status'],
    createdAt,
    notes: data.notes ? String(data.notes) : undefined,
  };
}

export default function AdminPanel({
  menuItems,
  reviews,
  isAdminAuthorized,
  onUpdateOrderStatus,
  onDeleteOrder,
  onUpdateMenuPrice,
  onAddNewMenuItem,
  onDeleteMenuItem,
  onApproveReview,
  onDeleteReview,
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'stats' | 'orders' | 'menu' | 'reviews'>('stats');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const isFirstSnapshotRef = useRef(true);
  
  // States for adding a new item
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrice, setNewPrice] = useState(10);
  const [newImage, setNewImage] = useState('https://images.unsplash.com/photo-1662116765994-4e2c918be177?auto=format&fit=crop&q=80&w=400');
  const [newCat, setNewCat] = useState<'classic' | 'special' | 'combos' | 'drinks' | 'sides'>('classic');

  useEffect(() => {
    if (!isAdminAuthorized) {
      setOrders([]);
      setOrdersLoading(false);
      setOrdersError(null);
      isFirstSnapshotRef.current = true;
      return;
    }

    setOrdersLoading(true);
    setOrdersError(null);

    const unsubOrders = onSnapshot(
      collection(db, 'orders'),
      (snapshot) => {
        if (!isFirstSnapshotRef.current) {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const order = mapFirestoreOrder(
                change.doc.id,
                change.doc.data() as Record<string, unknown>
              );
              if (order.status === 'new') {
                playNewOrderChime();
              }
            }
          });
        } else {
          isFirstSnapshotRef.current = false;
        }

        const liveOrders = snapshot.docs
          .map((docSnap) =>
            mapFirestoreOrder(docSnap.id, docSnap.data() as Record<string, unknown>)
          )
          .sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

        setOrders(liveOrders);
        setOrdersLoading(false);
        setOrdersError(null);
      },
      (error) => {
        console.error('Firestore orders listener failed:', error);
        setOrdersLoading(false);
        setOrdersError('შეკვეთების ჩატვირთვა ვერ მოხერხდა. გთხოვთ, შეამოწმოთ ადმინის ავტორიზაცია.');
      }
    );

    return () => {
      unsubOrders();
      isFirstSnapshotRef.current = true;
    };
  }, [isAdminAuthorized]);

  // Math stats helpers
  const totalRevenue = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + o.totalPrice, 0);

  const totalOrdersCount = orders.length;
  
  const pendingOrders = orders.filter(o => ['new', 'preparing', 'delivering'].includes(o.status));

  // Count item frequency for analytics
  const popularStats: { [name: string]: number } = {};
  orders.forEach(ord => {
    ord.items.forEach(itm => {
      popularStats[itm.name] = (popularStats[itm.name] || 0) + itm.quantity;
    });
  });

  const popularSorted = Object.entries(popularStats)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const handleAdminSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);

      if (result.user.email !== ADMIN_EMAIL) {
        await signOut(auth);
        setAuthError('ამ პანელზე წვდომა მხოლოდ ავტორიზებულ ადმინს აქვს.');
      }
    } catch (error) {
      console.error('Admin sign-in failed:', error);
      setAuthError('ავტორიზაცია ვერ მოხერხდა. სცადეთ ხელახლა.');
    } finally {
      setAuthLoading(false);
    }
  };

  const guardedUpdateOrderStatus = (orderId: string, status: Order['status']) => {
    if (!isAdminAuthorized) return;
    onUpdateOrderStatus(orderId, status);
  };

  const guardedDeleteOrder = (orderId: string) => {
    if (!isAdminAuthorized) return;
    onDeleteOrder(orderId);
  };

  const paymentLabel = (method: Order['paymentMethod']) => {
    if (method === 'card_online') return 'ონლაინ ბარათი';
    return 'ნაღდი ფულით გადახდა';
  };

  if (!isAdminAuthorized) {
    return (
      <div className="min-h-screen bg-stone-900 text-stone-100 font-sans p-4 sm:p-8 relative charcoal-grid-bg flex items-center justify-center">
        <div className="max-w-md w-full bg-stone-950/90 border border-stone-800 rounded-3xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-amber-500" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-white">ადმინ პანელი დაცულია</h1>
            <p className="text-sm text-stone-400 leading-relaxed">
              Firestore-ის რეალურ დროში სინქრონიზაციისთვის საჭიროა ადმინის ავტორიზაცია ({ADMIN_EMAIL}).
            </p>
          </div>
          {authError && (
            <p className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              {authError}
            </p>
          )}
          <button
            type="button"
            onClick={handleAdminSignIn}
            disabled={authLoading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-extrabold text-sm shadow-xl transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {authLoading ? (
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <LogIn className="w-4 h-4" aria-hidden="true" />
            )}
            <span>{authLoading ? 'ავტორიზაცია...' : 'Google-ით შესვლა'}</span>
          </button>
        </div>
      </div>
    );
  }

  const handleCreateMenuItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) return;

    const newItem: MenuItem = {
      id: `men-${Date.now()}`,
      name: newTitle,
      nameEn: newTitle,
      description: newDesc,
      descriptionEn: newDesc,
      price: Number(newPrice),
      image: newImage,
      category: newCat,
      spicyLevel: 0,
      popular: false,
      sizes: [
        { label: 'სტანდარტული', multiplier: 1, price: Number(newPrice) },
        { label: 'საშუალო', multiplier: 1.3, price: Number(newPrice) * 1.3 },
      ],
      customizations: [
        { id: 'ext-cheese', name: 'ორმაგი ყველი 🧀', price: 2.00, description: 'გამდნარი ყველი შიგნით' }
      ]
    };

    onAddNewMenuItem(newItem);
    
    // Reset forms
    setNewTitle('');
    setNewDesc('');
    setNewPrice(10);
    setIsAddingItem(false);
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 font-sans p-4 sm:p-8 relative charcoal-grid-bg">
      <div className="max-w-7xl mx-auto space-y-8 pt-10">
        
        {/* Admin Header Title */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-stone-800 pb-6 gap-4">
          <div>
            <span className="text-amber-500 font-black text-xs uppercase tracking-widest font-mono block mb-1">
              💼 ShaurmYAN MANAGEMENT
            </span>
            <h1 className="text-2xl sm:text-4xl font-black text-white leading-none">
              მართვის პანელი (ბეკოფიისი)
            </h1>
            <p className="text-stone-400 text-xs sm:text-sm font-light mt-1.5 font-sans">
              აკონტროლე შეკვეთები, განაახლე ფასები, მართე შეფასებები და შეისწავლე გაყიდვების სტატისტიკა.
            </p>
          </div>

          {/* Quick Stats Summary badges */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'stats' ? 'bg-amber-500 text-stone-950 font-black' : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
              }`}
            >
              📊 შეჯამება
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer relative ${
                activeTab === 'orders' ? 'bg-amber-500 text-stone-950 font-black' : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
              }`}
            >
              🛒 შეკვეთები
              {pendingOrders.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] font-bold rounded-full h-4.5 min-w-4.5 px-1 flex items-center justify-center border border-stone-900 shadow-md">
                  {pendingOrders.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('menu')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'menu' ? 'bg-amber-500 text-stone-950 font-black' : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
              }`}
            >
              🌯 მენიუ
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'reviews' ? 'bg-amber-500 text-stone-950 font-black' : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
              }`}
            >
              💬 შეფასებები
              {reviews.filter(r => !r.approved).length > 0 && (
                <span className="ml-1.5 bg-yellow-500 text-stone-950 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
                  {reviews.filter(r => !r.approved).length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab contents wrapper */}
        <AnimatePresence mode="wait">
          
          {/* 1. STATS TAB */}
          {activeTab === 'stats' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              key="stats-tab"
              className="space-y-6"
            >
              {/* Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                
                <div className="bg-stone-950/80 border border-stone-800 p-6 rounded-3xl flex items-center justify-between shadow-xl">
                  <div>
                    <span className="text-stone-400 text-xs block font-mono">ჯამური შემოსავალი</span>
                    <span className="text-3xl font-mono font-black text-amber-500 mt-1 block">
                      ₾{totalRevenue.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-green-500 block mt-1 font-medium">ჩაბარებული შეკვეთებიდან</span>
                  </div>
                  <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
                    <DollarSign className="w-8 h-8" />
                  </div>
                </div>

                <div className="bg-stone-950/80 border border-stone-800 p-6 rounded-3xl flex items-center justify-between shadow-xl">
                  <div>
                    <span className="text-stone-400 text-xs block font-mono">შეკვეთების რაოდენობა</span>
                    <span className="text-3xl font-mono font-black text-white mt-1 block">
                      {totalOrdersCount}
                    </span>
                    <span className="text-[10px] text-stone-400 block mt-1">ჯამური შეკვეთა ბაზაში</span>
                  </div>
                  <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400">
                    <ShoppingCart className="w-8 h-8" />
                  </div>
                </div>

                <div className="bg-stone-950/80 border border-stone-800 p-6 rounded-3xl flex items-center justify-between shadow-xl">
                  <div>
                    <span className="text-stone-400 text-xs block font-mono">აქტიური პროცესები</span>
                    <span className="text-3xl font-mono font-black text-red-500 mt-1 block">
                      {pendingOrders.length}
                    </span>
                    <span className="text-[10px] text-red-400 block mt-1">დამზადების / გზაში ყოფნის ფაზაში</span>
                  </div>
                  <div className="p-3 bg-red-500/10 rounded-2xl text-red-400">
                    <TrendingUp className="w-8 h-8 animate-pulse" />
                  </div>
                </div>

              </div>

              {/* Advanced info: Popular Items & Latest reviews */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Popular Shawarmas bar levels */}
                <div className="lg:col-span-7 bg-stone-950/60 border border-stone-800 p-6 sm:p-8 rounded-3xl">
                  <span className="text-white text-lg font-black block mb-6">🔝 გაყიდვადი პროდუქტები</span>
                  
                  <div className="space-y-4">
                    {popularSorted.map((itm, idx) => (
                      <div key={itm.name} className="space-y-1.5 text-left">
                        <div className="flex justify-between items-center text-xs sm:text-sm">
                          <span className="font-bold flex items-center">
                            <span className="text-stone-500 font-mono w-5 block text-center mr-1">#{idx+1}</span>
                            {itm.name}
                          </span>
                          <span className="font-mono font-black text-amber-500">{itm.count} პორცია</span>
                        </div>
                        {/* Custom visual progress fills */}
                        <div className="w-full bg-stone-900 h-2.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-amber-500 to-red-500 h-full rounded-full"
                            style={{ width: `${Math.min(100, (itm.count / Math.max(...popularSorted.map(p => p.count))) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}

                    {popularSorted.length === 0 && (
                      <p className="text-stone-400 text-sm py-12 text-center">გალიები ჯერ ცარიელია.</p>
                    )}
                  </div>
                </div>

                {/* Quick updates feeds */}
                <div className="lg:col-span-5 bg-stone-950/60 border border-stone-800 p-6 rounded-3xl flex flex-col justify-between">
                  <div>
                    <span className="text-white text-lg font-black block mb-4">📢 მფრინავი შენიშვნა</span>
                    <p className="text-stone-400 text-xs leading-relaxed font-sans">
                      შეკვეთები Firestore-იდან რეალურ დროში იტვირთება. ახალი შეკვეთა ავტომატურად გამოჩნდება ამ პანელში გადატვირთვის გარეშე.
                    </p>
                  </div>
                  <div className="bg-amber-500/5 border border-amber-500/10 p-5 rounded-2xl mt-8">
                    <span className="text-xs font-bold text-amber-400 block mb-1">👨‍🍳 შეფის რეკომენდაცია</span>
                    <p className="text-[11px] text-stone-300 font-sans leading-relaxed">
                      "ხორცი ყოველთვის იდეალურ 72 გრადუსზე უნდა შენარჩუნდეს წვნიანობისთვის, ხოლო ლავაში მხოლოდ კლიენტის შეკვეთის შემდეგ უნდა შეიბრაწოს!"
                    </p>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* 2. ORDERS SUBTAB */}
          {activeTab === 'orders' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              key="orders-tab"
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-white font-extrabold text-lg">შეკვეთების ჟურნალი ({orders.length})</span>
                <span className="text-xs text-amber-500 font-mono flex items-center gap-1.5">
                  {ordersLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                      SYNCING...
                    </>
                  ) : (
                    <>● LIVE FIRESTORE</>
                  )}
                </span>
              </div>

              {ordersError && (
                <div className="px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-medium">
                  {ordersError}
                </div>
              )}

              {ordersLoading && orders.length === 0 ? (
                <div className="text-center py-20 bg-stone-950 rounded-3xl border border-dashed border-stone-800">
                  <Loader2 className="w-8 h-8 text-amber-500 animate-spin motion-reduce:animate-none mx-auto mb-3" aria-hidden="true" />
                  <p className="text-stone-400 text-sm">Firestore-იდან შეკვეთების ჩატვირთვა...</p>
                </div>
              ) : (
              orders.map(ord => {
                // Color mapping helper
                const statusLabels: { [key: string]: { label: string; class: string } } = {
                  new: { label: 'ახალი 🚀', class: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
                  preparing: { label: 'მზადდება 👨‍🍳', class: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
                  delivering: { label: 'გზაშია 🛵', class: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
                  delivered: { label: 'ჩაბარდა 🥗', class: 'bg-green-500/10 text-green-400 border-green-500/20' },
                  cancelled: { label: 'გაუქმდა ❌', class: 'bg-red-500/10 text-red-400 border-red-500/20' },
                };

                const stat = statusLabels[ord.status] || { label: ord.status, class: 'bg-stone-800' };

                return (
                  <div
                    key={ord.id}
                    className="bg-stone-950/80 border border-stone-800/80 p-6 rounded-3xl hover:border-stone-700 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                  >
                    {/* Customer details inside order box */}
                    <div className="space-y-2 flex-1 text-left">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-mono text-sm font-black text-amber-500">{ord.id}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] border font-bold uppercase tracking-wide ${stat.class}`}>
                          {stat.label}
                        </span>
                        <span className="text-[10px] text-stone-500 font-mono">
                          {new Date(ord.createdAt).toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="space-y-0.5">
                        <span className="block text-sm font-bold text-white">{ord.customerName}</span>
                        <div className="flex flex-wrap text-stone-400 text-xs font-sans gap-x-4">
                          <span>📞 {ord.customerPhone}</span>
                          <span>📍 {ord.customerAddress}</span>
                        </div>
                      </div>

                      {ord.notes && (
                        <div className="bg-stone-900 border-l-2 border-amber-500 p-2 rounded-r-xl max-w-lg mt-1.5">
                          <span className="block text-[10px] text-amber-450 font-mono uppercase font-bold">შენიშვნა:</span>
                          <p className="text-[11px] text-stone-300 font-sans italic">„{ord.notes}“</p>
                        </div>
                      )}
                    </div>

                    {/* Order contents grid */}
                    <div className="lg:w-1/3 text-left border-t border-stone-850 pt-4 lg:pt-0 lg:border-t-0">
                      <span className="text-[10px] text-stone-500 font-mono block mb-1">პროდუქტები:</span>
                      <div className="space-y-1">
                        {ord.items.map((itm, index) => (
                          <div key={index} className="text-xs leading-tight">
                            <span className="font-extrabold text-stone-200">{itm.quantity}x</span> {itm.name} 
                            <span className="text-stone-400 text-[10px] ml-1">({itm.size.split('\n')[0]})</span>
                            {itm.extras && itm.extras.length > 0 && (
                              <div className="text-[9px] text-amber-400/80 block pl-5">
                                + {itm.extras.join(', ')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Total & Action Status switcher buttons */}
                    <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-4 pt-4 border-t lg:border-t-0 border-stone-850 lg:pt-0">
                      <div className="text-left lg:text-right">
                        <span className="text-[9px] text-stone-500 font-mono block">სულ გადახდილი ({paymentLabel(ord.paymentMethod)})</span>
                        <span className="font-mono text-xl font-black text-red-500">₾{ord.totalPrice.toFixed(2)}</span>
                      </div>

                      {/* Status switch triggers */}
                      <div className="flex items-center space-x-1.5">
                        {ord.status !== 'delivered' && ord.status !== 'cancelled' ? (
                          <>
                            {ord.status === 'new' && (
                              <button
                                onClick={() => guardedUpdateOrderStatus(ord.id, 'preparing')}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-stone-950 font-black text-[10px] rounded-lg transition-colors duration-200 cursor-pointer"
                              >
                                დამუშავება ▶
                              </button>
                            )}
                            {ord.status === 'preparing' && (
                              <button
                                onClick={() => guardedUpdateOrderStatus(ord.id, 'delivering')}
                                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-stone-950 font-black text-[10px] rounded-lg transition-colors duration-200 cursor-pointer"
                              >
                                გაგზავნა ▶
                              </button>
                            )}
                            {ord.status === 'delivering' && (
                              <button
                                onClick={() => guardedUpdateOrderStatus(ord.id, 'delivered')}
                                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-stone-950 font-black text-[10px] rounded-lg transition-colors duration-200 cursor-pointer"
                              >
                                ჩაბარება ✔
                              </button>
                            )}
                            <button
                              onClick={() => guardedUpdateOrderStatus(ord.id, 'cancelled')}
                              className="px-2 py-1.5 hover:bg-red-500/10 text-red-400 hover:text-white rounded-lg text-[10px] border border-red-500/10 transition-colors duration-200 cursor-pointer"
                              title="გაუქმება"
                            >
                              გააუქმე
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => guardedDeleteOrder(ord.id)}
                            className="p-2 hover:bg-red-600 hover:text-white border border-stone-800 text-stone-500 rounded-lg transition-all duration-200 cursor-pointer"
                            title="ამოშლა არქივიდან"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })
              )}

              {!ordersLoading && orders.length === 0 && (
                <div className="text-center py-20 bg-stone-950 rounded-3xl border border-dashed border-stone-800">
                  <p className="text-stone-400 text-sm">შეკვეთების ჟურნალი ჯერ ცარიელია.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* 3. MENU LIST TAB */}
          {activeTab === 'menu' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              key="menu-tab"
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <span className="text-white font-black text-lg">მენიუს კერძების მართვა</span>
                <button
                  onClick={() => setIsAddingItem(!isAddingItem)}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-all duration-200 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>ახალი კერძი</span>
                </button>
              </div>

              {/* Add dish form inline */}
              <AnimatePresence>
                {isAddingItem && (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    onSubmit={handleCreateMenuItem}
                    className="bg-stone-950 p-6 rounded-3xl border border-stone-800 space-y-4 text-left overflow-hidden"
                  >
                    <span className="text-amber-500 font-bold text-xs uppercase font-mono block">ახალი კერძის დამატება</span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] text-stone-400 uppercase tracking-wide font-bold">დასახელება</label>
                        <input
                          type="text"
                          required
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          placeholder="მინი ყველიანი შაურმა"
                          className="w-full bg-stone-900 border border-stone-800 rounded-xl py-2 px-3 text-xs text-white placeholder-stone-600 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-stone-400 uppercase tracking-wide font-bold">საწყისი ფასი (ლარი)</label>
                        <input
                          type="number"
                          step="0.1"
                          required
                          value={newPrice}
                          onChange={(e) => setNewPrice(Number(e.target.value))}
                          placeholder="8.50"
                          className="w-full bg-stone-900 border border-stone-800 rounded-xl py-2 px-3 text-xs text-white placeholder-stone-600 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-400 uppercase tracking-wide font-bold">კატეგორია</label>
                      <select
                        value={newCat}
                        onChange={(e) => setNewCat(e.target.value as any)}
                        className="w-full bg-stone-900 border border-stone-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="classic">კლასიკური 🌯</option>
                        <option value="special">საფირმო ✨</option>
                        <option value="combos">კომბოები 🍟</option>
                        <option value="drinks">სასმელები 🥤</option>
                        <option value="sides">გარნირები 🧀</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-400 uppercase tracking-wide font-bold">აღწერა</label>
                      <textarea
                        required
                        value={newDesc}
                        onChange={(e) => setNewDesc(e.target.value)}
                        placeholder="ხმელი სუნელი, თხელი ოქროსფერი ლავაში, წვნიანი ქათმის ხორცი..."
                        className="w-full bg-stone-900 border border-stone-800 rounded-xl py-2 px-3 text-xs text-white placeholder-stone-600 focus:outline-none focus:border-amber-500 resize-none h-16"
                      />
                    </div>

                    <div className="flex justify-end space-x-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingItem(false)}
                        className="px-4 py-2 bg-stone-900 text-stone-400 text-xs font-bold rounded-lg hover:bg-stone-800 transition-colors duration-200 cursor-pointer"
                      >
                        გაუქმება
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-extrabold rounded-lg flex items-center space-x-1 transition-colors duration-200 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>დამატება</span>
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Menu items list view with price editor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {menuItems.map(itm => (
                  <div
                    key={itm.id}
                    className="bg-stone-950/80 border border-stone-800 p-4 rounded-3xl flex items-center justify-between gap-4 text-left hover:border-stone-750 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        referrerPolicy="no-referrer"
                        src={itm.image}
                        alt={itm.name}
                        className="w-16 h-16 rounded-2xl object-cover bg-stone-905"
                      />
                      <div>
                        <span className="text-[10px] text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/10 font-mono">
                          {itm.category.toUpperCase()}
                        </span>
                        <h4 className="text-sm font-bold text-white mt-1.5 leading-tight">{itm.name}</h4>
                        <span className="text-[10px] text-stone-500 block leading-tight mt-0.5">ID: {itm.id}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <span className="text-[9px] text-stone-550 block font-mono">საწყისი ფასი</span>
                        <div className="flex items-center space-x-1.5 pt-0.5">
                          <span className="font-mono text-sm text-stone-400">₾</span>
                          <input
                            type="number"
                            step="0.50"
                            className="bg-stone-900 border border-stone-800 text-white font-mono rounded px-1.5 py-0.5 w-16 text-center text-xs focus:outline-all"
                            value={itm.price}
                            onChange={(e) => onUpdateMenuPrice(itm.id, Number(e.target.value))}
                          />
                        </div>
                      </div>

                      {/* Delete dish completely */}
                      <button
                        onClick={() => onDeleteMenuItem(itm.id)}
                        disabled={menuItems.length <= 4} // Do not let them empty the entire database
                        className="p-2 hover:bg-red-500/10 text-stone-500 hover:text-red-400 rounded-lg transition-colors duration-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        title="უკან წაშლა"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                ))}
              </div>

            </motion.div>
          )}

          {/* 4. REVIEWS MODERATION SUBTAB */}
          {activeTab === 'reviews' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              key="reviews-tab"
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-white font-black text-lg">შეფასებების მოდერატორი</span>
                <span className="text-xs text-stone-400 font-medium">სულ {reviews.length} შეფასება ბაზაში</span>
              </div>

              <div className="space-y-3">
                {reviews.map(rev => (
                  <div
                    key={rev.id}
                    className="bg-stone-950/80 border border-stone-800 p-5 rounded-3xl text-left flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white text-xs sm:text-sm">{rev.author}</span>
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <span
                              key={s}
                              className={`text-xs ${s <= rev.rating ? 'text-amber-500' : 'text-stone-800'}`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                        {!rev.approved && (
                          <span className="bg-yellow-500/10 text-yellow-500 text-[8px] font-black px-1.5 py-0.5 rounded">
                            PENDING APPROVAL
                          </span>
                        )}
                      </div>

                      <p className="text-stone-300 text-xs font-light italic leading-relaxed">
                        „{rev.comment}“
                      </p>

                      <span className="text-[10px] text-stone-500 block font-mono">
                        {new Date(rev.createdAt).toLocaleDateString('ka-GE')}
                      </span>
                    </div>

                    {/* Moderation actions triggers */}
                    <div className="flex items-center space-x-2 self-start sm:self-center">
                      {!rev.approved ? (
                        <button
                          onClick={() => onApproveReview(rev.id)}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-stone-950 font-black text-[10px] rounded-lg cursor-pointer flex items-center space-x-1 transition-colors duration-200"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>დასტური</span>
                        </button>
                      ) : (
                        <span className="text-xs text-green-500 font-semibold px-2">Approved ✔</span>
                      )}

                      <button
                        onClick={() => onDeleteReview(rev.id)}
                        className="p-2 hover:bg-red-500/10 border border-stone-850 text-stone-500 hover:text-red-400 rounded-lg cursor-pointer ml-1 transition-colors duration-200"
                        title="წაშლა"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                ))}

                {reviews.length === 0 && (
                  <div className="text-center py-20 bg-stone-950 rounded-3xl border border-dashed border-stone-800">
                    <p className="text-stone-400 text-sm">შეფასებები მოდერაციისთვის ჯერ არ შემოსულა.</p>
                  </div>
                )}
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
