import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, doc, onSnapshot, query, Timestamp, updateDoc, where } from 'firebase/firestore';
import {
  ArrowUpRight,
  Bell,
  CheckCircle2,
  Clock,
  CreditCard,
  Edit3,
  Heart,
  Landmark,
  Mail,
  Loader2,
  LogOut,
  MapPin,
  Navigation,
  Phone,
  Save,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Route,
  Trash2,
  UserRound,
  WalletCards,
  X,
  XCircle,
} from 'lucide-react';
import { db, getAuthErrorMessage, updateUserProfile } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { clearSavedCard, getSavedCard, type SavedCard } from '../utils/cardPayment';
import type { MenuItem, Notification, Order } from '../types';
import {
  ACTIVE_ORDER_STATUSES,
  ORDER_PROGRESS_STATUSES,
  getEstimatedDeliveryWindow,
  getOrderStatusClass,
  getOrderStatusLabel,
  normalizeOrderStatus,
} from '../utils/orders';
import { useTranslation } from 'react-i18next';

function mapProfileOrder(docId: string, data: Record<string, unknown>): Order {
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
    paymentMethod: (data.paymentMethod as Order['paymentMethod']) ?? 'card_online',
    items: (data.items as Order['items']) ?? [],
    totalPrice: Number(data.totalPrice ?? 0),
    status: normalizeOrderStatus(data.status),
    createdAt,
    notes: data.notes ? String(data.notes) : undefined,
    estimatedMinutesMin: typeof data.estimatedMinutesMin === 'number' ? data.estimatedMinutesMin : null,
    estimatedMinutesMax: typeof data.estimatedMinutesMax === 'number' ? data.estimatedMinutesMax : null,
    estimatedArrivalTime: typeof data.estimatedArrivalTime === 'string' ? data.estimatedArrivalTime : null,
  };
}

function mapProfileNotification(docId: string, data: Record<string, unknown>): Notification {
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
    role: data.role === 'admin' ? 'admin' : 'user',
    type: String(data.type ?? 'system'),
    title: String(data.title ?? ''),
    message: String(data.message ?? ''),
    read: Boolean(data.read),
    createdAt,
    orderId: data.orderId ? String(data.orderId) : undefined,
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'GEL',
    maximumFractionDigits: 2,
  }).format(value);
}

function splitDisplayName(displayName: string | null | undefined) {
  const parts = (displayName ?? '').trim().split(/\s+/).filter(Boolean);

  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  };
}

interface UserProfileProps {
  favoriteItems?: MenuItem[];
  onRemoveFavorite?: (productId: string) => Promise<void>;
  onSignedOut?: () => void;
  onOpenAdmin?: () => void;
  onOpenBanking?: () => void;
}

