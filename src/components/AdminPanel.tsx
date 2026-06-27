import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MenuItem, Notification, Order, Review } from '../types';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { auth, ADMIN_EMAIL, db, storage } from '../firebase';
import { collection, getCountFromServer, onSnapshot, query, Timestamp, where } from 'firebase/firestore';
import { deleteDoc, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { playNewOrderChime } from '../utils/adminChime';
import {
  ACTIVE_ORDER_STATUSES,
  ORDER_STATUSES,
  getNextOrderStatus,
  getOrderStatusClass,
  getOrderStatusLabel,
  normalizeOrderStatus,
} from '../utils/orders';
import {
  TrendingUp, ShoppingCart, MessageSquare, Plus, Trash2,
  Check, DollarSign, ShieldAlert, Loader2, LogIn, Users, Package, Bell,
} from 'lucide-react';

interface AdminPanelProps {
  menuItems: MenuItem[];
  reviews: Review[];
  reviewsLoading?: boolean;
  reviewsError?: string | null;
  isAdminAuthorized: boolean;
  onUpdateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
  onDeleteOrder: (orderId: string) => void;
  onUpdateMenuPrice: (itemId: string, newPrice: number) => void;
  onUpdateMenuAvailability: (itemId: string, available: boolean) => void;
  onUpdateMenuDiscount: (itemId: string, discountPercent?: number) => void;
  onUpdateMenuImage: (itemId: string, imageUrl: string) => void;
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
    userId: String(data.userId ?? ''),
    customerName: String(data.customerName ?? ''),
    phone: String(data.phone ?? data.customerPhone ?? ''),
    address: String(data.address ?? data.customerAddress ?? ''),
    customerPhone: String(data.customerPhone ?? data.phone ?? ''),
    customerAddress: String(data.customerAddress ?? data.address ?? ''),
    paymentMethod: data.paymentMethod as Order['paymentMethod'],
    items: (data.items as Order['items']) ?? [],
    totalPrice: Number(data.totalPrice ?? 0),
    status: normalizeOrderStatus(data.status),
    createdAt,
    notes: data.notes ? String(data.notes) : undefined,
  };
}

function mapFirestoreNotification(docId: string, data: Record<string, unknown>): Notification {
  const createdAtRaw = data.createdAt;
  let createdAt = new Date().toISOString();

  if (createdAtRaw instanceof Timestamp) {
    createdAt = createdAtRaw.toDate().toISOString();
  } else if (typeof createdAtRaw === 'string') {
    createdAt = createdAtRaw;
  }

  return {
    id: docId,
    userId: String(data.userId ?? ''),
    role: data.role === 'user' ? 'user' : 'admin',
    type: String(data.type ?? 'system'),
    title: String(data.title ?? ''),
    message: String(data.message ?? ''),
    read: Boolean(data.read),
    createdAt,
    orderId: data.orderId ? String(data.orderId) : undefined,
  };
}

const MAX_PRODUCT_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;
const ACCEPTED_PRODUCT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function validateProductImage(file: File): string | null {
  if (!ACCEPTED_PRODUCT_IMAGE_TYPES.includes(file.type)) {
    return 'Please upload a JPG, PNG, or WebP image.';
  }

  if (file.size > MAX_PRODUCT_IMAGE_SIZE_BYTES) {
    return 'Product images must be 2 MB or smaller.';
  }

  return null;
}

function getProductImagePath(productId: string, file: File): string {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  return `products/${productId}/${Date.now()}.${extension}`;
}

type AnalyticsRange = 'today' | '7d' | '30d' | 'all';

