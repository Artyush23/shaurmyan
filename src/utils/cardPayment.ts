export interface SavedCard {
  maskedLabel: string;
  token: string;
  brand: string;
  last4: string;
  cardholderName: string;
  savedAt: string;
}

export interface BankCardEntry {
  cardDigits: string;
  bankName: string;
  /** E.164 format for Twilio delivery */
  registeredPhone: string;
  /** Human-readable masked display, e.g. +995 555-12-34 */
  displayPhone: string;
}

/**
 * Mock Bank Card Registry — maps card numbers to bank-registered phone numbers.
 * OTP is always sent to the registered phone, never the checkout form phone.
 */
const BANK_CARD_REGISTRY: BankCardEntry[] = [
  {
    cardDigits: '4242424242424242',
    bankName: 'TBC Bank',
    registeredPhone: '+995555123456',
    displayPhone: '+995 555-12-34',
  },
];

const STORAGE_KEY = 'shaurmyan_saved_card';

export function normalizeCardDigits(cardNumber: string): string {
  return cardNumber.replace(/\D/g, '');
}

export function lookupBankCard(cardNumber: string): BankCardEntry | null {
  const digits = normalizeCardDigits(cardNumber);
  return BANK_CARD_REGISTRY.find((entry) => entry.cardDigits === digits) ?? null;
}

export function lookupBankCardByLast4(last4: string): BankCardEntry | null {
  const matches = BANK_CARD_REGISTRY.filter((entry) => entry.cardDigits.endsWith(last4));
  return matches.length === 1 ? matches[0] : null;
}

export function luhnCheck(cardNumber: string): boolean {
  const digits = normalizeCardDigits(cardNumber);
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let alternate = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }

  return sum % 10 === 0;
}

export function detectCardBrand(digits: string): string {
  if (/^4/.test(digits)) return 'Visa';
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'Amex';
  if (/^9/.test(digits)) return 'Mir';
  return 'Card';
}

export function maskCardLabel(brand: string, last4: string): string {
  return `${brand} ending in ${last4}`;
}

export function generateMockToken(): string {
  const segment = () => Math.random().toString(36).slice(2, 10);
  return `tok_${segment()}_${segment()}_${Date.now().toString(36)}`;
}

export function getSavedCard(): SavedCard | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedCard;
    if (!parsed?.token || !parsed?.maskedLabel) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCardToStorage(card: SavedCard): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(card));
}

export function clearSavedCard(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function generateOtpCode(length = 4): string {
  const max = 10 ** length;
  const min = 10 ** (length - 1);
  return String(Math.floor(min + Math.random() * (max - min)));
}

export async function sendBankOtpSms(
  bankPhoneE164: string,
  otpCode: string,
  amount: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/send-bank-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: bankPhoneE164,
        code: otpCode,
        amount,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      return { success: false, error: payload.error ?? 'SMS delivery failed' };
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Could not reach SMS service' };
  }
}