export default function UserProfile({
  favoriteItems = [],
  onRemoveFavorite,
  onSignedOut,
  onOpenAdmin,
  onOpenBanking,
}: UserProfileProps) {
  const { t } = useTranslation();
  const { user, profile, isAdmin, signOut } = useAuth();
  const [savedCard, setSavedCard] = useState<SavedCard | null>(() => getSavedCard());
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);

  useEffect(() => {
    setSavedCard(getSavedCard());
  }, []);

  useEffect(() => {
    if (isEditing) {
      return;
    }

    const fallbackName = splitDisplayName(profile?.displayName || user?.displayName);
    setFirstName(profile?.firstName ?? fallbackName.firstName);
    setLastName(profile?.lastName ?? fallbackName.lastName);
    setPhoneNumber(profile?.phoneNumber ?? '');
  }, [
    isEditing,
    profile?.displayName,
    profile?.firstName,
    profile?.lastName,
    profile?.phoneNumber,
    user?.displayName,
  ]);

  useEffect(() => {
    if (!user) {
      setOrders([]);
      setOrdersLoading(false);
      return;
    }

    setOrdersLoading(true);
    setOrdersError(null);

    const ordersQuery = query(collection(db, 'orders'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const nextOrders = snapshot.docs
          .map((orderDoc) => mapProfileOrder(orderDoc.id, orderDoc.data()))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setOrders(nextOrders);
        setOrdersLoading(false);
      },
      (error) => {
        console.error('Failed to load profile orders:', error);
        setOrdersError(t('profile.ordersError'));
        setOrdersLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setNotificationsLoading(false);
      return;
    }

    setNotificationsLoading(true);
    setNotificationsError(null);

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('role', '==', 'user'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const nextNotifications = snapshot.docs
          .map((notificationDoc) =>
            mapProfileNotification(notificationDoc.id, notificationDoc.data())
          )
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setNotifications(nextNotifications);
        setNotificationsLoading(false);
      },
      (error) => {
        console.error('Failed to load profile notifications:', error);
        setNotificationsError(t('profile.notificationsError'));
        setNotificationsLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  const initials = useMemo(() => {
    const source = profile?.displayName || user?.displayName || user?.email || 'SY';
    return source
      .split(/\s|@/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }, [profile?.displayName, user?.displayName, user?.email]);

  const activeOrderIds = useMemo(
    () => new Set(orders.filter((order) => ACTIVE_ORDER_STATUSES.includes(order.status)).map((order) => order.id)),
    [orders]
  );

  const handleClearCard = () => {
    clearSavedCard();
    setSavedCard(null);
  };

  const markNotificationRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { read: true });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      setNotificationsError('Could not update notification.');
    }
  };

  const handleCancelEdit = () => {
    const fallbackName = splitDisplayName(profile?.displayName || user?.displayName);
    setFirstName(profile?.firstName ?? fallbackName.firstName);
    setLastName(profile?.lastName ?? fallbackName.lastName);
    setPhoneNumber(profile?.phoneNumber ?? '');
    setProfileError(null);
    setProfileSuccess(null);
    setIsEditing(false);
  };

  const handleSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      setProfileError(t('app.signInRequired'));
      return;
    }

    setSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      await updateUserProfile(user, {
        firstName,
        lastName,
        phoneNumber,
      });
      setProfileSuccess(t('profile.profileUpdated'));
      setIsEditing(false);
    } catch (error) {
      const code = (error as { code?: string })?.code ?? '';
      setProfileError(code ? getAuthErrorMessage(code) : 'Could not save profile changes right now.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    setProfileError(null);

    try {
      await signOut();
      onSignedOut?.();
    } catch (error) {
      const code = (error as { code?: string })?.code ?? '';
      setProfileError(code ? getAuthErrorMessage(code) : 'Could not sign out right now.');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <section className="min-h-screen bg-stone-950 text-stone-100 charcoal-grid-bg">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <header className="border-b border-stone-800 pb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-amber-500">
            <UserRound className="h-3.5 w-3.5" />
            {t('profile.title')}
          </div>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-black leading-none text-white sm:text-4xl">
                პროფილი / User Profile
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-400 sm:text-base">
                {t('profile.description')}
              </p>
            </div>
            <div className="rounded-2xl border border-stone-800 bg-stone-900 px-4 py-3">
              <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone-500">
                {t('profile.accountStatus')}
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm font-black text-amber-500">
                <ShieldCheck className="h-4 w-4" />
                {isAdmin ? t('profile.adminAccount') : t('profile.verifiedCustomer')}
              </p>
            </div>
          </div>
        </header>

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
          <section className="rounded-3xl border border-stone-800 bg-stone-950/85 p-4 shadow-xl sm:p-6 xl:col-span-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-red-600 text-xl font-black text-stone-950 shadow-lg shadow-amber-500/20">
                {initials || 'SY'}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-amber-500">
                  {t('profile.personalInfo')}
                </p>
                <h2 className="mt-1 truncate text-xl font-black text-white">
                  {profile?.displayName || user?.displayName || t('profile.guest')}
                </h2>
              </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setProfileError(null);
                  setProfileSuccess(null);
                  setIsEditing((value) => !value);
                }}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-amber-400 transition-colors hover:bg-amber-500/15"
              >
                {isEditing ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                {isEditing ? t('profile.cancel') : t('profile.edit')}
              </button>
            </div>

            {isEditing ? (
              <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
                <ProfileInput
                  icon={<UserRound className="h-4 w-4" />}
                  label={t('profile.firstName')}
                  value={firstName}
                  onChange={setFirstName}
                  autoComplete="given-name"
                  required
                />
                <ProfileInput
                  icon={<UserRound className="h-4 w-4" />}
                  label={t('profile.lastName')}
                  value={lastName}
                  onChange={setLastName}
                  autoComplete="family-name"
                />
                <ProfileInput
                  icon={<Phone className="h-4 w-4" />}
                  label={t('profile.phoneNumber')}
                  value={phoneNumber}
                  onChange={setPhoneNumber}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+995 5XX XX XX XX"
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3 text-sm font-black text-stone-950 shadow-xl shadow-amber-500/15 transition-all hover:from-amber-400 hover:to-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingProfile ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {t('profile.save')}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={savingProfile}
                    className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-stone-700 bg-stone-900 px-4 py-3 text-sm font-bold text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <X className="h-4 w-4" />
                    {t('profile.cancel')}
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-6 space-y-3">
                <InfoRow
                  icon={<UserRound className="h-4 w-4" />}
                  label={t('profile.name')}
                  value={profile?.displayName || user?.displayName || t('profile.notAdded')}
                />
                <InfoRow
                  icon={<Mail className="h-4 w-4" />}
                  label={t('profile.email')}
                  value={profile?.email || user?.email || t('profile.noEmail')}
                />
                <InfoRow
                  icon={<Phone className="h-4 w-4" />}
                  label={t('profile.phone')}
                  value={profile?.phoneNumber || t('profile.notAdded')}
                />
                <InfoRow
                  icon={<ShieldCheck className="h-4 w-4" />}
                  label={t('profile.role')}
                  value={isAdmin ? t('navbar.adminShort') : t('profile.customer')}
                />
              </div>
            )}

            {profileSuccess && (
              <p className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300">
                {profileSuccess}
              </p>
            )}
            {profileError && (
              <p className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
                {profileError}
              </p>
            )}

            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="mt-5 inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm font-black text-red-200 transition-colors hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              {t('profile.signOut')}
            </button>
          </section>

          <section className="rounded-3xl border border-stone-800 bg-stone-950/85 p-4 shadow-xl sm:p-6 xl:col-span-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-amber-500">
                  Favorites
                </p>
                <h2 className="mt-1 text-xl font-black text-white">Saved Products</h2>
                <p className="mt-1 text-xs text-stone-500">
                  {favoriteItems.length} favorite{favoriteItems.length === 1 ? '' : 's'}
                </p>
              </div>
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-500">
                <Heart className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {favoriteItems.length > 0 ? (
                favoriteItems.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-stone-800 bg-stone-900 p-3">
                    <div className="flex items-center gap-3">
                      <img
                        referrerPolicy="no-referrer"
                        src={item.image}
                        alt={item.name}
                        className="h-16 w-16 shrink-0 rounded-2xl bg-stone-800 object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-white">{item.name}</p>
                        <p className="mt-1 text-[10px] font-mono uppercase tracking-[0.16em] text-amber-500">
                          {item.category}
                        </p>
                        <p className="mt-1 text-sm font-black text-stone-200">{formatMoney(item.price)}</p>
                      </div>
                      {onRemoveFavorite && (
                        <button
                          type="button"
                          onClick={() => void onRemoveFavorite(item.id)}
                          className="shrink-0 cursor-pointer rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-red-300 transition-colors hover:bg-red-500/15"
                          aria-label="Remove favorite"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-stone-700 bg-stone-900/70 p-4 text-sm text-stone-400 sm:col-span-2">
                  Favorite products from the menu will appear here.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-stone-800 bg-stone-950/85 p-4 shadow-xl sm:p-6 xl:col-span-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-amber-500">
                  {t('profile.savedCards')}
                </p>
                <h2 className="mt-1 text-xl font-black text-white">{t('profile.savedPaymentCards')}</h2>
              </div>
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-500">
                <WalletCards className="h-5 w-5" />
              </div>
            </div>

            {savedCard ? (
              <div className="mt-5 rounded-2xl border border-stone-800 bg-stone-900 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-black text-white">
                      <CreditCard className="h-4 w-4 text-amber-500" />
                      {savedCard.maskedLabel}
                    </p>
                    <p className="mt-2 text-xs text-stone-400">
                      {savedCard.cardholderName || 'Cardholder'} · saved{' '}
                      {formatDate(savedCard.savedAt)}
                    </p>
                    <p className="mt-1 text-[10px] font-mono uppercase tracking-[0.2em] text-stone-500">
                      Tokenized checkout card
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearCard}
                    className="shrink-0 cursor-pointer rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-red-300 transition-colors hover:bg-red-500/15"
                    aria-label="Remove saved card"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-stone-700 bg-stone-900/70 p-4">
                <p className="text-sm font-semibold text-stone-200">{t('profile.noSavedCard')}</p>
                <p className="mt-2 text-xs leading-5 text-stone-400">
                  {t('profile.noSavedCardDescription')}
                </p>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-stone-800 bg-stone-950/85 p-4 shadow-xl sm:p-6 xl:col-span-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-amber-500">
                  {t('profile.recentOrders')}
                </p>
                <h2 className="mt-1 text-xl font-black text-white">{t('profile.orderHistory')}</h2>
              </div>
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-500">
                <ShoppingBag className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {ordersLoading ? (
                <p className="rounded-2xl border border-stone-800 bg-stone-900 p-4 text-sm text-stone-400">
                  {t('profile.loadingOrders')}
                </p>
              ) : ordersError ? (
                <p className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                  {ordersError}
                </p>
              ) : orders.length > 0 ? (
                orders.map((order) => {
                  const isTracking = trackingOrderId === order.id;
                  const canTrack = activeOrderIds.has(order.id);

                  return (
                    <div key={order.id} className="overflow-hidden rounded-2xl border border-stone-800 bg-stone-900">
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-white">{order.id}</p>
                            <p className="mt-1 text-xs text-stone-400">
                              {order.items.length} {t(order.items.length === 1 ? 'cart.products' : 'cart.products')} ·{' '}
                              {formatDate(order.createdAt)}
                            </p>
                          </div>
                          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${getOrderStatusClass(order.status)}`}>
                            {getOrderStatusLabel(order.status)}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm font-black text-amber-500">
                            {formatMoney(order.totalPrice)}
                          </p>
                          <button
                            type="button"
                            onClick={() => setTrackingOrderId(isTracking ? null : order.id)}
                            className={`inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${
                              canTrack
                                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 shadow-lg shadow-amber-500/15 hover:from-amber-400 hover:to-amber-500'
                                : 'border border-stone-700 bg-stone-950 text-stone-300 hover:border-amber-500/30'
                            }`}
                          >
                            <Route className="h-3.5 w-3.5" />
                            {canTrack ? 'Track Order' : 'View Status'}
                          </button>
                        </div>
                      </div>

                      <AnimatePresence initial={false}>
                        {isTracking && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            className="overflow-hidden border-t border-stone-800"
                          >
                            <OrderTrackingPanel order={order} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              ) : (
                <p className="rounded-2xl border border-dashed border-stone-700 bg-stone-900/70 p-4 text-sm text-stone-400">
                  {t('profile.noOrders')}
                </p>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-stone-800 bg-stone-950/85 p-4 shadow-xl sm:p-6 xl:col-span-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-amber-500">
                  {t('profile.notifications')}
                </p>
                <h2 className="mt-1 text-xl font-black text-white">{t('profile.orderUpdates')}</h2>
                <p className="mt-1 text-xs text-stone-500">
                  {t('profile.unread', { count: notifications.filter((notification) => !notification.read).length })}
                </p>
              </div>
              <div className="relative rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-500">
                <Bell className="h-5 w-5" />
                {notifications.filter((notification) => !notification.read).length > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full border border-stone-950 bg-red-600 px-1 text-[9px] font-bold text-white">
                    {notifications.filter((notification) => !notification.read).length}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {notificationsLoading ? (
                <p className="rounded-2xl border border-stone-800 bg-stone-900 p-4 text-sm text-stone-400">
                  {t('profile.loadingNotifications')}
                </p>
              ) : notificationsError ? (
                <p className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                  {notificationsError}
                </p>
              ) : notifications.length > 0 ? (
                notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => void markNotificationRead(notification.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                      notification.read
                        ? 'border-stone-800 bg-stone-900 text-stone-400'
                        : 'border-amber-500/20 bg-amber-500/10 text-stone-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-white">{notification.title}</p>
                        <p className="mt-1 text-xs leading-5 text-stone-400">{notification.message}</p>
                        <p className="mt-2 text-[10px] font-mono uppercase tracking-wide text-stone-600">
                          {formatDate(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.read && (
                        <span className="rounded-full bg-red-600 px-2 py-0.5 text-[9px] font-black uppercase text-white">
                          {t('menu.card.new')}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-stone-700 bg-stone-900/70 p-4 text-sm text-stone-400">
                  {t('profile.noNotifications')}
                </p>
              )}
            </div>
          </section>
        </div>

        {isAdmin && (
          <section className="mt-6 overflow-hidden rounded-3xl border border-amber-500/20 bg-stone-950/90 shadow-2xl shadow-amber-500/5">
            <div className="border-b border-stone-800 bg-amber-500/5 px-4 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-amber-500">
                    Secure Administration
                  </p>
                  <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">
                    ადმინისტრაცია / Administration
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-400">
                    Authorized controls for restaurant operations and protected banking data.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 p-4 sm:p-6 lg:grid-cols-2">
              <AdminControlCard
                icon={<Settings className="h-6 w-6" />}
                title="ადმინ პანელი / Admin Panel"
                description="Manage orders, menu items, pricing, and customer reviews."
                onClick={onOpenAdmin}
              />
              <AdminControlCard
                icon={<Landmark className="h-6 w-6" />}
                title="ანგარიშები / Banking Dashboard"
                description="Review authenticated balances, transactions, and banking exports."
                onClick={onOpenBanking}
              />
            </div>
          </section>
        )}
      </div>
    </section>
  );
}

function OrderTrackingPanel({ order }: { order: Order }) {
  const currentIndex = ORDER_PROGRESS_STATUSES.indexOf(order.status);
  const isCancelled = order.status === 'cancelled';
  const isDelivered = order.status === 'delivered';
  const estimate = order.estimatedMinutesMin !== undefined && order.estimatedMinutesMax !== undefined
    ? {
        min: order.estimatedMinutesMin,
        max: order.estimatedMinutesMax,
        label: order.estimatedMinutesMin === null || order.estimatedMinutesMax === null
          ? getEstimatedDeliveryWindow(order.status).label
          : `${order.estimatedMinutesMin}-${order.estimatedMinutesMax} min`,
      }
    : getEstimatedDeliveryWindow(order.status);
  const arrivalLabel = order.estimatedArrivalTime
    ? formatDate(order.estimatedArrivalTime)
    : null;

  return (
    <div className="bg-stone-950/80 p-4 sm:p-5">
      <div className={`rounded-2xl border p-4 ${
        isCancelled
          ? 'border-red-500/20 bg-red-500/10'
          : isDelivered
            ? 'border-green-500/20 bg-green-500/10'
            : 'border-amber-500/20 bg-amber-500/10'
      }`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
              isCancelled
                ? 'bg-red-500/15 text-red-300'
                : isDelivered
                  ? 'bg-green-500/15 text-green-300'
                  : 'bg-amber-500 text-stone-950'
            }`}>
              {isCancelled ? <XCircle className="h-5 w-5" /> : isDelivered ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
            </span>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone-400">Estimated delivery</p>
              <p className="mt-1 text-lg font-black text-white">{estimate.label}</p>
            </div>
          </div>
          {arrivalLabel && (
            <div className="rounded-xl border border-stone-800 bg-stone-950/70 px-3 py-2 text-xs font-bold text-stone-300">
              ETA {arrivalLabel}
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TrackingInfo icon={<MapPin className="h-4 w-4" />} label="Address" value={order.customerAddress || order.address || 'Not provided'} />
        <TrackingInfo icon={<Phone className="h-4 w-4" />} label="Phone" value={order.customerPhone || order.phone || 'Not provided'} />
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-stone-800 bg-stone-900/70">
        <div className="divide-y divide-stone-800">
          {order.items.map((item, index) => (
            <div key={`${item.name}-${index}`} className="flex items-start justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="text-sm font-black text-white">
                  {item.quantity}x {item.name}
                </p>
                <p className="mt-1 text-xs text-stone-400">
                  {item.size}{item.extras.length > 0 ? ` · + ${item.extras.join(', ')}` : ''}
                </p>
              </div>
              <p className="shrink-0 font-mono text-sm font-black text-amber-500">
                {formatMoney(item.price * item.quantity)}
              </p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-stone-800 bg-stone-950/60 p-3">
          <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-stone-500">Total</span>
          <span className="font-mono text-base font-black text-white">{formatMoney(order.totalPrice)}</span>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {ORDER_PROGRESS_STATUSES.map((status, index) => {
          const isComplete = !isCancelled && index < currentIndex;
          const isCurrent = !isCancelled && index === currentIndex;
          const isFuture = isCancelled || index > currentIndex;

          return (
            <div key={status} className="relative flex gap-3">
              {index < ORDER_PROGRESS_STATUSES.length - 1 && (
                <span className={`absolute left-5 top-10 h-[calc(100%-0.25rem)] w-px ${
                  isComplete ? 'bg-amber-500' : 'bg-stone-800'
                }`} />
              )}
              <motion.span
                layout
                className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
                  isComplete
                    ? 'border-amber-500 bg-amber-500 text-stone-950'
                    : isCurrent
                      ? 'border-red-500 bg-red-600 text-white shadow-lg shadow-red-600/20'
                      : 'border-stone-800 bg-stone-900 text-stone-500'
                }`}
              >
                {isComplete ? <CheckCircle2 className="h-4 w-4" /> : isCurrent ? <Navigation className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
              </motion.span>
              <div className={`min-w-0 rounded-2xl border p-3 flex-1 ${
                isCurrent
                  ? 'border-amber-500/30 bg-amber-500/10'
                  : 'border-stone-800 bg-stone-900/50'
              }`}>
                <p className={`text-sm font-black ${isFuture ? 'text-stone-500' : 'text-white'}`}>
                  {getOrderStatusLabel(status)}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  {getEstimatedDeliveryWindow(status).label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {isCancelled && (
        <p className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-bold text-red-300">
          This order was cancelled.
        </p>
      )}
      {isDelivered && (
        <p className="mt-4 rounded-2xl border border-green-500/20 bg-green-500/10 p-3 text-xs font-bold text-green-300">
          Delivered. Enjoy your meal!
        </p>
      )}
    </div>
  );
}

function TrackingInfo({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-3">
      <p className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-stone-500">
        <span className="text-amber-500">{icon}</span>
        {label}
      </p>
      <p className="mt-2 text-sm font-bold leading-5 text-stone-200">{value}</p>
    </div>
  );
}

function AdminControlCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-36 w-full cursor-pointer items-start justify-between gap-4 rounded-2xl border border-stone-800 bg-stone-900 p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500/40 hover:bg-stone-800 hover:shadow-xl hover:shadow-amber-500/5"
    >
      <span className="flex min-w-0 items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-stone-950 shadow-lg shadow-amber-500/20">
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block text-base font-black text-white sm:text-lg">{title}</span>
          <span className="mt-2 block text-sm leading-6 text-stone-400">{description}</span>
        </span>
      </span>
      <ArrowUpRight className="h-5 w-5 shrink-0 text-stone-600 transition-colors group-hover:text-amber-400" />
    </button>
  );
}

function ProfileInput({
  icon,
  label,
  value,
  onChange,
  type = 'text',
  inputMode,
  autoComplete,
  placeholder,
  required = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  inputMode?: 'text' | 'tel' | 'email' | 'numeric' | 'decimal' | 'search' | 'url';
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.22em] text-stone-500">
        <span className="text-amber-500">{icon}</span>
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-2xl border border-stone-800 bg-stone-900 px-4 py-3 text-sm font-semibold text-stone-100 outline-none transition-colors placeholder:text-stone-600 focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20"
      />
    </label>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-stone-800 bg-stone-900 px-4 py-3">
      <p className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.22em] text-stone-500">
        <span className="text-amber-500">{icon}</span>
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-stone-100">{value}</p>
    </div>
  );
}
