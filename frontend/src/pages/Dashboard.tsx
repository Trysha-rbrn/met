import { useEffect, useMemo, useState } from 'react'
import type { ComponentType } from 'react'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Briefcase,
  Calendar,
  Coffee,
  Home,
  PiggyBank,
  Search,
  ShoppingBag,
  Wallet,
  Zap
} from 'lucide-react'
import { Link } from 'react-router-dom'
import * as transactionsApi from '../api/transactionsApi'
import * as accountsApi from '../api/accountsApi'
import * as categoriesApi from '../api/categoriesApi'
import type { Account } from '../api/accountsApi'
import type { Transaction, TransactionSummary } from '../api/transactionsApi'
import type { BudgetGoal } from '../api/categoriesApi'

type UserRole = 'BASIC' | 'PREMIUM' | 'ADMIN'

interface DashboardProps {
  isSidebarCollapsed: boolean
  userRole: UserRole
}

function Dashboard({ userRole }: DashboardProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [summary, setSummary] = useState<TransactionSummary>({
    totalBalance: 0,
    totalIncome: 0,
    totalExpenses: 0
  })
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgetGoals, setBudgetGoals] = useState<BudgetGoal[]>([])
  const [loading, setLoading] = useState(true)

  const currencyCode = localStorage.getItem('met_currency') || 'USD'
  const isPremiumUser = userRole === 'PREMIUM' || userRole === 'ADMIN'

  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true)
        const fetchedAccounts = await accountsApi.getAccounts()
        setAccounts(fetchedAccounts)
        const storedId = localStorage.getItem('met_account_id')
        const defaultAccountId = fetchedAccounts.find((acc) => acc.id === storedId)?.id || fetchedAccounts[0]?.id || ''
        setSelectedAccountId(defaultAccountId)
      } finally {
        setLoading(false)
      }
    }

    void initialize()
  }, [])

  useEffect(() => {
    if (!selectedAccountId) return

    const load = async () => {
      try {
        setLoading(true)
        const [summaryData, txData] = await Promise.all([
          transactionsApi.getSummary(selectedAccountId),
          transactionsApi.getTransactions(selectedAccountId)
        ])
        setSummary(summaryData)
        setTransactions(txData)
        localStorage.setItem('met_account_id', selectedAccountId)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [selectedAccountId])

  useEffect(() => {
    if (!isPremiumUser) {
      setBudgetGoals([])
      return
    }
    const load = async () => {
      try {
        const month = new Date()
        const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`
        const goals = await categoriesApi.getBudgetGoals(monthKey)
        setBudgetGoals(goals)
      } catch {
        setBudgetGoals([])
      }
    }
    void load()
  }, [isPremiumUser])

  const now = useMemo(() => new Date(), [])
  const startOfMonth = useMemo(() => new Date(now.getFullYear(), now.getMonth(), 1), [now])

  const monthlyTransactions = useMemo(
    () => transactions.filter((tx) => new Date(tx.date) >= startOfMonth),
    [transactions, startOfMonth]
  )

  const monthlyIncome = useMemo(
    () => monthlyTransactions.filter((tx) => tx.type === 'INCOME').reduce((sum, tx) => sum + tx.amount, 0),
    [monthlyTransactions]
  )
  const monthlyExpenses = useMemo(
    () => monthlyTransactions.filter((tx) => tx.type === 'EXPENSE').reduce((sum, tx) => sum + tx.amount, 0),
    [monthlyTransactions]
  )
  const savingsRate = monthlyIncome > 0 ? Math.max(0, Math.min(100, ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100)) : 0

  const recentTransactions = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5),
    [transactions]
  )

  const monthBuckets = useMemo(() => {
    const buckets: Array<{
      start: Date
      end: Date
      label: string
      income: number
      expenses: number
      net: number
      runningBalance: number
    }> = []

    for (let offset = 5; offset >= 0; offset -= 1) {
      const start = new Date(now.getFullYear(), now.getMonth() - offset, 1)
      const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 0, 23, 59, 59, 999)
      buckets.push({
        start,
        end,
        label: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(start).toUpperCase(),
        income: 0,
        expenses: 0,
        net: 0,
        runningBalance: 0
      })
    }

    const sortedTransactions = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    let runningBalance = 0
    let txIndex = 0

    for (const bucket of buckets) {
      while (txIndex < sortedTransactions.length && new Date(sortedTransactions[txIndex].date).getTime() <= bucket.end.getTime()) {
        const tx = sortedTransactions[txIndex]
        const amount = tx.type === 'INCOME' ? tx.amount : -tx.amount
        runningBalance += amount

        const txDate = new Date(tx.date).getTime()
        if (txDate >= bucket.start.getTime() && txDate <= bucket.end.getTime()) {
          if (tx.type === 'INCOME') bucket.income += tx.amount
          else bucket.expenses += tx.amount
        }
        txIndex += 1
      }
      bucket.net = bucket.income - bucket.expenses
      bucket.runningBalance = runningBalance
    }

    return buckets
  }, [transactions, now])

  const previousMonthBucket = monthBuckets[4]
  const currentMonthBucket = monthBuckets[5]

  const monthlyIncomeDelta = useMemo(() => {
    const current = currentMonthBucket?.income || 0
    const previous = previousMonthBucket?.income || 0
    if (previous <= 0) return null
    return ((current - previous) / previous) * 100
  }, [currentMonthBucket?.income, previousMonthBucket?.income])

  const savingsRateTrend = useMemo(() => {
    const historical = monthBuckets.slice(0, 5)
    const averageHistoricalRate = historical.length > 0
      ? historical.reduce((sum, bucket) => {
        const rate = bucket.income > 0 ? ((bucket.income - bucket.expenses) / bucket.income) * 100 : 0
        return sum + rate
      }, 0) / historical.length
      : 0
    return savingsRate - averageHistoricalRate
  }, [monthBuckets, savingsRate])

  const chartValues = monthBuckets.map((bucket) => bucket.runningBalance)
  const chartMin = chartValues.length > 0 ? Math.min(...chartValues) : 0
  const chartMax = chartValues.length > 0 ? Math.max(...chartValues) : 0
  const chartRange = Math.max(1, chartMax - chartMin)
  const paddedMin = chartMin - chartRange * 0.15
  const paddedMax = chartMax + chartRange * 0.15
  const viewBoxHeight = 120
  const chartTop = 10
  const chartBottom = 95
  const chartHeight = chartBottom - chartTop

  const chartPoints = monthBuckets.map((bucket, index) => {
    const x = (index / Math.max(1, monthBuckets.length - 1)) * 400
    const normalized = (bucket.runningBalance - paddedMin) / Math.max(1, paddedMax - paddedMin)
    const y = chartBottom - normalized * chartHeight
    return { x, y, value: bucket.runningBalance, label: bucket.label }
  })

  const linePath = chartPoints
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`)
    .join(' ')
  const areaPath = `${linePath} L400,${viewBoxHeight} L0,${viewBoxHeight} Z`
  const yAxisLabels = [
    paddedMax,
    paddedMax - (paddedMax - paddedMin) / 3,
    paddedMax - ((paddedMax - paddedMin) / 3) * 2,
    paddedMin
  ]

  const balanceDeltaPercent = useMemo(() => {
    const previousBalance = previousMonthBucket?.runningBalance || 0
    const currentBalance = currentMonthBucket?.runningBalance || 0
    if (Math.abs(previousBalance) < 0.01) return null
    return ((currentBalance - previousBalance) / Math.abs(previousBalance)) * 100
  }, [currentMonthBucket?.runningBalance, previousMonthBucket?.runningBalance])

  const spendingByCategory = useMemo(() => {
    const map = new Map<string, number>()
    monthlyTransactions.forEach((tx) => {
      if (tx.type !== 'EXPENSE') return
      const category = tx.category?.name || 'Other'
      map.set(category, (map.get(category) || 0) + tx.amount)
    })
    const total = [...map.values()].reduce((sum, amount) => sum + amount, 0)
    const rows = [...map.entries()]
      .map(([name, amount]) => ({
        name,
        amount,
        share: total > 0 ? (amount / total) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
    return { rows, total }
  }, [monthlyTransactions])

  const budgetProgress = useMemo(() => {
    const spentByCategoryId = new Map<string, number>()
    monthlyTransactions.forEach((tx) => {
      if (tx.type !== 'EXPENSE' || !tx.categoryId) return
      spentByCategoryId.set(tx.categoryId, (spentByCategoryId.get(tx.categoryId) || 0) + tx.amount)
    })

    return budgetGoals.slice(0, 4).map((goal) => {
      const spent = spentByCategoryId.get(goal.categoryId) || 0
      const progress = goal.amount > 0 ? (spent / goal.amount) * 100 : 0
      return {
        id: goal.id,
        name: goal.category?.name || 'Category',
        spent,
        limit: goal.amount,
        progress
      }
    })
  }, [budgetGoals, monthlyTransactions])

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId)

  if (loading && accounts.length === 0) {
    return <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-400">Loading dashboard...</div>
  }

  return (
    <div className="space-y-6">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <p className="mb-1 text-xs text-[#64748b]">Good morning</p>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden cursor-default items-center gap-2 rounded-lg border border-white/[0.08] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-xs font-medium md:flex">
            <Calendar className="h-3.5 w-3.5 text-[#ff9eff]" />
            {new Intl.DateTimeFormat('en-US', { month: 'short' }).format(startOfMonth)} 1 - {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(now)}
          </div>
          <Search className="h-5 w-5 cursor-pointer text-[#64748b] transition-colors hover:text-white" />
        </div>
      </header>

      <div className="mb-2 rounded-xl border border-white/[0.08] bg-white/[0.04] p-3">
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="dashboard-account" className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748b]">
            Account
          </label>
          <select
            id="dashboard-account"
            name="accountId"
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="min-h-10 rounded-lg border border-white/10 bg-black/30 px-3 text-sm outline-none"
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
          <span className="text-xs text-[#64748b]">{selectedAccount ? `Showing ${selectedAccount.name}` : 'No account selected'}</span>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Balance"
          value={formatCurrency(summary.totalBalance, currencyCode)}
          icon={Wallet}
          delta={typeof balanceDeltaPercent === 'number' ? `${balanceDeltaPercent >= 0 ? '+' : ''}${Math.round(balanceDeltaPercent)}%` : undefined}
          deltaTone={typeof balanceDeltaPercent === 'number' && balanceDeltaPercent < 0 ? 'danger' : 'positive'}
          helper="vs. previous month-end balance"
        />
        <KpiCard
          label="Monthly Income"
          value={formatCurrency(monthlyIncome, currencyCode)}
          icon={ArrowDownCircle}
          valueClass="text-[#ff9eff]"
          delta={typeof monthlyIncomeDelta === 'number' ? `${monthlyIncomeDelta >= 0 ? '+' : ''}${Math.round(monthlyIncomeDelta)}%` : undefined}
          deltaTone={typeof monthlyIncomeDelta === 'number' && monthlyIncomeDelta < 0 ? 'danger' : 'positive'}
          helper="vs. previous month income"
        />
        <KpiCard
          label="Monthly Expenses"
          value={formatCurrency(monthlyExpenses, currencyCode)}
          icon={ArrowUpCircle}
          delta={`${Math.round(monthlyIncome > 0 ? (monthlyExpenses / monthlyIncome) * 100 : 0)}%`}
          deltaTone="danger"
          helper="expense to income ratio"
        />
        <KpiCard
          label="Savings Rate"
          value={`${Math.round(savingsRate)}%`}
          icon={PiggyBank}
          helper={`${savingsRateTrend >= 0 ? 'Above' : 'Below'} 6M average by ${Math.abs(Math.round(savingsRateTrend))}%`}
          ringPercent={savingsRate}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Net Worth Over Time</h3>
                <p className="mt-0.5 text-[10px] text-[#64748b]">{monthBuckets[0]?.label || ''} - {monthBuckets[monthBuckets.length - 1]?.label || ''} {now.getFullYear()}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-[rgba(255,158,255,0.1)] px-2 py-1 text-[10px] font-medium text-[#ff9eff]">6M</span>
                <span className="rounded-md px-2 py-1 text-[10px] text-[#64748b]">Live</span>
                <span className="rounded-md px-2 py-1 text-[10px] text-[#64748b]">Account</span>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="w-10 shrink-0 pb-5 text-right text-[9px] text-[#64748b]">
                <div className="flex h-52 flex-col justify-between">
                  {yAxisLabels.map((value, index) => (
                    <span key={index}>{formatCompactCurrency(value, currencyCode)}</span>
                  ))}
                </div>
              </div>
              <div className="flex-1">
                <div className="relative h-52 w-full">
                  <svg className="h-full w-full" viewBox="0 0 400 120" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ff9eff" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#ff9eff" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <line x1="0" y1="20" x2="400" y2="20" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                    <line x1="0" y1="50" x2="400" y2="50" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                    <line x1="0" y1="80" x2="400" y2="80" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                    <path d={areaPath} fill="url(#chartGradient)" />
                    <path d={linePath} fill="none" stroke="#ff9eff" strokeWidth="2" strokeLinecap="round" />
                    {chartPoints.map((point, index) => (
                      <circle
                        key={`${point.label}-${index}`}
                        cx={point.x}
                        cy={point.y}
                        r={index === chartPoints.length - 1 ? 4 : 3}
                        fill="#ff9eff"
                        stroke={index === chartPoints.length - 1 ? '#0a0a0a' : 'none'}
                        strokeWidth={index === chartPoints.length - 1 ? 2 : 0}
                      />
                    ))}
                  </svg>
                </div>
                <div className="mt-2 flex justify-between px-1 text-[10px] text-[#64748b]">
                  {monthBuckets.map((bucket) => (
                    <span key={bucket.label}>{bucket.label}</span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-sm font-bold">Recent Transactions</h3>
              <Link to="/transactions" className="text-[10px] text-[#ff9eff] hover:underline">
                View all -&gt;
              </Link>
            </div>
            <div className="space-y-1">
              {recentTransactions.length === 0 && <p className="rounded-xl p-3 text-sm text-[#64748b]">No transactions yet.</p>}
              {recentTransactions.map((tx) => {
                const Icon = getTransactionIcon(tx)
                const amountPrefix = tx.type === 'INCOME' ? '+' : '-'
                return (
                  <div key={tx.id} className="cursor-pointer rounded-xl p-3 transition-colors hover:bg-[rgba(255,255,255,0.02)]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tx.type === 'INCOME' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[rgba(255,158,255,0.1)] text-[#ff9eff]'}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{tx.description || tx.category?.name || 'Transaction'}</p>
                          <p className="text-[10px] text-[#64748b]">
                            {formatDate(tx.date)} - {tx.category?.name || 'Uncategorized'}
                          </p>
                        </div>
                      </div>
                      <span className={`text-sm font-bold ${tx.type === 'INCOME' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {amountPrefix}
                        {formatCurrency(tx.amount, currencyCode)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
            <h3 className="mb-5 text-sm font-bold">Spending by Category</h3>
            <div className="mb-5 flex justify-center">
              <div className="relative h-32 w-32">
                <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                  {buildDonutSegments(spendingByCategory.rows).map((segment, idx) => (
                    <circle
                      key={segment.name}
                      cx="18"
                      cy="18"
                      r="15.9"
                      fill="none"
                      stroke={DONUT_COLORS[idx % DONUT_COLORS.length]}
                      strokeWidth="3.5"
                      strokeDasharray={`${segment.share} ${100 - segment.share}`}
                      strokeDashoffset={segment.offset}
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-[9px] uppercase tracking-wide text-[#64748b]">Total</p>
                  <p className="text-sm font-extrabold">{formatCurrency(spendingByCategory.total, currencyCode)}</p>
                </div>
              </div>
            </div>
            <div className="space-y-2.5">
              {spendingByCategory.rows.length === 0 && <p className="text-xs text-[#64748b]">No expense data for this month.</p>}
              {spendingByCategory.rows.map((row, index) => (
                <div key={row.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }} />
                    <span className="text-[#64748b]">{row.name}</span>
                  </div>
                  <span className="font-bold">
                    {formatCurrency(row.amount, currencyCode)} <span className="font-normal text-[#64748b]">{Math.round(row.share)}%</span>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-sm font-bold">Budget Progress</h3>
              <span className="text-[10px] text-[#64748b]">
                {new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(now)}
              </span>
            </div>
            <div className="space-y-5">
              {budgetProgress.length === 0 && <p className="text-xs text-[#64748b]">No budget goals configured.</p>}
              {budgetProgress.map((item) => {
                const nearLimit = item.progress >= 85
                const onTrack = item.progress < 80
                return (
                  <div key={item.id}>
                    <div className="mb-2 flex justify-between text-xs">
                      <span className="text-[#64748b]">{item.name}</span>
                      <span className={`font-bold ${nearLimit ? 'text-red-400' : ''}`}>
                        {formatCurrency(item.spent, currencyCode)} / <span className="text-[#64748b]">{formatCurrency(item.limit, currencyCode)}</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.05)]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, Math.max(0, item.progress))}%`,
                          background: nearLimit
                            ? 'linear-gradient(90deg, #dc89e1, #ff4444)'
                            : 'linear-gradient(90deg, #dc89e1, #ff9eff)'
                        }}
                      />
                    </div>
                    <p className={`mt-1 text-[9px] ${nearLimit ? 'text-red-400' : onTrack ? 'text-emerald-400' : 'text-[#64748b]'}`}>
                      {nearLimit ? `Near limit - ${Math.round(item.progress)}%` : onTrack ? 'On track' : `${Math.round(item.progress)}% used`}
                    </p>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  icon: Icon,
  delta,
  deltaTone = 'positive',
  helper,
  valueClass,
  ringPercent
}: {
  label: string
  value: string
  icon: ComponentType<{ className?: string }>
  delta?: string
  deltaTone?: 'positive' | 'danger'
  helper: string
  valueClass?: string
  ringPercent?: number
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
      <p className="mb-3 flex items-center gap-1.5 text-xs font-medium text-[#64748b]">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <div className="flex items-end justify-between">
        <h2 className={`text-2xl font-extrabold ${valueClass || ''}`}>{value}</h2>
        {delta ? (
          <span className={`mb-1 rounded-full px-2 py-0.5 text-xs font-bold ${deltaTone === 'danger' ? 'bg-red-400/10 text-red-400' : 'bg-emerald-400/10 text-emerald-400'}`}>
            {delta}
          </span>
        ) : null}
        {typeof ringPercent === 'number' ? <SavingsRing percent={ringPercent} /> : null}
      </div>
      <p className="mt-2 text-[10px] text-[#64748b]">{helper}</p>
    </div>
  )
}

function SavingsRing({ percent }: { percent: number }) {
  const normalized = Math.max(0, Math.min(100, percent))
  const circumference = 100.5
  const dashOffset = circumference - (normalized / 100) * circumference
  return (
    <div className="relative flex h-12 w-12 items-center justify-center">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="16" stroke="rgba(255,255,255,0.08)" strokeWidth="4" fill="transparent" />
        <circle
          cx="20"
          cy="20"
          r="16"
          stroke="#ff9eff"
          strokeWidth="4"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}

function getTransactionIcon(tx: Transaction): ComponentType<{ className?: string }> {
  const text = `${tx.description || ''} ${tx.category?.name || ''}`.toLowerCase()
  if (text.includes('coffee')) return Coffee
  if (text.includes('rent') || text.includes('housing') || text.includes('home')) return Home
  if (text.includes('stripe') || text.includes('salary') || tx.type === 'INCOME') return Briefcase
  if (text.includes('vercel') || text.includes('subscription')) return Zap
  if (text.includes('store') || text.includes('shop')) return ShoppingBag
  return ShoppingBag
}

const DONUT_COLORS = ['#ff9eff', '#dc89e1', '#a569b0', '#6a4d8b', '#fce3f7']

function buildDonutSegments(rows: Array<{ name: string; share: number }>) {
  let runningOffset = 0
  return rows.map((row) => {
    const segment = {
      ...row,
      offset: -runningOffset
    }
    runningOffset += row.share
    return segment
  })
}

function formatCurrency(value: number, currencyCode: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode
  }).format(value)
}

function formatCompactCurrency(value: number, currencyCode: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value).replace('K', 'k')
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
}

export default Dashboard
