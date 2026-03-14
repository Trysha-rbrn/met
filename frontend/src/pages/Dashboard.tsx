import { memo, useState, useEffect, useMemo, type ComponentType } from 'react'
import { Coins, ArrowUp, ArrowDown, CalendarDays, TrendingUp, WalletCards } from 'lucide-react'
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts'
import * as api from '../api/transactionsApi'
import * as accountsApi from '../api/accountsApi'
import type { Transaction, TransactionSummary } from '../api/transactionsApi'
import type { Account } from '../api/accountsApi'

type RangeKey = '1D' | '7D' | '30D' | 'YTD' | 'ALL' | 'CUSTOM'

const DAY_MS = 24 * 60 * 60 * 1000

interface DashboardProps {
  isSidebarCollapsed: boolean
}

function Dashboard({ isSidebarCollapsed }: DashboardProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [summary, setSummary] = useState<TransactionSummary>({ totalBalance: 0, totalIncome: 0, totalExpenses: 0 })
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRange, setSelectedRange] = useState<RangeKey>('7D')
  const [customStart, setCustomStart] = useState(() => getDateInputValue(daysAgo(29)))
  const [customEnd, setCustomEnd] = useState(() => getDateInputValue(new Date()))
  const [showCharts, setShowCharts] = useState(true)

  const currencyCode = localStorage.getItem('met_currency') || 'USD'

  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true)
        const fetchedAccounts = await accountsApi.getAccounts()
        setAccounts(fetchedAccounts)

        const storedId = localStorage.getItem('met_account_id')
        const defaultAccountId = fetchedAccounts.find((acc) => acc.id === storedId)?.id || fetchedAccounts[0]?.id || ''
        setSelectedAccountId(defaultAccountId)

        if (defaultAccountId) {
          await fetchData(defaultAccountId)
        }
      } catch (error) {
        console.error('Error initializing dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    void initialize()
  }, [])

  useEffect(() => {
    if (!selectedAccountId) return
    localStorage.setItem('met_account_id', selectedAccountId)
    void fetchData(selectedAccountId)
  }, [selectedAccountId])

  useEffect(() => {
    setShowCharts(false)
    const timer = window.setTimeout(() => setShowCharts(true), 220)
    return () => window.clearTimeout(timer)
  }, [isSidebarCollapsed])

  const fetchData = async (accountId: string) => {
    try {
      setLoading(true)
      const [summaryData, transactionsData] = await Promise.all([
        api.getSummary(accountId),
        api.getTransactions(accountId)
      ])
      setSummary(summaryData)
      setTransactions(transactionsData)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId),
    [accounts, selectedAccountId]
  )

  const sortedTransactions = useMemo(
    () => [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [transactions]
  )

  const rangeBoundaries = useMemo(() => {
    const now = new Date()
    const end = endOfDay(now)

    if (selectedRange === '1D') {
      return { start: startOfDay(now), end, label: 'today' }
    }
    if (selectedRange === '7D') {
      return { start: startOfDay(daysAgo(6)), end, label: 'last 7 days' }
    }
    if (selectedRange === '30D') {
      return { start: startOfDay(daysAgo(29)), end, label: 'last 30 days' }
    }
    if (selectedRange === 'YTD') {
      const startOfYear = new Date(now.getFullYear(), 0, 1)
      return { start: startOfDay(startOfYear), end, label: 'year to date' }
    }
    if (selectedRange === 'ALL') {
      const oldestTransaction = sortedTransactions[0]
      const start = oldestTransaction ? startOfDay(new Date(oldestTransaction.date)) : startOfDay(now)
      return { start, end, label: 'all time' }
    }

    const customStartDate = customStart ? startOfDay(new Date(customStart)) : startOfDay(daysAgo(29))
    const customEndDate = customEnd ? endOfDay(new Date(customEnd)) : end
    return { start: customStartDate, end: customEndDate, label: 'custom range' }
  }, [selectedRange, customStart, customEnd, sortedTransactions])

  const hasInvalidCustomRange = selectedRange === 'CUSTOM' && rangeBoundaries.start.getTime() > rangeBoundaries.end.getTime()

  const periodTransactions = useMemo(() => {
    if (hasInvalidCustomRange) return []
    return sortedTransactions.filter((t) => {
      const txDate = new Date(t.date).getTime()
      return txDate >= rangeBoundaries.start.getTime() && txDate <= rangeBoundaries.end.getTime()
    })
  }, [sortedTransactions, rangeBoundaries, hasInvalidCustomRange])

  const periodTotals = useMemo(() => {
    const income = periodTransactions
      .filter((t) => t.type === 'INCOME')
      .reduce((acc, curr) => acc + curr.amount, 0)

    const expenses = periodTransactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((acc, curr) => acc + curr.amount, 0)

    return {
      income,
      expenses,
      net: income - expenses
    }
  }, [periodTransactions])

  const chartData = useMemo(() => {
    if (hasInvalidCustomRange) return []

    const dayBuckets = new Map<string, { day: string; income: number; expenses: number }>()
    const dayLabels: string[] = []

    for (
      let cursor = startOfDay(rangeBoundaries.start);
      cursor.getTime() <= rangeBoundaries.end.getTime();
      cursor = new Date(cursor.getTime() + DAY_MS)
    ) {
      const key = getDateInputValue(cursor)
      dayLabels.push(key)
      dayBuckets.set(key, { day: formatDayLabel(cursor), income: 0, expenses: 0 })
    }

    const baseBalance = sortedTransactions.reduce((acc, tx) => {
      const txDate = new Date(tx.date).getTime()
      if (txDate < rangeBoundaries.start.getTime()) {
        return acc + (tx.type === 'INCOME' ? tx.amount : -tx.amount)
      }
      return acc
    }, 0)

    periodTransactions.forEach((tx) => {
      const key = getDateInputValue(new Date(tx.date))
      const bucket = dayBuckets.get(key)
      if (!bucket) return
      if (tx.type === 'INCOME') {
        bucket.income += tx.amount
      } else {
        bucket.expenses += tx.amount
      }
    })

    let runningBalance = baseBalance

    return dayLabels.map((key) => {
      const bucket = dayBuckets.get(key)
      if (!bucket) return { dayKey: key, income: 0, expenses: 0, net: 0, runningBalance }
      const net = bucket.income - bucket.expenses
      runningBalance += net
      return {
        dayKey: key,
        income: bucket.income,
        expenses: bucket.expenses,
        runningBalance
      }
    })
  }, [periodTransactions, sortedTransactions, rangeBoundaries, hasInvalidCustomRange])

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(val)
  }

  const formatTooltipCurrency = (value: unknown) => {
    if (typeof value === 'number') return formatCurrency(value)
    const parsed = Number(value ?? 0)
    return formatCurrency(Number.isFinite(parsed) ? parsed : 0)
  }

  const periodTitle = selectedRange === 'CUSTOM'
    ? `${customStart || '?'} to ${customEnd || '?'}`
    : rangeBoundaries.label

  const recentTransactions = useMemo(
    () => [...periodTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6),
    [periodTransactions]
  )

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="space-y-3">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tighter">Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground font-medium">Current balance and movement across selected periods.</p>
        </div>
        <div className="bg-card border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <WalletCards size={16} />
            Active account
          </div>
          <select
            id="dashboard-account"
            name="accountId"
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="sm:min-w-56 min-h-11 px-4 py-2.5 border rounded-xl bg-background"
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>{account.name}</option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">
            {selectedAccount ? `Showing ${selectedAccount.name}` : 'No account selected'}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Current Balance"
          amount={formatCurrency(summary.totalBalance)}
          icon={Coins}
          color="text-primary"
          glow
        />
        <StatCard
          title="Period Net"
          amount={formatCurrency(periodTotals.net)}
          icon={TrendingUp}
          color={periodTotals.net >= 0 ? 'text-emerald-500' : 'text-rose-500'}
        />
        <StatCard
          title="Period Income"
          amount={formatCurrency(periodTotals.income)}
          icon={ArrowUp}
          color="text-emerald-500"
        />
        <StatCard
          title="Period Expenses"
          amount={formatCurrency(periodTotals.expenses)}
          icon={ArrowDown}
          color="text-rose-500"
        />
      </div>

      <section className="bg-card border rounded-2xl p-5 md:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <CalendarDays className="text-primary" size={20} />
            <h2 className="text-lg font-bold">Period Analysis</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['1D', '7D', '30D', 'YTD', 'ALL', 'CUSTOM'] as RangeKey[]).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setSelectedRange(range)}
                className={`min-h-11 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                  selectedRange === range
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {selectedRange === 'CUSTOM' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-sm font-semibold space-y-1">
              <span className="block text-muted-foreground">Start date</span>
              <input
                id="dashboard-custom-start"
                name="customStartDate"
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full rounded-xl border bg-background px-3 py-2.5"
              />
            </label>
            <label className="text-sm font-semibold space-y-1">
              <span className="block text-muted-foreground">End date</span>
              <input
                id="dashboard-custom-end"
                name="customEndDate"
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full rounded-xl border bg-background px-3 py-2.5"
              />
            </label>
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          Showing: <span className="font-semibold text-foreground">{periodTitle}</span>
        </p>

        {hasInvalidCustomRange && (
          <p className="text-sm font-semibold text-destructive">Start date must be before end date.</p>
        )}
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 min-w-0">
        <div className="bg-card border rounded-2xl p-5 md:p-6 min-w-0">
          <h3 className="text-lg font-bold mb-4">Balance Trend</h3>
          <div className="h-64 sm:h-72 min-h-[16rem] sm:min-h-[18rem] min-w-0">
            {loading ? (
              <ChartSkeleton />
            ) : showCharts ? (
              <ResponsiveContainer width="100%" height={256} minWidth={1} minHeight={256} debounce={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis
                    dataKey="dayKey"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => formatDayLabelFromKey(String(value))}
                  />
                  <YAxis tickFormatter={(value) => formatCompactCurrency(value)} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={formatTooltipCurrency}
                    labelFormatter={(label) => formatFullDateLabelFromKey(String(label))}
                  />
                  <Area type="monotone" dataKey="runningBalance" stroke="#3b82f6" fill="url(#balanceFill)" strokeWidth={2.5} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ChartSkeleton />
            )}
          </div>
        </div>

        <div className="bg-card border rounded-2xl p-5 md:p-6 min-w-0">
          <h3 className="text-lg font-bold mb-4">Income vs Expenses</h3>
          <div className="h-64 sm:h-72 min-h-[16rem] sm:min-h-[18rem] min-w-0">
            {loading ? (
              <ChartSkeleton />
            ) : showCharts ? (
              <ResponsiveContainer width="100%" height={256} minWidth={1} minHeight={256} debounce={120}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis
                    dataKey="dayKey"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => formatDayLabelFromKey(String(value))}
                  />
                  <YAxis tickFormatter={(value) => formatCompactCurrency(value)} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={formatTooltipCurrency}
                    labelFormatter={(label) => formatFullDateLabelFromKey(String(label))}
                  />
                  <Legend />
                  <Bar dataKey="income" fill="#10b981" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="expenses" fill="#f43f5e" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartSkeleton />
            )}
          </div>
        </div>
      </div>

      <section className="bg-card border rounded-2xl p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Recent Activity (Snapshot)</h3>
          <span className="text-xs text-muted-foreground">Less critical detail</span>
        </div>
        {recentTransactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions in selected period.</p>
        ) : (
          <div className="divide-y">
            {recentTransactions.map((tx) => (
              <div key={tx.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{tx.description || tx.category?.name || 'Transaction'}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {tx.category?.name || 'Uncategorized'} • {new Date(tx.date).toLocaleDateString()}
                  </p>
                </div>
                <p className={`font-bold ${tx.type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function startOfDay(date: Date) {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function endOfDay(date: Date) {
  const copy = new Date(date)
  copy.setHours(23, 59, 59, 999)
  return copy
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * DAY_MS)
}

function getDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDayLabelFromKey(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return formatDayLabel(parsed)
}

function formatFullDateLabelFromKey(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value)
}

const StatCard = ({ title, amount, icon: Icon, color, glow = false }: { title: string; amount: string; icon: ComponentType<{ size?: number; className?: string }>; color: string; glow?: boolean }) => (
  <div className="bg-card border rounded-2xl p-4 sm:p-6 flex flex-col justify-between gap-3 sm:gap-4 transition-all hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5">
    <div className="flex items-center justify-between text-muted-foreground">
      <span className="font-bold text-sm uppercase tracking-widest">{title}</span>
      <Icon size={24} className={color} />
    </div>
    <span
      className={`text-3xl sm:text-4xl font-black tracking-tighter ${color}`}
      style={glow ? { textShadow: '0 0 16px rgba(165, 105, 176, 0.45)' } : undefined}
    >
      {amount}
    </span>
  </div>
)

const ChartSkeleton = () => (
  <div className="h-full w-full rounded-xl bg-muted/60 animate-pulse" />
)

export default memo(Dashboard)
