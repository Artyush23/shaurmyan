import { useMemo, type ReactNode } from "react";
import {
  Download,
  FileDown,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  WalletCards,
  Landmark,
  CreditCard,
  ShieldCheck,
  Clock3,
  Sparkles,
} from "lucide-react";

export interface BankingAccount {
  id: string;
  bank: "TBC" | "BOG";
  label: string;
  currency: string;
  availableBalance: number;
  ledgerBalance: number;
  accountNumber: string;
  status: "active" | "pending" | "syncing";
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
  direction: "credit" | "debit";
  status: "posted" | "pending" | "failed";
}

export interface BankingDashboardProps {
  accounts?: BankingAccount[];
  transactions?: BankingTransaction[];
  monthlySpend?: number[];
  monthlyLabels?: string[];
  onExportSummary?: () => void;
  onDownloadStatement?: () => void;
  onRefresh?: () => void;
}

const FALLBACK_ACCOUNTS: BankingAccount[] = [
  {
    id: "tbc-main",
    bank: "TBC",
    label: "ShaurmYAN Operations",
    currency: "GEL",
    availableBalance: 18420.65,
    ledgerBalance: 18780.1,
    accountNumber: "GE12 TB12 0000 0000 0000 00",
    status: "active",
    updatedAt: "2 min ago",
  },
  {
    id: "bog-reserve",
    bank: "BOG",
    label: "Reserve Treasury",
    currency: "GEL",
    availableBalance: 9620.35,
    ledgerBalance: 9804.3,
    accountNumber: "GE34 BG34 1111 1111 1111 11",
    status: "syncing",
    updatedAt: "live",
  },
];

const FALLBACK_TRANSACTIONS: BankingTransaction[] = [
  {
    id: "tx-1",
    accountId: "tbc-main",
    title: "Card settlement batch",
    merchant: "Terminal Network",
    amount: -1240.5,
    currency: "GEL",
    category: "Settlement",
    timestamp: "Today, 10:42",
    direction: "debit",
    status: "posted",
  },
  {
    id: "tx-2",
    accountId: "tbc-main",
    title: "Online order payout",
    merchant: "ShaurmYAN POS",
    amount: 862.0,
    currency: "GEL",
    category: "Revenue",
    timestamp: "Today, 09:18",
    direction: "credit",
    status: "posted",
  },
  {
    id: "tx-3",
    accountId: "bog-reserve",
    title: "Liquidity transfer",
    merchant: "Treasury Move",
    amount: -5000,
    currency: "GEL",
    category: "Transfer",
    timestamp: "Yesterday",
    direction: "debit",
    status: "pending",
  },
  {
    id: "tx-4",
    accountId: "tbc-main",
    title: "Statement fee refund",
    merchant: "Bank Adjustment",
    amount: 48.15,
    currency: "GEL",
    category: "Refund",
    timestamp: "Yesterday",
    direction: "credit",
    status: "posted",
  },
];