interface AnalyticsUserStats {
  totalUsers: number;
  newUsersToday: number;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfDaysAgo(days: number) {
  const date = startOfToday();
  date.setDate(date.getDate() - (days - 1));
  return date;
}

function getRangeStart(range: AnalyticsRange) {
  if (range === 'today') return startOfToday();
  if (range === '7d') return startOfDaysAgo(7);
  if (range === '30d') return startOfDaysAgo(30);
  return null;
}

function isInRange(dateValue: string, range: AnalyticsRange) {
  const start = getRangeStart(range);
  if (!start) return true;
  return new Date(dateValue).getTime() >= start.getTime();
}

function formatMoney(value: number) {
  return `₾${value.toFixed(2)}`;
}

function formatDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getLastDays(days: number) {
  return Array.from({ length: days }, (_, index) => {
    const date = startOfDaysAgo(days);
    date.setDate(date.getDate() + index);
    return {
      key: formatDayKey(date),
      label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
  });
}

function StatCard({
  label,
  value,
  detail,
  icon,
  tone = 'amber',
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon: React.ReactNode;
  tone?: 'amber' | 'blue' | 'green' | 'red' | 'purple';
}) {
  const toneClass = {
    amber: 'bg-amber-500/10 text-amber-500',
    blue: 'bg-blue-500/10 text-blue-400',
    green: 'bg-green-500/10 text-green-400',
    red: 'bg-red-500/10 text-red-400',
    purple: 'bg-purple-500/10 text-purple-400',
  }[tone];

  return (
    <div className="bg-stone-950/80 border border-stone-800 p-5 rounded-3xl flex items-center justify-between shadow-xl min-h-32">
      <div className="min-w-0">
        <span className="text-stone-400 text-xs block font-mono uppercase tracking-wide">{label}</span>
        <span className="text-2xl sm:text-3xl font-mono font-black text-white mt-2 block truncate">
          {value}
        </span>
        {detail && <span className="text-[10px] text-stone-500 block mt-1 font-medium">{detail}</span>}
      </div>
      <div className={`p-3 rounded-2xl ${toneClass}`}>
        {icon}
      </div>
    </div>
  );
}

export default function AdminPanel({
  menuItems,
  reviews,
  reviewsLoading = false,
  reviewsError = null,
  isAdminAuthorized,
  onUpdateOrderStatus,
  onDeleteOrder,
  onUpdateMenuPrice,
  onUpdateMenuAvailability,
  onUpdateMenuDiscount,
  onUpdateMenuImage,
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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [userStats, setUserStats] = useState<AnalyticsUserStats>({ totalUsers: 0, newUsersToday: 0 });
  const [userStatsLoading, setUserStatsLoading] = useState(false);
  const [userStatsError, setUserStatsError] = useState<string | null>(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | Order['status']>('all');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [analyticsRange, setAnalyticsRange] = useState<AnalyticsRange>('7d');
  const [reviewRatingFilter, setReviewRatingFilter] = useState<'all' | string>('all');
  const [reviewProductFilter, setReviewProductFilter] = useState('all');
  const isFirstSnapshotRef = useRef(true);
  
  // States for adding a new item
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrice, setNewPrice] = useState(10);
  const [newImage, setNewImage] = useState('https://images.unsplash.com/photo-1662116765994-4e2c918be177?auto=format&fit=crop&q=80&w=400');
  const [newCat, setNewCat] = useState('classic');
  const [newAvailable, setNewAvailable] = useState(true);
  const [newDiscountPercent, setNewDiscountPercent] = useState('');
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [uploadingImageId, setUploadingImageId] = useState<string | null>(null);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

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
              if (order.status === 'pending') {
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

  useEffect(() => {
    if (!isAdminAuthorized) {
      setNotifications([]);
      setNotificationsLoading(false);
      setNotificationsError(null);
      return;
    }

    setNotificationsLoading(true);
    setNotificationsError(null);

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('role', '==', 'admin')
    );

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const nextNotifications = snapshot.docs
          .map((notificationDoc) =>
            mapFirestoreNotification(
              notificationDoc.id,
              notificationDoc.data() as Record<string, unknown>
            )
          )
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setNotifications(nextNotifications);
        setNotificationsLoading(false);
        setNotificationsError(null);
      },
      (error) => {
        console.error('Admin notifications listener failed:', error);
        setNotificationsError('Notifications could not be loaded.');
        setNotificationsLoading(false);
      }
    );

    return unsubscribe;
  }, [isAdminAuthorized]);

  useEffect(() => {
    if (!isAdminAuthorized) {
      setUserStats({ totalUsers: 0, newUsersToday: 0 });
      setUserStatsLoading(false);
      setUserStatsError(null);
      return;
    }

    let cancelled = false;

    async function loadUserStats() {
      setUserStatsLoading(true);
      setUserStatsError(null);

      try {
        const usersCollection = collection(db, 'users');
        const [totalSnapshot, todaySnapshot] = await Promise.all([
          getCountFromServer(usersCollection),
          getCountFromServer(
            query(usersCollection, where('createdAt', '>=', Timestamp.fromDate(startOfToday())))
          ),
        ]);

        if (!cancelled) {
          setUserStats({
            totalUsers: totalSnapshot.data().count,
            newUsersToday: todaySnapshot.data().count,
          });
          setUserStatsLoading(false);
        }
      } catch (error) {
        console.error('Failed to load user analytics:', error);
        if (!cancelled) {
          setUserStatsError('User analytics are unavailable right now.');
          setUserStatsLoading(false);
        }
      }
    }

    void loadUserStats();

    return () => {
      cancelled = true;
    };
  }, [isAdminAuthorized]);

  const analytics = useMemo(() => {
    const todayStart = startOfToday().getTime();
    const filteredOrders = orders.filter((order) => isInRange(order.createdAt, analyticsRange));
    const completedOrders = orders.filter((order) => order.status === 'delivered');
    const filteredCompletedOrders = filteredOrders.filter((order) => order.status === 'delivered');
    const todayOrders = orders.filter((order) => new Date(order.createdAt).getTime() >= todayStart);
    const todayRevenue = todayOrders
      .filter((order) => order.status === 'delivered')
      .reduce((sum, order) => sum + order.totalPrice, 0);
    const totalRevenue = completedOrders.reduce((sum, order) => sum + order.totalPrice, 0);
    const filteredRevenue = filteredCompletedOrders.reduce((sum, order) => sum + order.totalPrice, 0);

    const statusCounts = ORDER_STATUSES.reduce<Record<Order['status'], number>>((acc, status) => {
      acc[status] = filteredOrders.filter((order) => order.status === status).length;
      return acc;
    }, {
      pending: 0,
      accepted: 0,
      preparing: 0,
      ready: 0,
      delivered: 0,
      cancelled: 0,
    });

    const customerOrderCounts = new Map<string, number>();
    orders.forEach((order) => {
      if (!order.userId) return;
      customerOrderCounts.set(order.userId, (customerOrderCounts.get(order.userId) ?? 0) + 1);
    });

    const productStats = new Map<string, {
      id: string;
      name: string;
      count: number;
      revenue: number;
    }>();

    menuItems.forEach((item) => {
      productStats.set(item.id, {
        id: item.id,
        name: item.name,
        count: 0,
        revenue: 0,
      });
    });

    filteredOrders
      .filter((order) => order.status !== 'cancelled')
      .forEach((order) => {
        order.items.forEach((item) => {
          const id = item.productId || item.name;
          const current = productStats.get(id) ?? {
            id,
            name: item.name,
            count: 0,
            revenue: 0,
          };
          current.count += item.quantity;
          current.revenue += item.price * item.quantity;
          productStats.set(id, current);
        });
      });

    const productsBySales = Array.from(productStats.values());
    const bestSellingProducts = [...productsBySales]
      .filter((product) => product.count > 0)
      .sort((a, b) => b.count - a.count || b.revenue - a.revenue)
      .slice(0, 5);
    const worstSellingProducts = [...productsBySales]
      .sort((a, b) => a.count - b.count || a.revenue - b.revenue)
      .slice(0, 5);

    const buildDailySeries = (days: number) => {
      const buckets = getLastDays(days).map((day) => ({
        ...day,
        revenue: 0,
        orders: 0,
      }));
      const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

      orders.forEach((order) => {
        const bucket = bucketMap.get(formatDayKey(new Date(order.createdAt)));
        if (!bucket) return;
        bucket.orders += 1;
        if (order.status === 'delivered') {
          bucket.revenue += order.totalPrice;
        }
      });

      return buckets;
    };

    return {
      filteredOrders,
      todayOrdersCount: todayOrders.length,
      todayRevenue,
      totalRevenue,
      filteredRevenue,
      statusCounts,
      returningCustomers: Array.from(customerOrderCounts.values()).filter((count) => count > 1).length,
      bestSellingProducts,
      worstSellingProducts,
      topProducts: bestSellingProducts.slice(0, 5),
      sevenDaySeries: buildDailySeries(7),
      thirtyDaySeries: buildDailySeries(30),
    };
  }, [analyticsRange, menuItems, orders]);

  const totalRevenue = analytics.totalRevenue;
  const totalOrdersCount = orders.length;
  const pendingOrders = orders.filter(o => ACTIVE_ORDER_STATUSES.includes(o.status));
  const unreadAdminNotifications = notifications.filter((notification) => !notification.read);
  const visibleOrders = orderStatusFilter === 'all'
    ? orders
    : orders.filter((order) => order.status === orderStatusFilter);
  const getMenuItemName = (productId?: string) =>
    menuItems.find((item) => item.id === productId)?.name || productId || 'General review';
  const filteredReviews = reviews.filter((review) => {
    const matchesRating = reviewRatingFilter === 'all' || review.rating === Number(reviewRatingFilter);
    const matchesProduct = reviewProductFilter === 'all' || review.productId === reviewProductFilter;
    return matchesRating && matchesProduct;
  });
  const popularSorted = analytics.bestSellingProducts.map((product) => ({
    name: product.name,
    count: product.count,
  }));

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

  const guardedUpdateOrderStatus = async (orderId: string, status: Order['status']) => {
    if (!isAdminAuthorized) return;

    setUpdatingOrderId(orderId);
    setOrdersError(null);

    try {
      await onUpdateOrderStatus(orderId, status);
    } catch {
      setOrdersError('Could not update order status. Please try again.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const guardedDeleteOrder = (orderId: string) => {
    if (!isAdminAuthorized) return;
    onDeleteOrder(orderId);
  };

  const markAdminNotificationRead = async (notificationId: string) => {
    if (!isAdminAuthorized) return;

    try {
      await updateDoc(doc(db, 'notifications', notificationId), { read: true });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      setNotificationsError('Could not update notification.');
    }
  };

  const clearAdminNotifications = async () => {
    if (!isAdminAuthorized || notifications.length === 0) return;

    try {
      await Promise.all(
        notifications.map((notification) =>
          deleteDoc(doc(db, 'notifications', notification.id))
        )
      );
    } catch (error) {
      console.error('Failed to clear notifications:', error);
      setNotificationsError('Could not clear notifications.');
    }
  };

  const paymentLabel = (method: Order['paymentMethod']) => {
    if (method === 'card_online') return 'ონლაინ ბარათი';
    return 'ნაღდი ფულით გადახდა';
  };

  const uploadProductImage = async (productId: string, file: File) => {
    const validationError = validateProductImage(file);
    if (validationError) {
      setImageUploadError(validationError);
      return null;
    }

    setUploadingImageId(productId);
    setImageUploadError(null);

    try {
      const imageRef = ref(storage, getProductImagePath(productId, file));
      await uploadBytes(imageRef, file, { contentType: file.type });
      const downloadUrl = await getDownloadURL(imageRef);

      await setDoc(
        doc(db, 'products', productId),
        {
          image: downloadUrl,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      return downloadUrl;
    } catch (error) {
      console.error('Product image upload failed:', error);
      setImageUploadError('Image upload failed. Please try again.');
      return null;
    } finally {
      setUploadingImageId(null);
    }
  };

  const handleExistingProductImageChange = async (itemId: string, file: File | null) => {
    if (!file) return;

    const downloadUrl = await uploadProductImage(itemId, file);
    if (downloadUrl) {
      onUpdateMenuImage(itemId, downloadUrl);
    }
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

  const handleCreateMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim() || !newCat.trim()) return;

    const basePrice = Number(newPrice);
    const discountPercent = Number(newDiscountPercent);
    const normalizedDiscount =
      Number.isFinite(discountPercent) && discountPercent > 0
        ? Math.min(discountPercent, 100)
        : undefined;

    const productId = `men-${Date.now()}`;
    let imageUrl = newImage;

    if (newImageFile) {
      const uploadedUrl = await uploadProductImage(productId, newImageFile);
      if (!uploadedUrl) return;
      imageUrl = uploadedUrl;
    }

    const newItem: MenuItem = {
      id: productId,
      name: newTitle.trim(),
      nameEn: newTitle.trim(),
      description: newDesc.trim(),
      descriptionEn: newDesc.trim(),
      price: basePrice,
      image: imageUrl,
      category: newCat.trim(),
      available: newAvailable,
      discountPercent: normalizedDiscount,
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

    await setDoc(
      doc(db, 'products', newItem.id),
      {
        ...newItem,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    onAddNewMenuItem(newItem);
    
    // Reset forms
    setNewTitle('');
    setNewDesc('');
    setNewPrice(10);
    setNewCat('classic');
    setNewAvailable(true);
    setNewDiscountPercent('');
    setNewImageFile(null);
    setIsAddingItem(false);
  };

  const categoryOptions = Array.from(
    new Set(['classic', 'special', 'combos', 'drinks', 'sides', ...menuItems.map((item) => item.category)])
  ).filter(Boolean);

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
            <div className="relative rounded-xl bg-stone-800 px-3 py-2.5 text-stone-300">
              <Bell className="h-4 w-4" />
              {unreadAdminNotifications.length > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full border border-stone-900 bg-red-600 px-1 text-[9px] font-bold text-white shadow-md">
                  {unreadAdminNotifications.length}
                </span>
              )}
            </div>
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
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="text-white text-lg font-black block">Analytics Dashboard</span>
                  <span className="text-xs text-stone-500">Live Firestore orders with aggregate user counts</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    ['today', 'Today'],
                    ['7d', 'Last 7 days'],
                    ['30d', 'Last 30 days'],
                    ['all', 'All time'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAnalyticsRange(value as AnalyticsRange)}
                      className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wide transition-colors ${
                        analyticsRange === value
                          ? 'bg-amber-500 text-stone-950'
                          : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-stone-800 bg-stone-950/70 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-400">
                      <Bell className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="block text-sm font-black text-white">Admin Notifications</span>
                      <span className="text-xs text-stone-500">
                        {unreadAdminNotifications.length} unread of {notifications.length}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={unreadAdminNotifications.length === 0}
                      onClick={() => {
                        void Promise.all(
                          unreadAdminNotifications.map((notification) =>
                            markAdminNotificationRead(notification.id)
                          )
                        );
                      }}
                      className="rounded-xl border border-stone-700 px-3 py-2 text-[10px] font-black uppercase text-stone-300 transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Mark read
                    </button>
                    <button
                      type="button"
                      disabled={notifications.length === 0}
                      onClick={() => void clearAdminNotifications()}
                      className="rounded-xl border border-red-500/20 px-3 py-2 text-[10px] font-black uppercase text-red-300 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {notificationsLoading ? (
                    <p className="rounded-2xl border border-stone-800 bg-stone-900 p-4 text-sm text-stone-400">
                      Loading notifications...
                    </p>
                  ) : notificationsError ? (
                    <p className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                      {notificationsError}
                    </p>
                  ) : notifications.length > 0 ? (
                    notifications.slice(0, 5).map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => void markAdminNotificationRead(notification.id)}
                        className={`w-full rounded-2xl border p-3 text-left transition-colors ${
                          notification.read
                            ? 'border-stone-800 bg-stone-900/70 text-stone-400'
                            : 'border-amber-500/20 bg-amber-500/10 text-stone-100'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-black text-white">{notification.title}</p>
                            <p className="mt-1 text-xs leading-5 text-stone-400">{notification.message}</p>
                          </div>
                          {!notification.read && (
                            <span className="rounded-full bg-red-600 px-2 py-0.5 text-[9px] font-black uppercase text-white">
                              New
                            </span>
                          )}
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="rounded-2xl border border-dashed border-stone-800 p-4 text-center text-sm text-stone-500">
                      No admin notifications yet.
                    </p>
                  )}
                </div>
              </div>

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

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                <StatCard
                  label="Today's Orders"
                  value={analytics.todayOrdersCount}
                  detail="Created since local midnight"
                  icon={<ShoppingCart className="w-7 h-7" />}
                  tone="blue"
                />
                <StatCard
                  label="Today's Revenue"
                  value={formatMoney(analytics.todayRevenue)}
                  detail="Delivered orders today"
                  icon={<DollarSign className="w-7 h-7" />}
                  tone="green"
                />
                <StatCard
                  label="Total Users"
                  value={userStatsLoading ? '...' : userStats.totalUsers}
                  detail={userStatsError ?? 'Registered Firebase users'}
                  icon={<Users className="w-7 h-7" />}
                  tone={userStatsError ? 'red' : 'purple'}
                />
                <StatCard
                  label="Total Products"
                  value={menuItems.length}
                  detail="Current managed menu items"
                  icon={<Package className="w-7 h-7" />}
                  tone="amber"
                />
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

              {ordersError && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-300">
                  {ordersError}
                </div>
              )}

              {ordersLoading && orders.length === 0 && (
                <div className="rounded-3xl border border-stone-800 bg-stone-950/70 p-8 text-center">
                  <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin text-amber-500 motion-reduce:animate-none" />
                  <p className="text-sm font-bold text-stone-300">Loading analytics from Firestore...</p>
                </div>
              )}

              {!ordersLoading && orders.length === 0 && (
                <div className="rounded-3xl border border-dashed border-stone-700 bg-stone-950/70 p-8 text-center">
                  <p className="text-sm font-bold text-stone-300">No order analytics yet.</p>
                  <p className="mt-1 text-xs text-stone-500">Orders created from checkout will appear here.</p>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 rounded-3xl border border-stone-800 bg-stone-950/60 p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <span className="text-lg font-black text-white">Product Analytics</span>
                    <span className="text-[10px] font-mono uppercase text-stone-500">
                      {analyticsRange === 'all' ? 'All time' : analyticsRange}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                    <div>
                      <span className="mb-3 block text-xs font-black uppercase tracking-wide text-green-400">Best selling</span>
                      <div className="space-y-3">
                        {analytics.bestSellingProducts.length > 0 ? analytics.bestSellingProducts.map((product, index) => (
                          <div key={product.id} className="rounded-2xl border border-stone-800 bg-stone-900/70 p-3">
                            <div className="flex items-start justify-between gap-3 text-xs">
                              <span className="font-bold text-stone-100">#{index + 1} {product.name}</span>
                              <span className="font-mono font-black text-amber-400">{product.count}</span>
                            </div>
                            <div className="mt-2 flex items-center justify-between text-[10px] text-stone-500">
                              <span>Revenue</span>
                              <span className="font-mono text-stone-300">{formatMoney(product.revenue)}</span>
                            </div>
                          </div>
                        )) : (
                          <p className="rounded-2xl border border-dashed border-stone-800 p-4 text-center text-xs text-stone-500">No product sales yet.</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="mb-3 block text-xs font-black uppercase tracking-wide text-red-400">Worst selling</span>
                      <div className="space-y-3">
                        {analytics.worstSellingProducts.map((product) => (
                          <div key={product.id} className="rounded-2xl border border-stone-800 bg-stone-900/70 p-3">
                            <div className="flex items-start justify-between gap-3 text-xs">
                              <span className="font-bold text-stone-100">{product.name}</span>
                              <span className="font-mono font-black text-stone-400">{product.count}</span>
                            </div>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-800">
                              <div
                                className="h-full rounded-full bg-red-500"
                                style={{
                                  width: `${Math.min(100, product.count / Math.max(1, analytics.bestSellingProducts[0]?.count ?? 1) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 rounded-3xl border border-stone-800 bg-stone-950/60 p-6">
                  <span className="mb-5 block text-lg font-black text-white">Order Analytics</span>
                  <div className="grid grid-cols-2 gap-3">
                    {ORDER_STATUSES.map((status) => (
                      <div key={status} className={`rounded-2xl border p-4 ${getOrderStatusClass(status)}`}>
                        <span className="block text-[10px] font-black uppercase tracking-wide">{getOrderStatusLabel(status)}</span>
                        <span className="mt-1 block font-mono text-2xl font-black">{analytics.statusCounts[status]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="rounded-3xl border border-stone-800 bg-stone-950/60 p-6">
                  <span className="text-lg font-black text-white">Customer Analytics</span>
                  <div className="mt-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-stone-400">Total registered users</span>
                      <span className="font-mono text-xl font-black text-white">{userStatsLoading ? '...' : userStats.totalUsers}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-stone-400">Returning customers</span>
                      <span className="font-mono text-xl font-black text-amber-400">{analytics.returningCustomers}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-stone-400">New users today</span>
                      <span className="font-mono text-xl font-black text-green-400">{userStatsLoading ? '...' : userStats.newUsersToday}</span>
                    </div>
                    {userStatsError && <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">{userStatsError}</p>}
                  </div>
                </div>

                <div className="rounded-3xl border border-stone-800 bg-stone-950/60 p-6 lg:col-span-2">
                  <div className="mb-5 flex items-center justify-between">
                    <span className="text-lg font-black text-white">Revenue Last 7 Days</span>
                    <span className="font-mono text-xs font-black text-amber-400">{formatMoney(analytics.sevenDaySeries.reduce((sum, day) => sum + day.revenue, 0))}</span>
                  </div>
                  <div className="flex h-44 items-end gap-2">
                    {analytics.sevenDaySeries.map((day) => {
                      const maxRevenue = Math.max(1, ...analytics.sevenDaySeries.map((item) => item.revenue));
                      return (
                        <div key={day.key} className="flex h-full flex-1 flex-col justify-end gap-2">
                          <div
                            className="min-h-1 rounded-t-xl bg-gradient-to-t from-amber-600 to-amber-400"
                            title={`${day.label}: ${formatMoney(day.revenue)}`}
                            style={{ height: `${Math.max(4, (day.revenue / maxRevenue) * 100)}%` }}
                          />
                          <span className="truncate text-center text-[9px] text-stone-500">{day.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="rounded-3xl border border-stone-800 bg-stone-950/60 p-6">
                  <span className="mb-5 block text-lg font-black text-white">Orders Last 7 Days</span>
                  <div className="flex h-40 items-end gap-2">
                    {analytics.sevenDaySeries.map((day) => {
                      const maxOrders = Math.max(1, ...analytics.sevenDaySeries.map((item) => item.orders));
                      return (
                        <div key={day.key} className="flex h-full flex-1 flex-col justify-end gap-2">
                          <div
                            className="min-h-1 rounded-t-xl bg-blue-500"
                            title={`${day.label}: ${day.orders} orders`}
                            style={{ height: `${Math.max(4, (day.orders / maxOrders) * 100)}%` }}
                          />
                          <span className="truncate text-center text-[9px] text-stone-500">{day.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-3xl border border-stone-800 bg-stone-950/60 p-6">
                  <span className="mb-5 block text-lg font-black text-white">Orders By Status</span>
                  <div className="space-y-3">
                    {ORDER_STATUSES.map((status) => {
                      const maxStatus = Math.max(1, ...ORDER_STATUSES.map((item) => analytics.statusCounts[item]));
                      return (
                        <div key={status}>
                          <div className="mb-1 flex justify-between text-xs">
                            <span className="font-bold text-stone-300">{getOrderStatusLabel(status)}</span>
                            <span className="font-mono text-stone-500">{analytics.statusCounts[status]}</span>
                          </div>
                          <div className="h-2 rounded-full bg-stone-800">
                            <div
                              className="h-full rounded-full bg-amber-500"
                              style={{ width: `${(analytics.statusCounts[status] / maxStatus) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-3xl border border-stone-800 bg-stone-950/60 p-6">
                  <span className="mb-5 block text-lg font-black text-white">Top 5 Products</span>
                  <div className="space-y-3">
                    {analytics.topProducts.length > 0 ? analytics.topProducts.map((product) => (
                      <div key={product.id}>
                        <div className="mb-1 flex justify-between gap-3 text-xs">
                          <span className="truncate font-bold text-stone-300">{product.name}</span>
                          <span className="font-mono text-stone-500">{product.count}</span>
                        </div>
                        <div className="h-2 rounded-full bg-stone-800">
                          <div
                            className="h-full rounded-full bg-green-500"
                            style={{ width: `${(product.count / Math.max(1, analytics.topProducts[0]?.count ?? 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                    )) : (
                      <p className="rounded-2xl border border-dashed border-stone-800 p-4 text-center text-xs text-stone-500">No product sales in this range.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-stone-800 bg-stone-950/60 p-6">
                <div className="mb-5 flex items-center justify-between">
                  <span className="text-lg font-black text-white">Revenue Last 30 Days</span>
                  <span className="font-mono text-xs font-black text-amber-400">{formatMoney(analytics.thirtyDaySeries.reduce((sum, day) => sum + day.revenue, 0))}</span>
                </div>
                <div className="flex h-44 items-end gap-1">
                  {analytics.thirtyDaySeries.map((day) => {
                    const maxRevenue = Math.max(1, ...analytics.thirtyDaySeries.map((item) => item.revenue));
                    return (
                      <div key={day.key} className="flex h-full flex-1 flex-col justify-end">
                        <div
                          className="min-h-1 rounded-t bg-amber-500"
                          title={`${day.label}: ${formatMoney(day.revenue)}`}
                          style={{ height: `${Math.max(4, (day.revenue / maxRevenue) * 100)}%` }}
                        />
                      </div>
                    );
                  })}
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
                <span className="text-white font-extrabold text-lg">შეკვეთების ჟურნალი ({visibleOrders.length})</span>
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

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOrderStatusFilter('all')}
                  className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wide transition-colors ${
                    orderStatusFilter === 'all'
                      ? 'bg-amber-500 text-stone-950'
                      : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                  }`}
                >
                  All
                </button>
                {ORDER_STATUSES.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setOrderStatusFilter(status)}
                    className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wide transition-colors ${
                      orderStatusFilter === status
                        ? 'bg-amber-500 text-stone-950'
                        : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                    }`}
                  >
                    {getOrderStatusLabel(status)}
                  </button>
                ))}
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
              visibleOrders.map(ord => {
                // Color mapping helper
                const statusLabels: { [key: string]: { label: string; class: string } } = {
                  new: { label: 'ახალი 🚀', class: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
                  preparing: { label: 'მზადდება 👨‍🍳', class: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
                  delivering: { label: 'გზაშია 🛵', class: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
                  delivered: { label: 'ჩაბარდა 🥗', class: 'bg-green-500/10 text-green-400 border-green-500/20' },
                  cancelled: { label: 'გაუქმდა ❌', class: 'bg-red-500/10 text-red-400 border-red-500/20' },
                };

                const stat = {
                  label: getOrderStatusLabel(ord.status),
                  class: getOrderStatusClass(ord.status),
                };
                const nextStatus = getNextOrderStatus(ord.status);

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
                            {ord.status === 'pending' && (
                              <button
                                onClick={() => guardedUpdateOrderStatus(ord.id, 'accepted')}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-stone-950 font-black text-[10px] rounded-lg transition-colors duration-200 cursor-pointer"
                              >
                                დამუშავება ▶
                              </button>
                            )}
                            {ord.status === 'accepted' && (
                              <button
                                onClick={() => guardedUpdateOrderStatus(ord.id, 'preparing')}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-stone-950 font-black text-[10px] rounded-lg transition-colors duration-200 cursor-pointer"
                              >
                                Mark Preparing
                              </button>
                            )}
                            {ord.status === 'preparing' && (
                              <button
                                onClick={() => guardedUpdateOrderStatus(ord.id, 'ready')}
                                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-stone-950 font-black text-[10px] rounded-lg transition-colors duration-200 cursor-pointer"
                              >
                                გაგზავნა ▶
                              </button>
                            )}
                            {ord.status === 'ready' && (
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

              {!ordersLoading && visibleOrders.length === 0 && (
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
                      <input
                        type="text"
                        list="admin-product-categories"
                        value={newCat}
                        onChange={(e) => setNewCat(e.target.value)}
                        placeholder="Custom category"
                        className="mt-2 w-full bg-stone-900 border border-stone-800 rounded-xl py-2 px-3 text-xs text-white placeholder-stone-600 focus:outline-none focus:border-amber-500"
                      />
                      <datalist id="admin-product-categories">
                        {categoryOptions.map((category) => (
                          <option key={category} value={category} />
                        ))}
                      </datalist>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] text-stone-400 uppercase tracking-wide font-bold">Availability</label>
                        <select
                          value={newAvailable ? 'available' : 'unavailable'}
                          onChange={(e) => setNewAvailable(e.target.value === 'available')}
                          className="w-full bg-stone-900 border border-stone-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-500"
                        >
                          <option value="available">Available</option>
                          <option value="unavailable">Unavailable</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-stone-400 uppercase tracking-wide font-bold">Discount %</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={newDiscountPercent}
                          onChange={(e) => setNewDiscountPercent(e.target.value)}
                          placeholder="Optional"
                          className="w-full bg-stone-900 border border-stone-800 rounded-xl py-2 px-3 text-xs text-white placeholder-stone-600 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-400 uppercase tracking-wide font-bold">Product image</label>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          setNewImageFile(file);
                          setImageUploadError(file ? validateProductImage(file) : null);
                        }}
                        className="w-full bg-stone-900 border border-stone-800 rounded-xl py-2 px-3 text-xs text-white file:mr-3 file:rounded-lg file:border-0 file:bg-amber-500 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-stone-950 focus:outline-none focus:border-amber-500"
                      />
                      <p className="text-[10px] text-stone-500">JPG, PNG, or WebP. Max 2 MB.</p>
                    </div>

                    {imageUploadError && (
                      <p className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                        {imageUploadError}
                      </p>
                    )}

                    {uploadingImageId && (
                      <p className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin motion-reduce:animate-none" />
                        Uploading product image...
                      </p>
                    )}

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
                        disabled={Boolean(uploadingImageId) || Boolean(imageUploadError)}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-extrabold rounded-lg flex items-center space-x-1 transition-colors duration-200 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>დამატება</span>
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              {imageUploadError && !isAddingItem && (
                <p className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                  {imageUploadError}
                </p>
              )}

              {/* Menu items list view with price editor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {menuItems.map(itm => (
                  <div
                    key={itm.id}
                    className="bg-stone-950/80 border border-stone-800 p-4 rounded-3xl flex items-center justify-between gap-4 text-left hover:border-stone-750 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative w-16 h-16 shrink-0">
                        <img
                          referrerPolicy="no-referrer"
                          src={itm.image}
                          alt={itm.name}
                          className="w-16 h-16 rounded-2xl object-cover bg-stone-905"
                        />
                        {uploadingImageId === itm.id && (
                          <div className="absolute inset-0 rounded-2xl bg-stone-950/70 flex items-center justify-center">
                            <Loader2 className="w-5 h-5 text-amber-400 animate-spin motion-reduce:animate-none" />
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/10 font-mono">
                          {itm.category.toUpperCase()}
                        </span>
                        <h4 className="text-sm font-bold text-white mt-1.5 leading-tight">{itm.name}</h4>
                        <span className="text-[10px] text-stone-500 block leading-tight mt-0.5">ID: {itm.id}</span>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span
                            className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                              itm.available === false
                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                : 'bg-green-500/10 text-green-400 border border-green-500/20'
                            }`}
                          >
                            {itm.available === false ? 'UNAVAILABLE' : 'AVAILABLE'}
                          </span>
                          {itm.discountPercent ? (
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              -{itm.discountPercent}%
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-3">
                      <div className="text-right">
                        <span className="text-[9px] text-stone-550 block font-mono">IMAGE</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          disabled={Boolean(uploadingImageId)}
                          onChange={(e) => {
                            void handleExistingProductImageChange(
                              itm.id,
                              e.target.files?.[0] ?? null
                            );
                            e.currentTarget.value = '';
                          }}
                          className="block w-28 text-[10px] text-stone-400 file:mr-1 file:rounded file:border-0 file:bg-stone-800 file:px-2 file:py-1 file:text-[10px] file:font-bold file:text-stone-200 disabled:opacity-50"
                        />
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-stone-550 block font-mono">STATUS</span>
                        <select
                          value={itm.available === false ? 'unavailable' : 'available'}
                          onChange={(e) => onUpdateMenuAvailability(itm.id, e.target.value === 'available')}
                          className="bg-stone-900 border border-stone-800 text-white rounded px-1.5 py-0.5 w-28 text-xs focus:outline-all"
                        >
                          <option value="available">Available</option>
                          <option value="unavailable">Unavailable</option>
                        </select>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-stone-550 block font-mono">DISCOUNT %</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          className="bg-stone-900 border border-stone-800 text-white font-mono rounded px-1.5 py-0.5 w-16 text-center text-xs focus:outline-all"
                          value={itm.discountPercent ?? ''}
                          onChange={(e) => {
                            const value = Number(e.target.value);
                            onUpdateMenuDiscount(
                              itm.id,
                              Number.isFinite(value) ? Math.min(value, 100) : undefined
                            );
                          }}
                        />
                      </div>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-3xl border border-stone-800 bg-stone-950/70 p-4">
                <label className="space-y-1">
                  <span className="block text-[10px] font-black uppercase tracking-wide text-stone-500">Product</span>
                  <select
                    value={reviewProductFilter}
                    onChange={(event) => setReviewProductFilter(event.target.value)}
                    className="w-full rounded-xl border border-stone-800 bg-stone-900 px-3 py-2 text-xs font-bold text-stone-200 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="all">All products</option>
                    {menuItems.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="block text-[10px] font-black uppercase tracking-wide text-stone-500">Rating</span>
                  <select
                    value={reviewRatingFilter}
                    onChange={(event) => setReviewRatingFilter(event.target.value)}
                    className="w-full rounded-xl border border-stone-800 bg-stone-900 px-3 py-2 text-xs font-bold text-stone-200 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="all">All ratings</option>
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <option key={rating} value={rating}>{rating} stars</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="space-y-3">
                {reviewsLoading && (
                  <div className="text-center py-16 bg-stone-950 rounded-3xl border border-stone-800">
                    <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-amber-500 motion-reduce:animate-none" />
                    <p className="text-stone-400 text-sm">Loading reviews...</p>
                  </div>
                )}

                {!reviewsLoading && reviewsError && (
                  <div className="text-center py-16 bg-red-950/30 rounded-3xl border border-red-900/60">
                    <p className="text-red-200 text-sm">{reviewsError}</p>
                  </div>
                )}

                {!reviewsLoading && !reviewsError && filteredReviews.map(rev => (
                  <div
                    key={rev.id}
                    className="bg-stone-950/80 border border-stone-800 p-5 rounded-3xl text-left flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white text-xs sm:text-sm">{rev.userName || rev.author}</span>
                        <span className="rounded-full bg-stone-900 px-2 py-0.5 text-[10px] font-bold text-stone-400">
                          {getMenuItemName(rev.productId)}
                        </span>
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

                {!reviewsLoading && !reviewsError && filteredReviews.length === 0 && (
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
