import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CartItem } from '../types';
import { X, Trash2, ShoppingBasket, Truck, CheckCircle2, CreditCard, Banknote } from 'lucide-react';
import CardPaymentModal from './CardPaymentModal';
import { useTranslation } from 'react-i18next';

type CheckoutPaymentMethod = 'card_online' | 'cash_on_delivery';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  onRequireAuth: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (cartId: string, delta: number) => void;
  onRemoveItem: (cartId: string) => void;
  onClearCart: () => void;
  onPlaceOrder: (
    customerName: string,
    customerPhone: string,
    customerAddress: string,
    paymentMethod: CheckoutPaymentMethod,
    notes?: string
  ) => Promise<string>;
  onOrderPlaced: (orderId: string) => void;
}

export default function Cart({
  isOpen,
  onClose,
  isAuthenticated,
  onRequireAuth,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onPlaceOrder,
  onOrderPlaced,
}: CartProps) {
  const { t, i18n } = useTranslation();
  // Checkout Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isAwaitingAuth, setIsAwaitingAuth] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [showCardPayment, setShowCardPayment] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>('card_online');

  // Math helper
  const itemsTotal = cartItems.reduce((acc, item) => {
    return acc + (item.selectedPrice * item.quantity);
  }, 0);
  
  const deliveryFee = itemsTotal > 30 ? 0 : 3.00; // Free delivery for orders > ₾30
  const grandTotal = itemsTotal + deliveryFee;

  const buildOrderNotes = (): string | undefined => {
    const paymentNote =
      paymentMethod === 'card_online'
        ? 'Paid via Verified Online Card'
        : 'Cash payment selected for courier handoff';
    const trimmedNotes = notes.trim();

    if (trimmedNotes && paymentNote) {
      return `${trimmedNotes} | ${paymentNote}`;
    }
    return trimmedNotes || paymentNote;
  };
  const currentLanguage = (i18n.resolvedLanguage || i18n.language || 'ka').split('-')[0];
  const getCartItemName = (item: CartItem) =>
    currentLanguage === 'en' && item.menuItem.nameEn ? item.menuItem.nameEn : item.menuItem.name;

  const completeOrder = async () => {
    setSubmitError(null);
    let orderId = '';

    try {
      orderId = await onPlaceOrder(
        name,
        phone,
        address,
        paymentMethod,
        buildOrderNotes()
      );
    } catch {
      setSubmitError(t('cart.submitError'));
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    setShowCardPayment(false);
    setIsAwaitingAuth(false);
    setOrderSuccess(true);
    onClearCart();
    onOrderPlaced(orderId);

    setName('');
    setPhone('');
    setAddress('');
    setNotes('');
    setPaymentMethod('card_online');

    setTimeout(() => {
      setOrderSuccess(false);
      onClose();
    }, 5000);
  };

  React.useEffect(() => {
    if (isAuthenticated && isAwaitingAuth) {
      setIsAwaitingAuth(false);
      setSubmitError(null);
      setShowCardPayment(true);
    }
  }, [isAuthenticated, isAwaitingAuth]);

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) return;
    if (!name.trim() || !phone.trim() || !address.trim()) return;

    if (!isAuthenticated) {
      setSubmitError(t('cart.authRequired'));
      setIsAwaitingAuth(true);
      onRequireAuth();
      return;
    }

    setIsSubmitting(true);

    if (paymentMethod === 'card_online') {
      setShowCardPayment(true);
      return;
    }

    void completeOrder();
  };

  const handleCardPaymentSuccess = () => {
    setIsSubmitting(true);
    void completeOrder();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden font-sans">
          
          {/* Backdrop wrapper */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-stone-950/70 backdrop-blur-sm transition-opacity"
          />

          {/* Drawer container aligned right */}
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="w-screen max-w-md bg-white shadow-2xl flex flex-col h-full"
            >
              
              {/* Header block */}
              <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50">
                <div className="flex items-center space-x-2">
                  <ShoppingBasket className="w-6 h-6 text-amber-500" />
                  <span className="text-xl font-black text-stone-900 leading-none">{t('cart.title')}</span>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-stone-200 border border-stone-250 text-stone-600 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* SUCCESS STATE */}
              {orderSuccess ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.2, 1] }}
                    transition={{ duration: 0.5 }}
                    className="w-20 h-20 rounded-full bg-green-100 text-green-600 flex items-center justify-center shadow-lg"
                  >
                    <CheckCircle2 className="w-12 h-12 stroke-[2.5]" />
                  </motion.div>
                  <h3 className="text-2xl font-black text-stone-950">{t('cart.successTitle')}</h3>
                  <p className="text-stone-600 font-medium text-xs sm:text-sm max-w-xs leading-relaxed font-sans mt-1">
                    {t('cart.successBody')}
                  </p>
                  <span className="text-[10px] text-stone-400 font-mono block uppercase tracking-wider pt-6">{t('cart.autoClose')}</span>
                </div>
              ) : (
                <>
                  {/* Cart Items List */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {cartItems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center space-y-4 text-stone-400">
                        <ShoppingBasket className="w-16 h-16 stroke-[1.2] text-stone-300" />
                        <span className="text-sm font-semibold text-stone-500">{t('cart.empty')}</span>
                        <p className="text-xs max-w-xs font-light font-sans text-stone-400 leading-relaxed">
                          {t('cart.emptyDescription')}
                        </p>
                      </div>
                    ) : (
                      cartItems.map(item => (
                        <div
                          key={item.id}
                          className="flex items-start justify-between p-4 rounded-2xl border border-stone-150 bg-stone-50/50 hover:bg-stone-50 transition-colors"
                        >
                          <div className="flex-1 text-left leading-tight space-y-1.5">
                            <span className="block text-xs font-extrabold text-stone-900 pr-2">
                              {getCartItemName(item)}
                            </span>
                            
                            <span className="inline-block text-[10px] bg-stone-200/80 px-2 py-0.5 rounded text-stone-600 font-semibold uppercase tracking-wider">
                              {t('cart.size')}: {item.selectedSize.split('\n')[0]}
                            </span>

                            {item.addedCustomizations.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {item.addedCustomizations.map(cId => {
                                  const cObj = item.menuItem.customizations.find(c => c.id === cId);
                                  return (
                                    <span key={cId} className="text-[9px] bg-amber-100 text-amber-850 px-1.5 py-0.5 rounded font-medium">
                                      + {cObj?.name.split('')[0] === '+' ? cObj.name : cObj?.name}
                                    </span>
                                  );
                                })}
                              </div>
                            )}

                            {/* Price indicators */}
                            <div className="pt-2">
                              <span className="font-mono text-xs font-extrabold text-stone-900">
                                ₾{(item.selectedPrice * item.quantity).toFixed(2)}
                              </span>
                              {item.quantity > 1 && (
                                <span className="font-mono text-[10px] text-stone-400 ml-1.5">
                                  (₾{item.selectedPrice.toFixed(2)} {t('cart.each')})
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end justify-between self-stretch pl-4">
                            <button
                              onClick={() => onRemoveItem(item.id)}
                              className="p-1 hover:bg-red-50 hover:text-red-500 text-stone-400 rounded transition-colors cursor-pointer"
                              title={t('cart.remove')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                            {/* Quantity buttons */}
                            <div className="flex items-center space-x-2 bg-white border border-stone-200 rounded-lg p-1 mt-4">
                              <button
                                onClick={() => onUpdateQuantity(item.id, -1)}
                                className="w-5 h-5 flex items-center justify-center text-xs font-bold text-stone-500 hover:bg-stone-100 rounded cursor-pointer transition-colors duration-200"
                              >
                                -
                              </button>
                              <span className="font-mono text-xs font-black w-4 text-center">{item.quantity}</span>
                              <button
                                onClick={() => onUpdateQuantity(item.id, 1)}
                                className="w-5 h-5 flex items-center justify-center text-xs font-bold text-stone-500 hover:bg-stone-100 rounded cursor-pointer transition-colors duration-200"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Summary & Form Footer if items exist */}
                  {cartItems.length > 0 && (
                    <div className="border-t border-stone-150 bg-stone-50 max-h-[50%] overflow-y-auto">
                      
                      {/* Subtotals Panel */}
                      <div className="p-6 space-y-1.5 text-xs text-stone-600 border-b border-stone-150">
                        <div className="flex justify-between">
                          <span>{t('cart.products')}</span>
                          <span className="font-mono">₾{itemsTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="flex items-center">
                            <Truck className="w-3.5 h-3.5 mr-1 text-stone-450" />
                            {t('cart.deliveryFee')}
                          </span>
                          <span className="font-mono">
                            {deliveryFee === 0 ? (
                              <span className="text-green-650 font-bold">{t('common.free')}</span>
                            ) : (
                              `₾${deliveryFee.toFixed(2)}`
                            )}
                          </span>
                        </div>
                        {deliveryFee > 0 && (
                          <span className="text-[10px] text-amber-600 font-medium block leading-tight font-sans">
                            {t('cart.addForFreeDelivery', { amount: (30 - itemsTotal).toFixed(2) })}
                          </span>
                        )}
                        <div className="flex justify-between text-base font-black text-stone-950 pt-2 border-t border-dashed border-stone-200">
                          <span>{t('cart.total')}</span>
                          <span className="font-mono text-red-650">₾{grandTotal.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Checkout Information Form */}
                      <form onSubmit={handleSubmitOrder} className="p-6 space-y-4">
                        <span className="block text-xs font-black font-mono tracking-wider text-stone-400 uppercase tracking-widest mb-1">
                          📋 {t('cart.deliveryDetails')}
                        </span>

                        {/* Customer Name */}
                        <div className="space-y-1 text-left">
                          <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('cart.fullName')}
                            className="w-full bg-white border border-stone-250 rounded-xl py-2.5 px-3.5 text-xs font-medium text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-500 transition-colors"
                          />
                        </div>

                        {/* Customer Phone */}
                        <div className="space-y-1 text-left">
                          <input
                            type="tel"
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder={t('cart.phone')}
                            className="w-full bg-white border border-stone-250 rounded-xl py-2.5 px-3.5 text-xs font-medium text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-500 transition-colors"
                          />
                        </div>

                        {/* Delivery Address */}
                        <div className="space-y-1 text-left">
                          <input
                            type="text"
                            required
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder={t('cart.address')}
                            className="w-full bg-white border border-stone-250 rounded-xl py-2.5 px-3.5 text-xs font-medium text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-500 transition-colors"
                          />
                        </div>

                        {/* Notes Comments */}
                        <div className="space-y-1 text-left">
                          <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder={t('cart.notes')}
                            className="w-full bg-white border border-stone-250 rounded-xl py-2.5 px-3.5 text-xs font-medium text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-500 transition-colors"
                          />
                        </div>

                        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-left">
                          <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
                            {t('cart.paymentMethod')}
                          </span>
                          <div className="mt-3 grid grid-cols-1 gap-2">
                            <PaymentOption
                              active={paymentMethod === 'card_online'}
                              icon={<CreditCard className="h-4 w-4" />}
                              title={t('cart.onlineCardTitle')}
                              description={t('cart.onlineCardDescription')}
                              onClick={() => setPaymentMethod('card_online')}
                            />
                            {isAuthenticated && (
                              <PaymentOption
                                active={paymentMethod === 'cash_on_delivery'}
                                icon={<Banknote className="h-4 w-4" />}
                                title={t('cart.cashTitle')}
                                description={t('cart.cashDescription')}
                                onClick={() => setPaymentMethod('cash_on_delivery')}
                              />
                            )}
                          </div>
                          {!isAuthenticated && (
                            <p className="mt-3 text-[11px] leading-5 text-amber-100/80">
                              {t('cart.signInCash')}
                            </p>
                          )}
                        </div>

                        {/* Place Order CTA Button */}
                        {submitError && (
                          <p className="text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                            {submitError}
                          </p>
                        )}
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full py-3.5 bg-stone-950 hover:bg-amber-500 hover:text-stone-950 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-xl transition-all duration-200 disabled:opacity-50 flex items-center justify-center space-x-1 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                        >
                          {isSubmitting ? (
                            <span className="animate-pulse">{t('cart.submitting')} ⏳</span>
                          ) : (
                            <>
                              <span>{t('cart.checkout')} 🚀</span>
                            </>
                          )}
                        </button>
                      </form>
                    </div>
                  )}
                </>
              )}

            </motion.div>
          </div>

        </div>
      )}

      <CardPaymentModal
        isOpen={showCardPayment}
        onClose={() => setShowCardPayment(false)}
        cardholderName={name}
        amount={grandTotal}
        onPaymentSuccess={handleCardPaymentSuccess}
      />
    </AnimatePresence>
  );
}

function PaymentOption({
  active,
  icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all ${
        active
          ? 'border-amber-400 bg-amber-400/15 text-amber-100 shadow-lg shadow-amber-500/10'
          : 'border-white/10 bg-white/[0.03] text-stone-200 hover:border-amber-400/30 hover:bg-white/[0.06]'
      }`}
      aria-pressed={active}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          active ? 'bg-amber-400 text-stone-950' : 'bg-stone-900 text-amber-300'
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-black leading-tight">{title}</span>
        <span className="mt-1 block text-[10px] leading-4 text-stone-400">{description}</span>
      </span>
    </button>
  );
}
