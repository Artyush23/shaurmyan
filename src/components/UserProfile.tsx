import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { collection, onSnapshot, query, Timestamp, where } from 'firebase/firestore';
import {
  ArrowUpRight,
  CreditCard,
  Edit3,
  Landmark,
  Mail,
  Loader2,
  LogOut,
  Phone,
  Save,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  UserRound,
  WalletCards,
  X,
} from 'lucide-react';
import { db, getAuthErrorMessage, updateUserProfile } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { clearSavedCard, getSavedCard, type SavedCard } from '../utils/cardPayment';
import type { Order } from '../types';

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
    customerName: String(data.customerName ?? ''),
    customerPhone: String(data.customerPhone ?? ''),
    customerAddress: String(data.customerAddress ?? ''),
    paymentMethod: (data.paymentMethod as Order['paymentMethod']) ?? 'card_online',
    items: (data.items as Order['items']) ?? [],
    totalPrice: Number(data.totalPrice ?? 0),
    status: (data.status as Order['status']) ?? 'new',
    createdAt,
    notes: data.notes ? String(data.notes) : undefined,
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
  onSignedOut?: () => void;
  onOpenAdmin?: () => void;
  onOpenBanking?: () => void;
}

export default function UserProfile({
  onSignedOut,
  onOpenAdmin,
  onOpenBanking,
}: UserProfileProps) {
  const { user, profile, isAdmin, signOut } = useAuth();
  const [savedCard, setSavedCard] = useState<SavedCard | null>(() => getSavedCard());
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

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
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5);

        setOrders(nextOrders);
        setOrdersLoading(false);
      },
      (error) => {
        console.error('Failed to load profile orders:', error);
        setOrdersError('Could not load recent orders right now.');
        setOrdersLoading(false);
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

  const handleClearCard = () => {
    clearSavedCard();
    setSavedCard(null);
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
      setProfileError('Please sign in again before updating your profile.');
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
      setProfileSuccess('Profile updated successfully.');
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
            Profile
          </div>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-black leading-none text-white sm:text-4xl">
                პროფილი / User Profile
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-400 sm:text-base">
                Manage your ShaurmYAN account, saved cards, and recent online-only checkout activity.
              </p>
            </div>
            <div className="rounded-2xl border border-stone-800 bg-stone-900 px-4 py-3">
              <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone-500">
                Account status
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm font-black text-amber-500">
                <ShieldCheck className="h-4 w-4" />
                {isAdmin ? 'Admin account' : 'Verified customer'}
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
                  Personal Information
                </p>
                <h2 className="mt-1 truncate text-xl font-black text-white">
                  {profile?.displayName || user?.displayName || 'ShaurmYAN Guest'}
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
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>

            {isEditing ? (
              <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
                <ProfileInput
                  icon={<UserRound className="h-4 w-4" />}
                  label="First Name"
                  value={firstName}
                  onChange={setFirstName}
                  autoComplete="given-name"
                  required
                />
                <ProfileInput
                  icon={<UserRound className="h-4 w-4" />}
                  label="Last Name"
                  value={lastName}
                  onChange={setLastName}
                  autoComplete="family-name"
                />
                <ProfileInput
                  icon={<Phone className="h-4 w-4" />}
                  label="Phone Number"
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
                    შენახვა / Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={savingProfile}
                    className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-stone-700 bg-stone-900 px-4 py-3 text-sm font-bold text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-6 space-y-3">
                <InfoRow
                  icon={<UserRound className="h-4 w-4" />}
                  label="Name"
                  value={profile?.displayName || user?.displayName || 'Not added yet'}
                />
                <InfoRow
                  icon={<Mail className="h-4 w-4" />}
                  label="Email"
                  value={profile?.email || user?.email || 'No email available'}
                />
                <InfoRow
                  icon={<Phone className="h-4 w-4" />}
                  label="Phone"
                  value={profile?.phoneNumber || 'Not added yet'}
                />
                <InfoRow
                  icon={<ShieldCheck className="h-4 w-4" />}
                  label="Role"
                  value={isAdmin ? 'Admin' : 'Customer'}
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
              გამოსვლა / Sign Out
            </button>
          </section>

          <section className="rounded-3xl border border-stone-800 bg-stone-950/85 p-4 shadow-xl sm:p-6 xl:col-span-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-amber-500">
                  შენახული ბარათები
                </p>
                <h2 className="mt-1 text-xl font-black text-white">Saved Payment Cards</h2>
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
                <p className="text-sm font-semibold text-stone-200">No saved card yet.</p>
                <p className="mt-2 text-xs leading-5 text-stone-400">
                  Save a card during online payment to speed up future ShaurmYAN checkouts.
                </p>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-stone-800 bg-stone-950/85 p-4 shadow-xl sm:p-6 xl:col-span-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-amber-500">
                  Recent Orders
                </p>
                <h2 className="mt-1 text-xl font-black text-white">Order History</h2>
              </div>
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-500">
                <ShoppingBag className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {ordersLoading ? (
                <p className="rounded-2xl border border-stone-800 bg-stone-900 p-4 text-sm text-stone-400">
                  Loading recent orders...
                </p>
              ) : ordersError ? (
                <p className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                  {ordersError}
                </p>
              ) : orders.length > 0 ? (
                orders.map((order) => (
                  <div key={order.id} className="rounded-2xl border border-stone-800 bg-stone-900 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">{order.id}</p>
                        <p className="mt-1 text-xs text-stone-400">
                          {order.items.length} item{order.items.length === 1 ? '' : 's'} ·{' '}
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-400">
                        {order.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-black text-amber-500">
                      {formatMoney(order.totalPrice)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-stone-700 bg-stone-900/70 p-4 text-sm text-stone-400">
                  Your completed online orders will appear here.
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
