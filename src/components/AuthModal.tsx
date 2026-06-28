import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Apple,
  ChevronLeft,
  Chrome,
  Loader2,
  LockKeyhole,
  Mail,
  Phone,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import {
  getAuthErrorMessage,
  loginWithApple,
  loginWithGoogle,
  resetPassword,
  signInWithEmail,
  signUpWithEmail,
} from "../firebase";
import { useTranslation } from "react-i18next";

type Mode = "login" | "signup" | "reset";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: Mode;
}

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  initialMode = "login",
}: AuthModalProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setMode(initialMode);
    setError(null);
    setResetSent(false);
    setLoading(false);
  }, [isOpen, initialMode]);

  const submitLabel = useMemo(() => {
    if (mode === "login") return t("auth.login");
    if (mode === "signup") return t("auth.signup");
    return t("auth.sendReset");
  }, [mode, t]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setResetSent(false);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "login") {
        await signInWithEmail(email.trim(), password);
        onSuccess?.();
        return;
      }

      if (mode === "signup") {
        await signUpWithEmail(email.trim(), password, {
          firstName,
          lastName,
          phoneNumber,
        });
        onSuccess?.();
        return;
      }

      await resetPassword(email.trim());
      setResetSent(true);
    } catch (err) {
      const code = (err as { code?: string })?.code ?? "";
      setError(getAuthErrorMessage(code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);

    try {
      await loginWithGoogle();
      onSuccess?.();
    } catch (err) {
      const code = (err as { code?: string })?.code ?? "";
      setError(getAuthErrorMessage(code));
    } finally {
      setLoading(false);
    }
  };

  const handleApple = async () => {
    setLoading(true);
    setError(null);

    try {
      await loginWithApple();
      onSuccess?.();
    } catch (err) {
      const code = (err as { code?: string })?.code ?? "";
      setError(getAuthErrorMessage(code));
    } finally {
      setLoading(false);
    }
  };

  const title =
    mode === "login"
      ? t("auth.welcomeBack")
      : mode === "signup"
        ? t("auth.createAccount")
        : t("auth.resetPassword");
  const subtitle =
    mode === "login"
      ? t("auth.welcomeBackSubtitle")
      : mode === "signup"
        ? t("auth.createAccountSubtitle")
        : t("auth.resetPasswordSubtitle");

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              onClose();
            }
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.97 }}
            transition={{ type: "spring", damping: 24, stiffness: 260 }}
            className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl border border-white/10 bg-stone-950 text-stone-100 shadow-[0_32px_120px_-40px_rgba(245,158,11,0.5)]"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/80 to-transparent" />
            <div className="pointer-events-none absolute -right-12 top-0 h-32 w-32 rounded-full bg-amber-500/10 blur-3xl" />

            <div className="flex items-start justify-between border-b border-white/5 px-6 pb-4 pt-6">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t("auth.premiumAccess")}
                </div>
                <h2 id="auth-modal-title" className="text-xl font-black tracking-tight text-white">
                  {title}
                </h2>
                <p className="mt-1 text-sm leading-6 text-stone-400">{subtitle}</p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-full border border-white/10 bg-white/[0.03] p-2 text-stone-400 transition-colors hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
                aria-label={t("auth.close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-5">
              {mode === "reset" && resetSent ? (
                <ResetNotice email={email} onBack={() => switchMode("login")} />
              ) : (
                <>
                  <div className="mb-5 grid grid-cols-3 gap-2 rounded-2xl border border-white/5 bg-white/[0.02] p-1">
                    <TabButton active={mode === "login"} onClick={() => switchMode("login")}>
                      {t("auth.login")}
                    </TabButton>
                    <TabButton active={mode === "signup"} onClick={() => switchMode("signup")}>
                      {t("auth.signup")}
                    </TabButton>
                    <TabButton active={mode === "reset"} onClick={() => switchMode("reset")}>
                      {t("auth.reset")}
                    </TabButton>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-3.5">
                    <AnimatePresence initial={false} mode="popLayout">
                      {mode === "signup" && (
                        <motion.div
                          key="signup-details"
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                        >
                          <AuthInput
                            icon={<UserRound className="h-3.5 w-3.5 text-amber-400" />}
                            label={t("auth.firstName")}
                            value={firstName}
                            onChange={setFirstName}
                            placeholder={t("auth.firstName")}
                            autoComplete="given-name"
                            required
                          />
                          <AuthInput
                            icon={<UserRound className="h-3.5 w-3.5 text-amber-400" />}
                            label={t("auth.lastName")}
                            value={lastName}
                            onChange={setLastName}
                            placeholder={t("auth.lastName")}
                            autoComplete="family-name"
                          />
                          <div className="sm:col-span-2">
                            <AuthInput
                              icon={<Phone className="h-3.5 w-3.5 text-amber-400" />}
                              label={t("auth.phoneNumber")}
                              value={phoneNumber}
                              onChange={setPhoneNumber}
                              type="tel"
                              inputMode="tel"
                              placeholder="+995 5XX XX XX XX"
                              autoComplete="tel"
                              required
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <AuthInput
                      icon={<Mail className="h-3.5 w-3.5 text-amber-400" />}
                      label={t("auth.email")}
                      value={email}
                      onChange={setEmail}
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      placeholder="you@example.com"
                      required
                    />

                    {mode !== "reset" && (
                      <AuthInput
                        icon={<LockKeyhole className="h-3.5 w-3.5 text-amber-400" />}
                        label={t("auth.password")}
                        value={password}
                        onChange={setPassword}
                        type="password"
                        autoComplete={mode === "login" ? "current-password" : "new-password"}
                        placeholder="••••••••"
                        minLength={6}
                        required
                      />
                    )}

                    {mode === "login" && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => switchMode("reset")}
                          className="cursor-pointer text-xs font-semibold text-amber-300 transition-colors hover:text-amber-200"
                        >
                          {t("auth.forgotPassword")}
                        </button>
                      </div>
                    )}

                    <AnimatePresence>
                      {error && (
                        <motion.p
                          role="alert"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                        >
                          {error}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 px-4 py-3 text-sm font-black text-stone-950 transition-all hover:from-amber-400 hover:via-amber-300 hover:to-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      <span>{loading ? t("auth.pleaseWait") : submitLabel}</span>
                    </button>
                  </form>

                  {mode !== "reset" && (
                    <>
                      <div className="my-5 flex items-center gap-3">
                        <span className="h-px flex-1 bg-white/10" />
                        <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-500">
                          {t("auth.or")}
                        </span>
                        <span className="h-px flex-1 bg-white/10" />
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={handleGoogle}
                          disabled={loading}
                          className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-stone-100 transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Chrome className="h-4 w-4 text-amber-300" />
                          {t("auth.google")}
                        </button>
                        <button
                          type="button"
                          onClick={handleApple}
                          disabled={loading}
                          className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2.5 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-100 transition-colors hover:bg-amber-400/15 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Apple className="h-4 w-4 text-amber-300" />
                          {t("auth.apple")}
                        </button>
                      </div>
                    </>
                  )}

                  <div className="mt-6 flex items-center justify-between text-xs text-stone-500">
                    <span>{t("auth.secureFirebase")}</span>
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex cursor-pointer items-center gap-1 font-semibold text-amber-300 transition-colors hover:text-amber-200"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      {t("common.back")}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AuthInput({
  icon,
  label,
  value,
  onChange,
  type = "text",
  inputMode,
  autoComplete,
  placeholder,
  minLength,
  required = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  inputMode?: "text" | "tel" | "email" | "numeric" | "decimal" | "search" | "url";
  autoComplete?: string;
  placeholder?: string;
  minLength?: number;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-2 text-xs font-medium text-stone-400">
        {icon}
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        placeholder={placeholder}
        minLength={minLength}
        required={required}
        className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-stone-600 outline-none transition-colors focus:border-amber-400/50 focus:bg-white/[0.05] focus:ring-2 focus:ring-amber-400/20"
      />
    </label>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
        active
          ? "bg-amber-400 text-stone-950"
          : "text-stone-400 hover:bg-white/[0.04] hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function ResetNotice({
  email,
  onBack,
}: {
  email: string;
  onBack: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-4 text-sm leading-6 text-amber-100">
        {t('auth.resetNotice', { email })}
      </div>
      <button
        type="button"
        onClick={onBack}
        className="flex w-full cursor-pointer items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-stone-100 transition-colors hover:bg-white/[0.06]"
      >
        {t('auth.backToLogin')}
      </button>
    </div>
  );
}