const FALLBACK_SPEND = [820, 760, 980, 640, 1170, 840, 1280, 920, 1500, 1340, 1780, 1620];
const FALLBACK_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function BankingDashboard({
  accounts = FALLBACK_ACCOUNTS,
  transactions = FALLBACK_TRANSACTIONS,
  monthlySpend = FALLBACK_SPEND,
  monthlyLabels = FALLBACK_LABELS,
  onExportSummary,
  onDownloadStatement,
  onRefresh,
}: BankingDashboardProps) {
  const totalAvailable = useMemo(
    () => accounts.reduce((sum, account) => sum + account.availableBalance, 0),
    [accounts]
  );

  const totalLedger = useMemo(
    () => accounts.reduce((sum, account) => sum + account.ledgerBalance, 0),
    [accounts]
  );

  const netMonthlySpend = useMemo(
    () => monthlySpend.reduce((sum, value) => sum + value, 0),
    [monthlySpend]
  );

  const monthlyPeak = useMemo(() => Math.max(...monthlySpend, 1), [monthlySpend]);
  const chartPoints = useMemo(() => {
    return monthlySpend.map((value, index) => {
      const x = monthlySpend.length === 1 ? 0 : (index / (monthlySpend.length - 1)) * 100;
      const y = 100 - (value / monthlyPeak) * 100;
      return { x, y };
    });
  }, [monthlySpend, monthlyPeak]);

  const sparkPath = useMemo(() => {
    if (chartPoints.length === 0) return "";
    return chartPoints
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
      .join(" ");
  }, [chartPoints]);

  const areaPath = useMemo(() => {
    if (chartPoints.length === 0) return "";
    const first = chartPoints[0];
    const last = chartPoints[chartPoints.length - 1];
    return `${sparkPath} L ${last.x.toFixed(2)} 100 L ${first.x.toFixed(2)} 100 Z`;
  }, [chartPoints, sparkPath]);

  const totalCredits = useMemo(
    () =>
      transactions
        .filter((item) => item.direction === "credit")
        .reduce((sum, item) => sum + item.amount, 0),
    [transactions]
  );

  const totalDebits = useMemo(
    () =>
      Math.abs(
        transactions
          .filter((item) => item.direction === "debit")
          .reduce((sum, item) => sum + item.amount, 0)
      ),
    [transactions]
  );

  const recentSpend = monthlySpend.slice(-4);
  const recentSpendLabels = monthlyLabels.slice(-4);

  return (
    <section className="min-h-screen bg-stone-950 text-stone-100 font-sans charcoal-grid-bg">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <header className="flex flex-col gap-4 border-b border-stone-800 pb-5 sm:pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-amber-400">
              <Sparkles className="h-3.5 w-3.5" />
              Premium Banking
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-black leading-none text-white sm:text-4xl">
                Banking Dashboard
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-stone-400 sm:text-base">
                Live balances, transaction history, and exportable statement summaries in the same
                ShaurmYAN dark amber system.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-stone-800 bg-stone-900 px-3 py-3 text-xs font-bold text-stone-200 transition-colors hover:border-stone-700 hover:bg-stone-800 sm:px-4 sm:py-2.5"
            >
              <RefreshCw className="h-4 w-4 text-amber-400" />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={onDownloadStatement}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-3 text-xs font-black text-stone-950 transition-all hover:from-amber-400 hover:to-amber-500 sm:px-4 sm:py-2.5"
            >
              <Download className="h-4 w-4" />
              <span>Statement</span>
            </button>
            <button
              type="button"
              onClick={onExportSummary}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-3 text-xs font-bold text-amber-300 transition-colors hover:bg-amber-500/15 hover:text-amber-200 sm:col-span-2 sm:px-4 sm:py-2.5"
            >
              <FileDown className="h-4 w-4" />
              <span>Export Summary</span>
            </button>
          </div>
        </header>

        <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Available Balance"
            value={formatMoney(totalAvailable)}
            note={`${accounts.length} connected account${accounts.length === 1 ? "" : "s"}`}
            icon={<WalletCards className="h-6 w-6" />}
          />
          <StatCard
            label="Ledger Balance"
            value={formatMoney(totalLedger)}
            note="Includes pending settlements"
            icon={<Landmark className="h-6 w-6" />}
          />
          <StatCard
            label="Monthly Credits"
            value={formatMoney(totalCredits)}
            note="Incoming settlements and refunds"
            icon={<ArrowUpRight className="h-6 w-6" />}
          />
          <StatCard
            label="Monthly Debits"
            value={formatMoney(totalDebits)}
            note="Payouts, fees, and transfers"
            icon={<ArrowDownRight className="h-6 w-6" />}
          />
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="space-y-6 xl:col-span-4">
            <Panel title="Account Lists" eyebrow="Connected Accounts">
              <div className="space-y-3">
                {accounts.map((account) => (
                  <div key={account.id}>
                    <AccountRow account={account} />
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Live Balances" eyebrow="Realtime Snapshot">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <BalanceRow label="Spendable" value={formatMoney(totalAvailable)} accent="amber" />
                <BalanceRow label="Ledger" value={formatMoney(totalLedger)} accent="stone" />
                <BalanceRow
                  label="Exposure"
                  value={formatMoney(Math.max(totalLedger - totalAvailable, 0))}
                  accent="red"
                />
              </div>
            </Panel>
          </div>

          <div className="space-y-6 xl:col-span-8">
            <Panel title="Spending Analytics" eyebrow="Monthly Trend">
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-stone-500 sm:text-xs">
                      Total spend
                    </p>
                    <p className="mt-1 text-2xl font-black text-white sm:text-3xl">
                      {formatMoney(netMonthlySpend)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 sm:min-w-40">
                    <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-amber-300">
                      Peak month
                    </p>
                    <p className="mt-1 text-sm font-black text-white">{formatMoney(monthlyPeak)}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-3 sm:p-4">
                  <div className="h-56 w-full sm:h-72">
                    <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible">
                      <defs>
                        <linearGradient id="spendFill" x1="0%" x2="0%" y1="0%" y2="100%">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.42" />
                          <stop offset="100%" stopColor="#d84315" stopOpacity="0.03" />
                        </linearGradient>
                        <linearGradient id="spendStroke" x1="0%" x2="100%" y1="0%" y2="0%">
                          <stop offset="0%" stopColor="#fbbf24" />
                          <stop offset="50%" stopColor="#f59e0b" />
                          <stop offset="100%" stopColor="#d84315" />
                        </linearGradient>
                      </defs>

                      <rect x="0" y="0" width="100" height="100" fill="#0c0a09" rx="4" />

                      {[20, 40, 60, 80].map((line) => (
                        <line
                          key={line}
                          x1="0"
                          y1={line}
                          x2="100"
                          y2={line}
                          stroke="rgba(255,255,255,0.06)"
                          strokeWidth="0.4"
                        />
                      ))}

                      <path d={areaPath} fill="url(#spendFill)" />
                      <path
                        d={sparkPath}
                        fill="none"
                        stroke="url(#spendStroke)"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {chartPoints.map((point, index) => (
                        <g key={`${point.x}-${point.y}`}>
                          <circle cx={point.x} cy={point.y} r="1.5" fill="#f59e0b" />
                          <text
                            x={point.x}
                            y="96"
                            fill="rgba(255,255,255,0.58)"
                            fontSize="2.7"
                            textAnchor="middle"
                            fontFamily="JetBrains Mono, monospace"
                          >
                            {monthlyLabels[index] ?? ""}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {recentSpend.map((value, idx) => (
                      <div
                        key={`${recentSpendLabels[idx] ?? idx}-${value}`}
                        className="rounded-2xl border border-stone-800 bg-stone-950/80 px-3 py-3"
                      >
                        <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone-500">
                          {recentSpendLabels[idx] ?? "Month"}
                        </p>
                        <p className="mt-1 text-sm font-black text-white">{formatMoney(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Panel>

            <Panel title="Transaction Histories" eyebrow="Recent Activity">
              <div className="space-y-3 md:hidden">
                {transactions.map((transaction) => (
                  <div key={transaction.id}>
                    <TransactionCard transaction={transaction} />
                  </div>
                ))}
              </div>

              <div className="hidden overflow-hidden rounded-2xl border border-stone-800 md:block">
                <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.9fr] gap-3 border-b border-stone-800 bg-stone-900 px-4 py-3 text-[10px] font-mono uppercase tracking-[0.24em] text-stone-500">
                  <span>Transaction</span>
                  <span>Category</span>
                  <span>Time</span>
                  <span className="text-right">Amount</span>
                </div>

                <div className="divide-y divide-stone-800 bg-stone-950/70">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.9fr] gap-3 px-4 py-4 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">{transaction.title}</p>
                        <p className="truncate text-xs text-stone-500">
                          {transaction.merchant ?? transaction.accountId}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-stone-300">
                        <CreditCard className="h-3.5 w-3.5 text-amber-400" />
                        <span className="truncate">{transaction.category}</span>
                      </div>
                      <div className="flex items-center gap-2 text-stone-400">
                        <Clock3 className="h-3.5 w-3.5 text-stone-500" />
                        <span className="truncate">{transaction.timestamp}</span>
                      </div>
                      <div className="flex items-center justify-end gap-2 text-right">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                            transaction.direction === "credit"
                              ? "bg-green-500/10 text-green-400"
                              : "bg-red-500/10 text-red-300"
                          }`}
                        >
                          {transaction.direction === "credit" ? (
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowDownRight className="h-3.5 w-3.5" />
                          )}
                          {formatMoney(Math.abs(transaction.amount), transaction.currency)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          </div>
        </section>

        <footer className="mt-6 flex flex-col gap-3 rounded-2xl border border-stone-800 bg-stone-900/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2 text-sm text-stone-300">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <span>
              Banking data stays server-owned and ready for secure Open Banking refresh flows.
            </span>
          </div>
          <button
            type="button"
            onClick={onExportSummary}
            className="inline-flex cursor-pointer items-center justify-center gap-2 text-sm font-bold text-amber-300 transition-colors hover:text-amber-200"
          >
            <FileDown className="h-4 w-4" />
            Export summary sheet
          </button>
        </footer>
      </div>
    </section>
  );
}

function Panel({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-stone-800 bg-stone-950/85 p-4 shadow-xl sm:p-5 lg:p-6">
      <div className="mb-4 sm:mb-5">
        <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-amber-400">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-lg font-black text-white sm:text-xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function StatCard({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-stone-800 bg-stone-950/85 p-4 shadow-xl sm:p-5">
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone-500 sm:text-xs">
            {label}
          </p>
          <p className="mt-2 text-xl font-black leading-none text-white sm:text-2xl">{value}</p>
          <p className="mt-2 text-xs leading-5 text-stone-400">{note}</p>
        </div>
        <div className="shrink-0 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-400">
          {icon}
        </div>
      </div>
    </section>
  );
}

function AccountRow({ account }: { account: BankingAccount }) {
  return (
    <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4 transition-colors hover:bg-stone-900 sm:p-4.5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.22em] text-amber-400">
              {account.bank}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] ${
                account.status === "active"
                  ? "bg-green-500/10 text-green-400"
                  : account.status === "pending"
                    ? "bg-yellow-500/10 text-yellow-300"
                    : "bg-amber-500/10 text-amber-300"
              }`}
            >
              {account.status}
            </span>
          </div>
          <h3 className="mt-2 truncate text-sm font-bold text-white sm:text-base">{account.label}</h3>
          <p className="mt-1 truncate text-xs text-stone-500">{account.accountNumber}</p>
        </div>

        <div className="sm:text-right">
          <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone-500">
            Updated {account.updatedAt}
          </p>
          <p className="mt-2 text-lg font-black text-amber-400 sm:text-xl">
            {formatMoney(account.availableBalance, account.currency)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <MiniStat label="Available" value={formatMoney(account.availableBalance, account.currency)} />
        <MiniStat label="Ledger" value={formatMoney(account.ledgerBalance, account.currency)} />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-800 bg-stone-950/80 px-3 py-3">
      <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone-500">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}

function BalanceRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "amber" | "stone" | "red";
}) {
  const accentClasses =
    accent === "amber"
      ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
      : accent === "red"
        ? "text-red-300 bg-red-500/10 border-red-500/20"
        : "text-stone-200 bg-stone-800/70 border-stone-700";

  return (
    <div className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${accentClasses}`}>
      <span className="text-xs font-semibold sm:text-sm">{label}</span>
      <span className="font-mono text-sm font-black sm:text-base">{value}</span>
    </div>
  );
}

function TransactionCard({ transaction }: { transaction: BankingTransaction }) {
  const isCredit = transaction.direction === "credit";

  return (
    <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{transaction.title}</p>
          <p className="mt-0.5 truncate text-xs text-stone-500">{transaction.merchant ?? transaction.accountId}</p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
            isCredit ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-300"
          }`}
        >
          {isCredit ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          {formatMoney(Math.abs(transaction.amount), transaction.currency)}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-stone-400">
        <div className="flex items-center gap-2">
          <CreditCard className="h-3.5 w-3.5 text-amber-400" />
          <span className="truncate">{transaction.category}</span>
        </div>
        <div className="flex items-center justify-end gap-2">
          <Clock3 className="h-3.5 w-3.5 text-stone-500" />
          <span className="truncate">{transaction.timestamp}</span>
        </div>
      </div>
    </div>
  );
}

function formatMoney(amount: number, currency = "GEL") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}
