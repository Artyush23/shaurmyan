import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock3,
  CreditCard,
  Download,
  FileDown,
  Landmark,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export interface BankingAccount {
  id: string;
  bank: 'TBC' | 'BOG';
  label: string;
  currency: string;
  availableBalance: number;
  ledgerBalance: number;
  accountNumber: string;
  status: 'active' | 'pending' | 'syncing';
  updatedAt: string;
}

export interface BankingTransaction {
  id: string;
  accountId: string;
  title: string;
  merchant?: string;
  amount: number;
  currency: string;
  category: string;
  timestamp: string;
  direction: 'credit' | 'debit';
  status: 'posted' | 'pending' | 'failed';
}

export interface BankingDashboardProps {
  onExportSummary?: () => void;
  onDownloadStatement?: () => void;
  onRefresh?: () => void;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function extractArray(payload: unknown, key: string): unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  if (Array.isArray(record[key])) return record[key] as unknown[];
  const data = asRecord(record.data);
  return Array.isArray(data[key]) ? (data[key] as unknown[]) : [];
}

function toNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toAccount(value: unknown, index: number): BankingAccount {
  const account = asRecord(value);
  const bank = String(account.bank ?? account.provider ?? 'TBC').toUpperCase() === 'BOG' ? 'BOG' : 'TBC';
  const statusValue = String(account.status ?? 'active').toLowerCase();
  const status: BankingAccount['status'] =
    statusValue === 'pending' || statusValue === 'syncing' ? statusValue : 'active';

  return {
    id: String(account.id ?? account.accountId ?? `account-${index}`),
    bank,
    label: String(account.label ?? account.name ?? `${bank} Account`),
    currency: String(account.currency ?? 'GEL').toUpperCase(),
    availableBalance: toNumber(account.availableBalance ?? account.available ?? account.balance),
    ledgerBalance: toNumber(
      account.ledgerBalance ?? account.ledger ?? account.currentBalance ?? account.balance
    ),
    accountNumber: String(account.accountNumber ?? account.iban ?? 'Protected account'),
    status,
    updatedAt: formatTimestamp(account.updatedAt ?? account.lastSyncedAt),
  };
}

function toTransaction(value: unknown, index: number): BankingTransaction {
  const transaction = asRecord(value);
  const amount = toNumber(transaction.amount);
  const directionValue = String(transaction.direction ?? '').toLowerCase();
  const direction: BankingTransaction['direction'] =
    directionValue === 'credit' || (directionValue !== 'debit' && amount >= 0) ? 'credit' : 'debit';
  const statusValue = String(transaction.status ?? 'posted').toLowerCase();
  const status: BankingTransaction['status'] =
    statusValue === 'pending' || statusValue === 'failed' ? statusValue : 'posted';

  return {
    id: String(transaction.id ?? transaction.transactionId ?? `transaction-${index}`),
    accountId: String(transaction.accountId ?? transaction.account ?? ''),
    title: String(transaction.title ?? transaction.description ?? transaction.reference ?? 'Bank transaction'),
    merchant: transaction.merchant ? String(transaction.merchant) : undefined,
    amount,
    currency: String(transaction.currency ?? 'GEL').toUpperCase(),
    category: String(transaction.category ?? 'Banking'),
    timestamp: formatTimestamp(transaction.timestamp ?? transaction.bookingDate ?? transaction.createdAt),
    direction,
    status,
  };
}

