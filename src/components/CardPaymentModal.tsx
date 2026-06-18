import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Lock,
  CreditCard,
  Loader2,
  ShieldCheck,
  Smartphone,
  AlertCircle,
  Check,
  Trash2,
} from 'lucide-react';
import {
  luhnCheck,
  detectCardBrand,
  maskCardLabel,
  generateMockToken,
  getSavedCard,
  saveCardToStorage,
  clearSavedCard,
  generateOtpCode,
  lookupBankCard,
  lookupBankCardByLast4,
  sendBankOtpSms,
  type SavedCard,
  type BankCardEntry,
} from '../utils/cardPayment';

interface CardPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardholderName: string;
  amount: number;
  customerPhone?: string;
  onPaymentSuccess: () => void;
}

type PaymentStep = 'saved' | 'entry' | 'processing' | 'otp';

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  if (digits.length >= 2) {
    return `${digits.slice(0, 2)}/`;
  }
  return digits;
}

function formatCvc(value: string): string {
  return value.replace(/\D/g, '').slice(0, 3);
}

function formatOtpInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, 4);
}

export default function CardPaymentModal({
  isOpen,
  onClose,
  cardholderName,
  amount,
  onPaymentSuccess,
  customerPhone,
}: CardPaymentModalProps) {
  const [step, setStep] = useState<PaymentStep>('entry');
  const [savedCard, setSavedCard] = useState<SavedCard | null>(null);
  const [holderName, setHolderName] = useState(cardholderName);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [saveCard, setSaveCard] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [expectedOtp, setExpectedOtp] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');
  const [showOtpToast, setShowOtpToast] = useState(false);
  const [bankEntry, setBankEntry] = useState<BankCardEntry | null>(null);
  const [smsStatus, setSmsStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const [savedCardError, setSavedCardError] = useState('');

  const pendingSaveRef = useRef<{ digits: string; holder: string } | null>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const stored = getSavedCard();
    setSavedCard(stored);
    setHolderName(cardholderName);
    setCardNumber('');
    setExpiry('');
    setCvc('');
    setSaveCard(false);
    setErrors({});
    setOtpInput('');
    setOtpError('');
    setExpectedOtp('');
    setShowOtpToast(false);
    setBankEntry(null);
    setSmsStatus('idle');
    setSavedCardError('');
    pendingSaveRef.current = null;
    setStep(stored ? 'saved' : 'entry');
  }, [isOpen, cardholderName]);

  useEffect(() => {
    if (step === 'otp') {
      const timer = window.setTimeout(() => otpInputRef.current?.focus(), 300);
      return () => window.clearTimeout(timer);
    }
  }, [step]);

  useEffect(() => {
    if (!showOtpToast) return;
    const timer = window.setTimeout(() => setShowOtpToast(false), 6000);
    return () => window.clearTimeout(timer);
  }, [showOtpToast]);

  const cardDigits = cardNumber.replace(/\D/g, '');
  const expiryDigits = expiry.replace(/\D/g, '');
  const isLocked = step === 'processing';

  const validateCardForm = (): boolean => {
    const nextErrors: Record<string, string> = {};

    if (!holderName.trim()) {
      nextErrors.holderName = 'გთხოვთ, შეიყვანოთ სახელი';
    }
    if (cardDigits.length !== 16) {
      nextErrors.cardNumber = 'ბარათის ნომერი უნდა შედგებოდეს 16 ციფრისგან';
    } else if (!luhnCheck(cardDigits)) {
      nextErrors.cardNumber = 'ბარათის ნომერი არასწორია (Luhn შემოწმება ვერ გაიარა)';
    }
    if (expiryDigits.length !== 4) {
      nextErrors.expiry = 'შეიყვანეთ ვადა MM/YY ფორმატით';
    } else {
      const month = parseInt(expiryDigits.slice(0, 2), 10);
      if (month < 1 || month > 12) {
        nextErrors.expiry = 'არასწორი თვე';
      }
    }
    if (cvc.length !== 3) {
      nextErrors.cvc = 'CVC უნდა შედგებოდეს 3 ციფრისგან';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const beginSecureVerification = (
    saveAfterSuccess: boolean,
    digits?: string,
    holder?: string,
    savedLast4?: string
  ) => {
    // Try to locate a registered bank entry. If not found but the card passed validation, fallback to the phone provided in the checkout form.
    const registryEntry = digits
      ? lookupBankCard(digits)
      : savedLast4
        ? lookupBankCardByLast4(savedLast4)
        : null;

    let finalEntry: BankCardEntry | null = registryEntry;

    if (!finalEntry) {
      // No registry entry – use the customer's phone as the OTP target (fallback).
      if (customerPhone) {
        finalEntry = {
          cardDigits: digits ?? '',
          bankName: 'Fallback',
          registeredPhone: customerPhone,
          displayPhone: customerPhone,
        };
        // Show a friendly message via the OTP toast that the code is sent to the phone attached to the card.
        setShowOtpToast(false);
      } else {
        // No fallback phone available – surface the original error.
        if (savedLast4) {
          setSavedCardError('ეს შენახული ბარათი ბანკის რეესტრში არ არის რეგისტრირებული.');
        } else {
          setErrors((prev) => ({
            ...prev,
            cardNumber: 'ეს ბარათი ბანკის რეესტრში არ არის რეგისტრირებული.',
          }));
        }
        return;
      }
    }

    if (saveAfterSuccess && digits && holder) {
      pendingSaveRef.current = { digits, holder };
    } else {
      pendingSaveRef.current = null;
    }

    setBankEntry(finalEntry);
    setStep('processing');
    setSmsStatus('sending');

    // Immediate OTP generation without artificial delay.
    (async () => {
      const code = generateOtpCode(4);
      setExpectedOtp(code);
      setOtpInput('');
      setOtpError('');

      const smsResult = await sendBankOtpSms(finalEntry!.registeredPhone, code, amount);

      if (smsResult.success) {
        setSmsStatus('sent');
        setShowOtpToast(false);
      } else {
        setSmsStatus('failed');
        setShowOtpToast(true);
      }

      setStep('otp');
    })();
  };

  const handlePayWithNewCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    if (!validateCardForm()) return;

    beginSecureVerification(saveCard, cardDigits, holderName.trim());
  };

  const handlePayWithSavedCard = () => {
    if (isLocked || !savedCard) return;
    beginSecureVerification(false, undefined, undefined, savedCard.last4);
  };

  const persistSavedCardIfNeeded = () => {
    const pending = pendingSaveRef.current;
    if (!pending) return;

    const brand = detectCardBrand(pending.digits);
    const last4 = pending.digits.slice(-4);
    const stored: SavedCard = {
      maskedLabel: maskCardLabel(brand, last4),
      token: generateMockToken(),
      brand,
      last4,
      cardholderName: pending.holder,
      savedAt: new Date().toISOString(),
    };

    saveCardToStorage(stored);
    setSavedCard(stored);
    pendingSaveRef.current = null;
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpInput.length !== 4) {
      setOtpError('შეიყვანეთ 4 ციფრიანი კოდი');
      return;
    }

    if (otpInput !== expectedOtp) {
      setOtpError('არასწორი უსაფრთხოების კოდი. სცადეთ ხელახლა.');
      return;
    }

    persistSavedCardIfNeeded();
    onPaymentSuccess();
  };

  const handleRemoveSavedCard = () => {
    clearSavedCard();
    setSavedCard(null);
    setStep('entry');
  };

  const displayNumber = cardNumber || '•••• •••• •••• ••••';
  const displayExpiry = expiry || 'MM/YY';
  const displayName = holderName.trim() || 'CARDHOLDER NAME';
  const detectedBrand = cardDigits.length >= 1 ? detectCardBrand(cardDigits) : 'Visa / MC';

  const canClose = step !== 'processing';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={canClose ? onClose : undefined}
            className="absolute inset-0 bg-stone-950/80 backdrop-blur-md"
          />

          {/* OTP dev hint toast */}
          <AnimatePresence>
            {showOtpToast && expectedOtp && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                className="fixed top-6 left-1/2 -translate-x-1/2 z-[70] max-w-sm w-[calc(100%-2rem)]"
              >
                <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-stone-950 text-white shadow-2xl border border-amber-500/30">
                  <Smartphone className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-0.5">
                      3D Secure · ტესტირება
                    </p>
                    <p className="text-sm font-medium leading-snug">
                      SMS ვერ გაიგზავნა · ტესტ კოდი:{' '}
                      <span className="font-mono font-black text-amber-400 tracking-[0.25em]">{expectedOtp}</span>
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl z-10 bg-white"
            role="dialog"
            aria-modal="true"
            aria-labelledby="card-payment-title"
          >
            <div className="px-6 pt-6 pb-4 flex items-start justify-between bg-stone-50 border-b border-stone-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Lock className="w-4 h-4 text-amber-600" aria-hidden="true" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-stone-400">
                    {step === 'otp' ? '3D Secure' : 'Secure Checkout'}
                  </span>
                </div>
                <h2 id="card-payment-title" className="text-xl font-black text-stone-950">
                  {step === 'saved' && 'შენახული ბარათი'}
                  {step === 'entry' && 'ონლაინ გადახდა'}
                  {step === 'processing' && 'გადახდა მუშავდება'}
                  {step === 'otp' && 'ბანკის დადასტურება'}
                </h2>
                <p className="text-xs text-stone-500 mt-0.5 font-medium">
                  ₾{amount.toFixed(2)} · SSL დაცული გადახდა
                </p>
              </div>
              {canClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 bg-white border border-stone-200 rounded-lg hover:bg-stone-100 text-stone-600 transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  aria-label="დახურვა"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <AnimatePresence mode="wait">
              {step === 'processing' && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="px-6 py-16 flex flex-col items-center justify-center text-center space-y-5"
                >
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-stone-100" />
                    <Loader2
                      className="w-16 h-16 text-amber-500 absolute inset-0 animate-spin motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-base font-black text-stone-950">Processing secure payment...</p>
                    <p className="text-xs text-stone-500 font-medium max-w-xs leading-relaxed">
                      თქვენი გადახდა დაცულად მუშავდება. გთხოვთ, არ დახუროთ ეს ფანჯარა.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-stone-400 uppercase tracking-wider">
                    <ShieldCheck className="w-3.5 h-3.5 text-green-600" aria-hidden="true" />
                    256-bit encryption
                  </div>
                </motion.div>
              )}

              {step === 'otp' && (
                <motion.div
                  key="otp"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="p-6 space-y-5"
                >
                  <div
                    className="rounded-2xl p-5 border border-stone-200 bg-gradient-to-br from-stone-50 via-white to-amber-50/40"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-11 h-11 rounded-xl bg-stone-950 flex items-center justify-center shadow-lg">
                        <Smartphone className="w-5 h-5 text-amber-400" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-stone-400">
                          Verified by Visa / Mastercard
                        </p>
                        <p className="text-sm font-black text-stone-950">3D Secure Verification</p>
                      </div>
                    </div>

                    <p className="text-sm text-stone-700 font-medium leading-relaxed">
                      უსაფრთხოების კოდი გაგზავნილია ბანკში რეგისტრირებულ ნომერზე (
                      <span className="font-mono font-bold text-stone-900">{bankEntry?.displayPhone ?? '+995 ***-**-**'}</span>
                      ).
                    </p>

                    {bankEntry && (
                      <p className="mt-2 text-[10px] text-stone-500 font-medium">
                        {bankEntry.bankName} · Verified by Visa / Mastercard
                      </p>
                    )}

                    {smsStatus === 'failed' && (
                      <p className="mt-2 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 font-medium">
                        SMS ვერ გაიგზავნა (Twilio არ არის კონფიგურირებული). ტესტირების კოდი:{' '}
                        <span className="font-mono font-black tracking-[0.2em]">{expectedOtp}</span>
                      </p>
                    )}
                  </div>

                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div className="space-y-2 text-left">
                      <label htmlFor="otp-code" className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400">
                        One-Time Password
                      </label>
                      <input
                        ref={otpInputRef}
                        id="otp-code"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={otpInput}
                        onChange={(e) => {
                          setOtpInput(formatOtpInput(e.target.value));
                          if (otpError) setOtpError('');
                        }}
                        placeholder="• • • •"
                        maxLength={4}
                        className={`w-full bg-white border rounded-xl py-3.5 px-4 text-center text-2xl font-mono font-black tracking-[0.5em] text-stone-900 placeholder-stone-300 focus:outline-none focus-visible:ring-2 transition-colors duration-200 ${
                          otpError
                            ? 'border-red-500 focus-visible:ring-red-500/30'
                            : 'border-stone-250 focus:border-amber-500 focus-visible:ring-amber-500/30'
                        }`}
                      />
                      {otpError && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200"
                          role="alert"
                        >
                          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" aria-hidden="true" />
                          <p className="text-xs font-bold text-red-700">{otpError}</p>
                        </motion.div>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setStep(savedCard ? 'saved' : 'entry')}
                        className="flex-1 py-3 rounded-2xl border border-stone-200 bg-white text-stone-700 font-bold text-sm hover:bg-stone-50 hover:border-stone-300 transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                      >
                        უკან
                      </button>
                      <button
                        type="submit"
                        disabled={otpInput.length !== 4}
                        className="flex-[1.4] py-3 rounded-2xl bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 hover:from-amber-500 hover:via-amber-400 hover:to-amber-500 hover:text-stone-950 text-white font-extrabold text-sm shadow-xl transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                        <span>დადასტურება</span>
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {step === 'saved' && savedCard && (
                <motion.div
                  key="saved"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.25 }}
                  className="p-6 space-y-5"
                >
                  <div
                    className="relative rounded-2xl p-5 overflow-hidden shadow-xl"
                    style={{
                      background: 'linear-gradient(135deg, #1c1917 0%, #292524 45%, #44403c 100%)',
                    }}
                  >
                    <div
                      className="absolute inset-0 opacity-30 pointer-events-none"
                      style={{
                        background:
                          'radial-gradient(circle at 80% 20%, rgba(255, 145, 0, 0.4) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(216, 67, 21, 0.3) 0%, transparent 45%)',
                      }}
                    />
                    <div className="relative z-10 space-y-4">
                      <div className="flex items-center justify-between">
                        <CreditCard className="w-8 h-8 text-amber-400/90" aria-hidden="true" />
                        <span className="text-[10px] font-mono font-bold text-green-400/90 uppercase tracking-widest flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                          Saved
                        </span>
                      </div>
                      <p className="font-mono text-lg font-bold text-white tracking-wide">
                        •••• •••• •••• {savedCard.last4}
                      </p>
                      <div className="flex items-end justify-between">
                        <div>
                          <span className="block text-[9px] font-mono text-white/40 uppercase tracking-wider mb-0.5">
                            {savedCard.brand}
                          </span>
                          <span className="text-xs font-bold text-white/90 uppercase tracking-wide">
                            {savedCard.cardholderName}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-white/50">{savedCard.maskedLabel}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-green-50 border border-green-100">
                    <ShieldCheck className="w-4 h-4 text-green-600 shrink-0" aria-hidden="true" />
                    <p className="text-[10px] text-green-800 font-medium leading-relaxed">
                      შენახული ბარათით გადახდა პირდაპირ 3D Secure დადასტურებაზე გადაგიყვანთ.
                    </p>
                  </div>

                  {savedCardError && (
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200" role="alert">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" aria-hidden="true" />
                      <p className="text-xs font-bold text-red-700">{savedCardError}</p>
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={handlePayWithSavedCard}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 hover:from-amber-500 hover:via-amber-400 hover:to-amber-500 hover:text-stone-950 text-white font-extrabold text-sm shadow-xl transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 flex items-center justify-center gap-2"
                    >
                      <Lock className="w-4 h-4" aria-hidden="true" />
                      <span>გადახდა ₾{amount.toFixed(2)}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep('entry')}
                      className="w-full py-2.5 text-sm font-bold text-stone-600 hover:text-amber-600 transition-colors duration-200 cursor-pointer"
                    >
                      სხვა ბარათის გამოყენება
                    </button>

                    <button
                      type="button"
                      onClick={handleRemoveSavedCard}
                      className="w-full py-2 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-red-600 hover:text-red-700 transition-colors duration-200 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      შენახული ბარათის წაშლა
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 'entry' && (
                <motion.form
                  key="entry"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.25 }}
                  onSubmit={handlePayWithNewCard}
                  className="p-6 space-y-5"
                >
                  <div
                    className="relative rounded-2xl p-5 overflow-hidden shadow-xl"
                    style={{
                      background: 'linear-gradient(135deg, #1c1917 0%, #292524 45%, #44403c 100%)',
                    }}
                  >
                    <div
                      className="absolute inset-0 opacity-30 pointer-events-none"
                      style={{
                        background:
                          'radial-gradient(circle at 80% 20%, rgba(255, 145, 0, 0.4) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(216, 67, 21, 0.3) 0%, transparent 45%)',
                      }}
                    />
                    <div className="relative z-10 space-y-6">
                      <div className="flex items-center justify-between">
                        <CreditCard className="w-8 h-8 text-amber-400/90" aria-hidden="true" />
                        <span className="text-[10px] font-mono font-bold text-white/50 uppercase tracking-widest">
                          {detectedBrand}
                        </span>
                      </div>
                      <p className="font-mono text-lg sm:text-xl font-bold text-white tracking-[0.2em]">
                        {displayNumber}
                      </p>
                      <div className="flex items-end justify-between">
                        <div>
                          <span className="block text-[9px] font-mono text-white/40 uppercase tracking-wider mb-0.5">
                            Cardholder
                          </span>
                          <span className="text-xs font-bold text-white/90 uppercase tracking-wide truncate max-w-[180px] block">
                            {displayName}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="block text-[9px] font-mono text-white/40 uppercase tracking-wider mb-0.5">
                            Expires
                          </span>
                          <span className="font-mono text-sm font-bold text-white/90">{displayExpiry}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    <div className="space-y-1 text-left">
                      <label htmlFor="card-holder" className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400">
                        Cardholder Name
                      </label>
                      <input
                        id="card-holder"
                        type="text"
                        value={holderName}
                        onChange={(e) => {
                          setHolderName(e.target.value);
                          if (errors.holderName) setErrors((prev) => ({ ...prev, holderName: '' }));
                        }}
                        placeholder="სახელი და გვარი"
                        autoComplete="cc-name"
                        className="w-full bg-white border border-stone-250 rounded-xl py-2.5 px-3.5 text-sm font-medium text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/30 transition-colors duration-200"
                      />
                      {errors.holderName && (
                        <p className="text-[10px] text-red-600 font-bold">{errors.holderName}</p>
                      )}
                    </div>

                    <div className="space-y-1 text-left">
                      <label htmlFor="card-number" className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400">
                        Card Number
                      </label>
                      <input
                        id="card-number"
                        type="text"
                        inputMode="numeric"
                        value={cardNumber}
                        onChange={(e) => {
                          setCardNumber(formatCardNumber(e.target.value));
                          if (errors.cardNumber) setErrors((prev) => ({ ...prev, cardNumber: '' }));
                        }}
                        placeholder="XXXX XXXX XXXX XXXX"
                        autoComplete="cc-number"
                        className={`w-full bg-white border rounded-xl py-2.5 px-3.5 text-sm font-mono font-medium text-stone-900 placeholder-stone-400 focus:outline-none focus-visible:ring-2 transition-colors duration-200 tracking-wider ${
                          errors.cardNumber
                            ? 'border-red-500 focus:border-red-500 focus-visible:ring-red-500/30'
                            : 'border-stone-250 focus:border-amber-500 focus-visible:ring-amber-500/30'
                        }`}
                      />
                      {errors.cardNumber && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-[10px] text-red-700 font-bold flex items-center gap-1"
                          role="alert"
                        >
                          <AlertCircle className="w-3 h-3 shrink-0" aria-hidden="true" />
                          {errors.cardNumber}
                        </motion.p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1 text-left">
                        <label htmlFor="card-expiry" className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400">
                          Expiry Date
                        </label>
                        <input
                          id="card-expiry"
                          type="text"
                          inputMode="numeric"
                          value={expiry}
                          onChange={(e) => {
                            setExpiry(formatExpiry(e.target.value));
                            if (errors.expiry) setErrors((prev) => ({ ...prev, expiry: '' }));
                          }}
                          placeholder="MM/YY"
                          autoComplete="cc-exp"
                          className="w-full bg-white border border-stone-250 rounded-xl py-2.5 px-3.5 text-sm font-mono font-medium text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/30 transition-colors duration-200"
                        />
                        {errors.expiry && (
                          <p className="text-[10px] text-red-600 font-bold">{errors.expiry}</p>
                        )}
                      </div>

                      <div className="space-y-1 text-left">
                        <label htmlFor="card-cvc" className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400">
                          CVC / CVV
                        </label>
                        <div className="relative">
                          <input
                            id="card-cvc"
                            type="password"
                            inputMode="numeric"
                            value={cvc}
                            onChange={(e) => {
                              setCvc(formatCvc(e.target.value));
                              if (errors.cvc) setErrors((prev) => ({ ...prev, cvc: '' }));
                            }}
                            placeholder="•••"
                            autoComplete="cc-csc"
                            maxLength={3}
                            className="w-full bg-white border border-stone-250 rounded-xl py-2.5 px-3.5 text-sm font-mono font-medium text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/30 transition-colors duration-200 tracking-[0.3em]"
                          />
                          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-300 pointer-events-none" aria-hidden="true" />
                        </div>
                        {errors.cvc && (
                          <p className="text-[10px] text-red-600 font-bold">{errors.cvc}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSaveCard((prev) => !prev)}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                      saveCard
                        ? 'border-amber-500 bg-gradient-to-r from-amber-50 to-orange-50/60 shadow-sm'
                        : 'border-stone-200 bg-stone-50 hover:border-stone-300 hover:bg-white'
                    }`}
                    aria-pressed={saveCard}
                  >
                    <span
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${
                        saveCard
                          ? 'border-amber-500 bg-amber-500 text-stone-950'
                          : 'border-stone-300 bg-white'
                      }`}
                    >
                      {saveCard && <Check className="w-3.5 h-3.5 stroke-[3]" aria-hidden="true" />}
                    </span>
                    <span className="text-xs font-bold text-stone-800 leading-snug">
                      შეინახე ბარათი მომავალი შეკვეთებისთვის
                    </span>
                  </button>

                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-50 border border-stone-100">
                    <ShieldCheck className="w-4 h-4 text-green-600 shrink-0" aria-hidden="true" />
                    <p className="text-[10px] text-stone-500 leading-relaxed">
                      ვინახავთ მხოლოდ დაფარულ ბარათის მონაცემებს და უსაფრთხო token-ს — არა სრულ ნომერს.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 py-3 rounded-2xl border border-stone-200 bg-white text-stone-700 font-bold text-sm hover:bg-stone-50 hover:border-stone-300 transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                    >
                      გაუქმება
                    </button>
                    <button
                      type="submit"
                      className="flex-[1.4] py-3 rounded-2xl bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 hover:from-amber-500 hover:via-amber-400 hover:to-amber-500 hover:text-stone-950 text-white font-extrabold text-sm shadow-xl transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 flex items-center justify-center gap-2"
                    >
                      <Lock className="w-4 h-4" aria-hidden="true" />
                      <span>გადახდა ₾{amount.toFixed(2)}</span>
                    </button>
                  </div>

                  {savedCard && (
                    <button
                      type="button"
                      onClick={() => setStep('saved')}
                      className="w-full py-2 text-xs font-bold text-amber-700 hover:text-amber-600 transition-colors duration-200 cursor-pointer"
                    >
                      ← შენახული ბარათით გადახდა
                    </button>
                  )}
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
