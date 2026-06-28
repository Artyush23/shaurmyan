import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';
import {
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  Route,
  ShoppingBag,
  X,
  XCircle,
} from 'lucide-react';
import type { Order } from '../types';
import {
  ORDER_PROGRESS_STATUSES,
  getEstimatedDeliveryWindow,
  getOrderStatusClass,
  getOrderStatusLabel,
} from '../utils/orders';

interface OrderTrackingDrawerProps {
  isOpen: boolean;
  order: Order | null;
  loading?: boolean;
  onClose: () => void;
  onOpenProfile: () => void;
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
  return `₾${value.toFixed(2)}`;
}

function getEstimateLabel(order: Order) {
  if (
    typeof order.estimatedMinutesMin === 'number'
    && typeof order.estimatedMinutesMax === 'number'
  ) {
    return `${order.estimatedMinutesMin}-${order.estimatedMinutesMax} min`;
  }

  return getEstimatedDeliveryWindow(order.status).label;
}

export default function OrderTrackingDrawer({
  isOpen,
  order,
  loading = false,
  onClose,
  onOpenProfile,
}: OrderTrackingDrawerProps) {
  const currentIndex = order ? ORDER_PROGRESS_STATUSES.indexOf(order.status) : -1;
  const isCancelled = order?.status === 'cancelled';
  const isDelivered = order?.status === 'delivered';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] overflow-hidden font-sans">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-stone-950/70 backdrop-blur-sm"
          />

          <div className="absolute inset-y-0 right-0 flex max-w-full pl-8 sm:pl-10">
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="flex h-full w-screen max-w-md flex-col bg-white shadow-2xl"
            >
              <header className="border-b border-stone-100 bg-stone-50 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-red-600 text-white shadow-lg shadow-red-500/20">
                      <Route className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-mono font-black uppercase tracking-[0.22em] text-amber-600">
                        Live tracking
                      </p>
                      <h2 className="truncate text-xl font-black text-stone-950">Order status</h2>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="cursor-pointer rounded-xl border border-stone-200 bg-white p-2 text-stone-600 transition-colors hover:bg-stone-100"
                    aria-label="Close tracking"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto p-5 sm:p-6">
                {loading && !order ? (
                  <div className="flex h-full flex-col items-center justify-center text-center text-stone-500">
                    <Loader2 className="mb-3 h-8 w-8 animate-spin text-amber-500 motion-reduce:animate-none" />
                    <p className="text-sm font-bold">Loading your latest order...</p>
                  </div>
                ) : !order ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <ShoppingBag className="mb-3 h-12 w-12 text-stone-300" />
                    <p className="text-sm font-black text-stone-900">No active order right now.</p>
                    <p className="mt-2 max-w-xs text-xs leading-5 text-stone-500">
                      Delivered and cancelled orders stay available in your profile history.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <section className={`rounded-3xl border p-4 ${
                      isCancelled
                        ? 'border-red-200 bg-red-50'
                        : isDelivered
                          ? 'border-green-200 bg-green-50'
                          : 'border-amber-200 bg-amber-50'
                    }`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                            isCancelled
                              ? 'bg-red-100 text-red-600'
                              : isDelivered
                                ? 'bg-green-100 text-green-700'
                                : 'bg-amber-500 text-stone-950'
                          }`}>
                            {isCancelled ? <XCircle className="h-6 w-6" /> : isDelivered ? <CheckCircle2 className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-mono text-[10px] font-black uppercase tracking-[0.18em] text-stone-500">
                              {order.id}
                            </p>
                            <p className="mt-1 text-2xl font-black leading-none text-stone-950">
                              {getEstimateLabel(order)}
                            </p>
                            {order.estimatedArrivalTime && (
                              <p className="mt-1 text-xs font-bold text-stone-600">
                                ETA {formatDate(order.estimatedArrivalTime)}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${getOrderStatusClass(order.status)}`}>
                          {getOrderStatusLabel(order.status)}
                        </span>
                      </div>
                    </section>

                    <section className="grid grid-cols-1 gap-3">
                      <InfoCard icon={<MapPin className="h-4 w-4" />} label="Address" value={order.customerAddress || order.address || 'Not provided'} />
                      <InfoCard icon={<Phone className="h-4 w-4" />} label="Phone" value={order.customerPhone || order.phone || 'Not provided'} />
                    </section>

                    <section className="rounded-3xl border border-stone-150 bg-stone-50">
                      <div className="border-b border-stone-150 px-4 py-3">
                        <p className="text-[10px] font-mono font-black uppercase tracking-[0.18em] text-stone-400">
                          Order items
                        </p>
                      </div>
                      <div className="divide-y divide-stone-150">
                        {order.items.map((item, index) => (
                          <div key={`${item.name}-${index}`} className="flex items-start justify-between gap-3 p-4">
                            <div className="min-w-0">
                              <p className="text-sm font-black text-stone-950">
                                {item.quantity}x {item.name}
                              </p>
                              <p className="mt-1 text-xs leading-5 text-stone-500">
                                {item.size}{item.extras.length > 0 ? ` · + ${item.extras.join(', ')}` : ''}
                              </p>
                            </div>
                            <p className="shrink-0 font-mono text-sm font-black text-red-600">
                              {formatMoney(item.price * item.quantity)}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between border-t border-stone-150 px-4 py-3">
                        <span className="text-[10px] font-mono font-black uppercase tracking-[0.18em] text-stone-400">
                          Total
                        </span>
                        <span className="font-mono text-lg font-black text-stone-950">
                          {formatMoney(order.totalPrice)}
                        </span>
                      </div>
                    </section>

                    <section className="space-y-3">
                      {ORDER_PROGRESS_STATUSES.map((status, index) => {
                        const isComplete = !isCancelled && index < currentIndex;
                        const isCurrent = !isCancelled && index === currentIndex;
                        const isFuture = isCancelled || index > currentIndex;

                        return (
                          <div key={status} className="relative flex gap-3">
                            {index < ORDER_PROGRESS_STATUSES.length - 1 && (
                              <span className={`absolute left-5 top-10 h-[calc(100%-0.25rem)] w-px ${
                                isComplete ? 'bg-amber-500' : 'bg-stone-200'
                              }`} />
                            )}
                            <motion.span
                              layout
                              className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
                                isComplete
                                  ? 'border-amber-500 bg-amber-500 text-stone-950'
                                  : isCurrent
                                    ? 'border-red-600 bg-red-600 text-white shadow-lg shadow-red-600/20'
                                    : 'border-stone-200 bg-white text-stone-400'
                              }`}
                            >
                              {isComplete ? <CheckCircle2 className="h-4 w-4" /> : isCurrent ? <Navigation className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
                            </motion.span>
                            <div className={`min-w-0 flex-1 rounded-2xl border p-3 ${
                              isCurrent
                                ? 'border-amber-300 bg-amber-50'
                                : 'border-stone-150 bg-stone-50'
                            }`}>
                              <p className={`text-sm font-black ${isFuture ? 'text-stone-400' : 'text-stone-950'}`}>
                                {getOrderStatusLabel(status)}
                              </p>
                              <p className="mt-1 text-xs text-stone-500">
                                {getEstimatedDeliveryWindow(status).label}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </section>
                  </div>
                )}
              </div>

              <footer className="border-t border-stone-100 bg-stone-50 p-5">
                <button
                  type="button"
                  onClick={onOpenProfile}
                  className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-stone-950 px-4 py-3 text-sm font-black text-white shadow-xl transition-colors hover:bg-amber-500 hover:text-stone-950"
                >
                  <ShoppingBag className="h-4 w-4" />
                  View order history
                </button>
              </footer>
            </motion.aside>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

function InfoCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-150 bg-stone-50 p-4">
      <p className="flex items-center gap-2 text-[10px] font-mono font-black uppercase tracking-[0.18em] text-stone-400">
        <span className="text-amber-600">{icon}</span>
        {label}
      </p>
      <p className="mt-2 text-sm font-bold leading-5 text-stone-800">{value}</p>
    </div>
  );
}