function formatTimestamp(value: unknown): string {
  if (!value) return 'Just now';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

async function fetchBankingResource(
  endpoint: string,
  token: string,
  signal: AbortSignal
): Promise<unknown> {
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    credentials: 'same-origin',
    signal,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Banking request failed with status ${response.status}.`);
  }

  return response.json() as Promise<unknown>;
}

export default function BankingDashboard({
  onExportSummary,
  onDownloadStatement,
  onRefresh,
}: BankingDashboardProps) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<BankingAccount[]>([]);
  const [transactions, setTransactions] = useState<BankingTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadBankingData = useCallback(
    async (signal: AbortSignal, isRefresh = false) => {
      if (!user) {
        setAccounts([]);
        setTransactions([]);
        setError('Authentication is required to load banking data.');
        setLoading(false);
        return;
      }

      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const token = await user.getIdToken();
        const [accountsPayload, transactionsPayload] = await Promise.all([
          fetchBankingResource('/api/banking/accounts', token, signal),
          fetchBankingResource('/api/banking/transactions', token, signal),
        ]);

        if (signal.aborted) return;

        setAccounts(extractArray(accountsPayload, 'accounts').map(toAccount));
        setTransactions(extractArray(transactionsPayload, 'transactions').map(toTransaction));
        setLastSyncedAt(new Date());
      } catch (requestError) {
        if (signal.aborted) return;
        console.error('Failed to load banking dashboard data:', requestError);
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Banking data could not be loaded right now.'
        );
      } finally {
        if (!signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [user]
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadBankingData(controller.signal, refreshKey > 0);
    return () => controller.abort();
  }, [loadBankingData, refreshKey]);

  const handleRefresh = () => {
    onRefresh?.();
    setRefreshKey((key) => key + 1);
  };

  const totalAvailable = useMemo(
    () => accounts.reduce((sum, account) => sum + account.availableBalance, 0),
    [accounts]
  );
  const totalLedger = useMemo(
    () => accounts.reduce((sum, account) => sum + account.ledgerBalance, 0),
    [accounts]
  );
  const totalCredits = useMemo(
    () =>
      transactions
        .filter((transaction) => transaction.direction === 'credit')
        .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0),
    [transactions]
  );
  const totalDebits = useMemo(
    () =>
      transactions
        .filter((transaction) => transaction.direction === 'debit')
        .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0),
    [transactions]
  );

  const monthlyAnalytics = useMemo(() => {
    const formatter = new Intl.DateTimeFormat('en-US', { month: 'short' });
    const months = Array.from({ length: 12 }, (_, index) => {
      const date = new Date();
      date.setDate(1);
      date.setMonth(date.getMonth() - (11 - index));
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: formatter.format(date),
        value: 0,
      };
    });

    const lookup = new Map(months.map((month) => [month.key, month]));
    transactions
      .filter((transaction) => transaction.direction === 'debit')
      .forEach((transaction) => {
        const date = new Date(transaction.timestamp);
        if (Number.isNaN(date.getTime())) return;
        const month = lookup.get(`${date.getFullYear()}-${date.getMonth()}`);
        if (month) month.value += Math.abs(transaction.amount);
      });

    return months;
  }, [transactions]);

  const monthlySpend = monthlyAnalytics.map((month) => month.value);
  const monthlyPeak = Math.max(...monthlySpend, 1);
  const chartPoints = monthlySpend.map((value, index) => ({
    x: monthlySpend.length === 1 ? 0 : (index / (monthlySpend.length - 1)) * 100,
    y: 100 - (value / monthlyPeak) * 90,
  }));
  const sparkPath = chartPoints
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');
  const areaPath =
    chartPoints.length > 0
      ? `${sparkPath} L ${chartPoints.at(-1)?.x.toFixed(2) ?? 100} 100 L ${
          chartPoints[0]?.x.toFixed(2) ?? 0
        } 100 Z`
      : '';

  return (
    <section className="min-h-screen bg-stone-950 font-sans text-stone-100 charcoal-grid-bg">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <header className="flex flex-col gap-4 border-b border-stone-800 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-amber-400">
              <Sparkles className="h-3.5 w-3.5" />
              Live Open Banking
            </div>
            <h1 className="text-2xl font-black leading-none text-white sm:text-4xl">
              Banking Dashboard
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-stone-400 sm:text-base">
              Authenticated account balances and transaction activity from the ShaurmYAN banking proxy.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex">
            <ActionButton onClick={handleRefresh} disabled={loading || refreshing} icon={
              refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />
            }>
              Refresh
            </ActionButton>
            <ActionButton onClick={onDownloadStatement} icon={<Download className="h-4 w-4" />} primary>
              Statement
            </ActionButton>
            <ActionButton onClick={onExportSummary} icon={<FileDown className="h-4 w-4" />}>
              Export
            </ActionButton>
          </div>
        </header>

        {loading ? (
          <div className="mt-6 flex min-h-80 flex-col items-center justify-center rounded-3xl border border-stone-800 bg-stone-950/85 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
            <p className="mt-4 text-sm font-bold text-white">Loading secure banking data...</p>
            <p className="mt-1 text-xs text-stone-500">Verifying your Firebase session and bank connections.</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black text-red-200">Banking connection unavailable</p>
                  <p className="mt-1 break-words text-xs leading-5 text-red-200/75">{error}</p>
                </div>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="min-h-11 cursor-pointer rounded-xl border border-red-400/20 bg-red-500/10 px-4 text-xs font-black text-red-100 hover:bg-red-500/20"
                >
                  Try again
                </button>
              </div>
            )}

            <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Available Balance" value={formatMoney(totalAvailable)} note={`${accounts.length} connected accounts`} icon={<WalletCards className="h-6 w-6" />} />
              <StatCard label="Ledger Balance" value={formatMoney(totalLedger)} note="Current booked balance" icon={<Landmark className="h-6 w-6" />} />
              <StatCard label="Credits" value={formatMoney(totalCredits)} note="Loaded transaction credits" icon={<ArrowUpRight className="h-6 w-6" />} />
              <StatCard label="Debits" value={formatMoney(totalDebits)} note="Loaded transaction debits" icon={<ArrowDownRight className="h-6 w-6" />} />
            </section>

            <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
              <div className="space-y-6 xl:col-span-4">
                <Panel title="Account Lists" eyebrow="Connected Accounts">
                  {accounts.length > 0 ? (
                    <div className="space-y-3">
                      {accounts.map((account) => (
                        <div key={account.id}>
                          <AccountRow account={account} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState text="No connected bank accounts were returned by the proxy." />
                  )}
                </Panel>

                <Panel title="Live Balances" eyebrow="Realtime Snapshot">
                  <div className="space-y-3">
                    <BalanceRow label="Spendable" value={formatMoney(totalAvailable)} accent="amber" />
                    <BalanceRow label="Ledger" value={formatMoney(totalLedger)} accent="stone" />
                    <BalanceRow label="Exposure" value={formatMoney(Math.max(totalLedger - totalAvailable, 0))} accent="red" />
                  </div>
                </Panel>
              </div>

              <div className="space-y-6 xl:col-span-8">
                <Panel title="Spending Analytics" eyebrow="12 Month Debit Trend">
                  <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-3 sm:p-4">
                    <div className="mb-4 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone-500">Total loaded spend</p>
                        <p className="mt-1 text-2xl font-black text-white">{formatMoney(totalDebits)}</p>
                      </div>
                      <p className="text-right text-[10px] text-stone-500">
                        {lastSyncedAt ? `Synced ${formatTimestamp(lastSyncedAt.toISOString())}` : 'Not synced'}
                      </p>
                    </div>
                    <div className="h-56 w-full sm:h-72">
                      <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible" role="img" aria-label="Monthly spending chart">
                        <defs>
                          <linearGradient id="liveSpendFill" x1="0%" x2="0%" y1="0%" y2="100%">
                            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.42" />
                            <stop offset="100%" stopColor="#d84315" stopOpacity="0.03" />
                          </linearGradient>
                        </defs>
                        <rect width="100" height="100" rx="4" fill="#0c0a09" />
                        {[20, 40, 60, 80].map((line) => (
                          <line key={line} x1="0" y1={line} x2="100" y2={line} stroke="rgba(255,255,255,0.06)" strokeWidth="0.4" />
                        ))}
                        <path d={areaPath} fill="url(#liveSpendFill)" />
                        <path d={sparkPath} fill="none" stroke="#f59e0b" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                        {chartPoints.map((point, index) => (
                          <g key={monthlyAnalytics[index]?.key}>
                            <circle cx={point.x} cy={point.y} r="1.4" fill="#fbbf24" />
                            <text x={point.x} y="96" fill="rgba(255,255,255,0.58)" fontSize="2.7" textAnchor="middle">
                              {monthlyAnalytics[index]?.label}
                            </text>
                          </g>
                        ))}
                      </svg>
                    </div>
                  </div>
                </Panel>

                <Panel title="Transaction Histories" eyebrow="Recent Activity">
                  {transactions.length > 0 ? (
                    <div className="space-y-3">
                      {transactions.map((transaction) => (
                        <div key={transaction.id}>
                          <TransactionRow transaction={transaction} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState text="No transactions were returned by the banking proxy." />
                  )}
                </Panel>
              </div>
            </section>

            <footer className="mt-6 flex items-start gap-2 rounded-2xl border border-stone-800 bg-stone-900/70 px-4 py-4 text-sm text-stone-300">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              Banking requests use the authenticated Firebase ID token and remain server-proxied.
            </footer>
          </>
        )}
      </div>
    </section>
  );
}

function ActionButton({
  children,
  icon,
  onClick,
  disabled,
  primary = false,
}: {
  children: ReactNode;
  icon: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-xs font-black transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        primary
          ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 hover:from-amber-400 hover:to-amber-500'
          : 'border border-stone-800 bg-stone-900 text-stone-200 hover:bg-stone-800'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function Panel({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-stone-800 bg-stone-950/85 p-4 shadow-xl sm:p-6">
      <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-amber-400">{eyebrow}</p>
      <h2 className="mb-5 mt-1 text-lg font-black text-white sm:text-xl">{title}</h2>
      {children}
    </section>
  );
}

function StatCard({ label, value, note, icon }: { label: string; value: string; note: string; icon: ReactNode }) {
  return (
    <section className="rounded-3xl border border-stone-800 bg-stone-950/85 p-4 shadow-xl sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone-500">{label}</p>
          <p className="mt-2 text-xl font-black text-white sm:text-2xl">{value}</p>
          <p className="mt-2 text-xs text-stone-400">{note}</p>
        </div>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-400">{icon}</div>
      </div>
    </section>
  );
}

function AccountRow({ account }: { account: BankingAccount }) {
  return (
    <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-amber-500/10 px-2 py-1 text-[10px] font-black text-amber-400">{account.bank}</span>
            <span className="text-[10px] font-bold uppercase text-stone-500">{account.status}</span>
          </div>
          <p className="mt-2 truncate text-sm font-black text-white">{account.label}</p>
          <p className="mt-1 truncate text-xs text-stone-500">{account.accountNumber}</p>
        </div>
        <p className="shrink-0 text-sm font-black text-amber-400">
          {formatMoney(account.availableBalance, account.currency)}
        </p>
      </div>
      <p className="mt-3 text-[10px] text-stone-500">Updated {account.updatedAt}</p>
    </div>
  );
}

function BalanceRow({ label, value, accent }: { label: string; value: string; accent: 'amber' | 'stone' | 'red' }) {
  const classes =
    accent === 'amber'
      ? 'border-amber-500/20 bg-amber-500/10 text-amber-400'
      : accent === 'red'
        ? 'border-red-500/20 bg-red-500/10 text-red-300'
        : 'border-stone-700 bg-stone-800/70 text-stone-200';
  return (
    <div className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${classes}`}>
      <span className="text-xs font-semibold">{label}</span>
      <span className="font-mono text-sm font-black">{value}</span>
    </div>
  );
}

function TransactionRow({ transaction }: { transaction: BankingTransaction }) {
  const credit = transaction.direction === 'credit';
  return (
    <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-white">{transaction.title}</p>
          <p className="mt-1 truncate text-xs text-stone-500">{transaction.merchant ?? transaction.accountId}</p>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${credit ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-300'}`}>
          {credit ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          {formatMoney(Math.abs(transaction.amount), transaction.currency)}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-stone-400">
        <span className="inline-flex items-center gap-2"><CreditCard className="h-3.5 w-3.5 text-amber-400" />{transaction.category}</span>
        <span className="inline-flex items-center gap-2"><Clock3 className="h-3.5 w-3.5" />{transaction.timestamp}</span>
        <span className="uppercase">{transaction.status}</span>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-700 bg-stone-900/60 p-5 text-sm leading-6 text-stone-400">
      {text}
    </div>
  );
}

function formatMoney(amount: number, currency = 'GEL') {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
