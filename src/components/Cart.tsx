import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CartItem } from '../types';
import { X, Trash2, ShoppingBasket, Truck, CheckCircle2 } from 'lucide-react';
import CardPaymentModal from './CardPaymentModal';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (cartId: string, delta: number) => void;
  onRemoveItem: (cartId: string) => void;
  onClearCart: () => void;
  onPlaceOrder: (
    customerName: string,
    customerPhone: string,
    customerAddress: string,
    paymentMethod: 'cash' | 'card_courier' | 'card_online',
    notes?: string
  ) => Promise<void>;
}

export default function Cart({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onPlaceOrder,
}: CartProps) {
  // Checkout Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card_courier' | 'card_online'>('cash');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [showCardPayment, setShowCardPayment] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Math helper
  const itemsTotal = cartItems.reduce((acc, item) => {
    return acc + (item.selectedPrice * item.quantity);
  }, 0);
  
  const deliveryFee = itemsTotal > 30 ? 0 : 3.00; // Free delivery for orders > ₾30
  const grandTotal = itemsTotal + deliveryFee;

  const buildOrderNotes = (paidOnline = false): string | undefined => {
    const paymentNote = paidOnline ? 'Paid via Verified Online Card' : undefined;
    const trimmedNotes = notes.trim();

    if (trimmedNotes && paymentNote) {
      return `${trimmedNotes} | ${paymentNote}`;
    }
    return trimmedNotes || paymentNote;
  };

  const completeOrder = async (paidOnline = false) => {
    setSubmitError(null);

    try {
      await onPlaceOrder(
        name,
        phone,
        address,
        paymentMethod,
        buildOrderNotes(paidOnline)
      );
    } catch {
      setSubmitError('შეკვეთის გაგზავნა ვერ მოხერხდა. სცადეთ ხელახლა.');
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    setShowCardPayment(false);
    setOrderSuccess(true);
    onClearCart();

    setName('');
    setPhone('');
    setAddress('');
    setNotes('');
    setPaymentMethod('cash');

    setTimeout(() => {
      setOrderSuccess(false);
      onClose();
    }, 5000);
  };

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) return;
    if (!name.trim() || !phone.trim() || !address.trim()) return;

    if (paymentMethod === 'card_online') {
      setShowCardPayment(true);
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      void completeOrder(false);
    }, 1500);
  };

  const handleCardPaymentSuccess = () => {
    setIsSubmitting(true);
    void completeOrder(true);
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
                  <span className="text-xl font-black text-stone-900 leading-none">შენი კალათა</span>
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
                  <h3 className="text-2xl font-black text-stone-950">შეკვეთა მიღებულია!</h3>
                  <p className="text-stone-600 font-medium text-xs sm:text-sm max-w-xs leading-relaxed font-sans mt-1">
                    თქვენი შეკვეთა წარმატებით დარეგისტრირდა. ShaurmYAN-ის კურიერი უკვე ამზადებს ჩანთას და მალე კართან იქნება!
                  </p>
                  <span className="text-[10px] text-stone-400 font-mono block uppercase tracking-wider pt-6">ეს ფანჯარა მალე დაიხურება</span>
                </div>
              ) : (
                <>
                  {/* Cart Items List */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {cartItems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center space-y-4 text-stone-400">
                        <ShoppingBasket className="w-16 h-16 stroke-[1.2] text-stone-300" />
                        <span className="text-sm font-semibold text-stone-500">კალათა ცარიელია</span>
                        <p className="text-xs max-w-xs font-light font-sans text-stone-400 leading-relaxed">
                          მენიუდან დაამატეთ აირჩიეთ სასურველი შაურმა ან გამაგრილებელი სასმელი შესაკვეთად.
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
                              {item.menuItem.name}
                            </span>
                            
                            <span className="inline-block text-[10px] bg-stone-200/80 px-2 py-0.5 rounded text-stone-600 font-semibold uppercase tracking-wider">
                              ზომა: {item.selectedSize.split('\n')[0]}
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
                                  (₾{item.selectedPrice.toFixed(2)} თითო)
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end justify-between self-stretch pl-4">
                            <button
                              onClick={() => onRemoveItem(item.id)}
                              className="p-1 hover:bg-red-50 hover:text-red-500 text-stone-400 rounded transition-colors cursor-pointer"
                              title="ამოშლა"
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
                          <span>პროდუქტები</span>
                          <span className="font-mono">₾{itemsTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="flex items-center">
                            <Truck className="w-3.5 h-3.5 mr-1 text-stone-450" />
                            მიწოდების საფასური
                          </span>
                          <span className="font-mono">
                            {deliveryFee === 0 ? (
                              <span className="text-green-650 font-bold">უფასო</span>
                            ) : (
                              `₾${deliveryFee.toFixed(2)}`
                            )}
                          </span>
                        </div>
                        {deliveryFee > 0 && (
                          <span className="text-[10px] text-amber-600 font-medium block leading-tight font-sans">
                            💡 უფასო მიწოდებისთვის დაამატეთ ₾{(30 - itemsTotal).toFixed(2)}-ის პროდუქტი
                          </span>
                        )}
                        <div className="flex justify-between text-base font-black text-stone-950 pt-2 border-t border-dashed border-stone-200">
                          <span>სულ გადასახდელი</span>
                          <span className="font-mono text-red-650">₾{grandTotal.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Checkout Information Form */}
                      <form onSubmit={handleSubmitOrder} className="p-6 space-y-4">
                        <span className="block text-xs font-black font-mono tracking-wider text-stone-400 uppercase tracking-widest mb-1">
                          📋 მიწოდების დეტალები
                        </span>

                        {/* Customer Name */}
                        <div className="space-y-1 text-left">
                          <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="სახელი და გვარი"
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
                            placeholder="ტელეფონის ნომერი (მაგ: 599 45 61 23)"
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
                            placeholder="მიწოდების ზუსტი მისამართი"
                            className="w-full bg-white border border-stone-250 rounded-xl py-2.5 px-3.5 text-xs font-medium text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-500 transition-colors"
                          />
                        </div>

                        {/* Notes Comments */}
                        <div className="space-y-1 text-left">
                          <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="შენიშვნა კურიერს (არასავალდებულო)"
                            className="w-full bg-white border border-stone-250 rounded-xl py-2.5 px-3.5 text-xs font-medium text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-500 transition-colors"
                          />
                        </div>

                        {/* Payment Selection Selector */}
                        <div className="space-y-1.5 text-left">
                          <span className="text-[10px] text-stone-400 font-mono font-bold uppercase tracking-wider block">გადახდის მეთოდი</span>
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => setPaymentMethod('cash')}
                              className={`py-2 rounded-xl text-[10px] font-bold border transition-all duration-200 cursor-pointer ${
                                paymentMethod === 'cash'
                                  ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-sm'
                                  : 'bg-white border-stone-200 text-stone-650 hover:bg-stone-50'
                              }`}
                            >
                              💵 ნაღდი
                            </button>
                            <button
                              type="button"
                              onClick={() => setPaymentMethod('card_courier')}
                              className={`py-2 rounded-xl text-[10px] font-bold border transition-all duration-200 cursor-pointer ${
                                paymentMethod === 'card_courier'
                                  ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-sm'
                                  : 'bg-white border-stone-200 text-stone-650 hover:bg-stone-50'
                              }`}
                            >
                              💳 კურიერთან
                            </button>
                            <button
                              type="button"
                              onClick={() => setPaymentMethod('card_online')}
                              className={`py-2 rounded-xl text-[10px] font-bold border transition-all duration-200 cursor-pointer ${
                                paymentMethod === 'card_online'
                                  ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-sm'
                                  : 'bg-white border-stone-200 text-stone-650 hover:bg-stone-50'
                              }`}
                            >
                              🌐 ონლაინ
                            </button>
                          </div>
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
                            <span className="animate-pulse">იგზავნება... ⏳</span>
                          ) : (
                            <>
                              <span>შეკვეთის გაფორმება 🚀</span>
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
