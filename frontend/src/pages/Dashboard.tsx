import { lazy, memo, Suspense, useState, useEffect, useMemo, useCallback, type ComponentType } from 'react'
import { Coins, ArrowUp, ArrowDown, CalendarDays, TrendingUp, WalletCards, Gem, Sparkles, LineChart, ShieldCheck } from 'lucide-react'
import * as api from '../api/transactionsApi'
import * as accountsApi from '../api/accountsApi'
import * as categoriesApi from '../api/categoriesApi'
import type { Transaction, TransactionSummary } from '../api/transactionsApi'
import type { Account } from '../api/accountsApi'
import type { BudgetGoal } from '../api/categoriesApi'

type RangeKey = '1D' | '7D' | '30D' | '90D' | 'YTD' | 'ALL' | 'CUSTOM'
type UserRole = 'BASIC' | 'PREMIUM' | 'ADMIN'

const DAY_MS = 24 * 60 * 60 * 1000
const DashboardCharts = lazy(() => import('../components/DashboardCharts'))

interface DashboardProps {
  isSidebarCollapsed: boolean
  userRole: UserRole
}

function Dashboard({ isSidebarCollapsed, userRole }: DashboardProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [summary, setSummary] = useState<TransactionSummary>({ totalBalance: 0, totalIncome: 0, totalExpenses: 0 })
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgetGoals, setBudgetGoals] = useState<BudgetGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRange, setSelectedRange] = useState<RangeKey>('7D')
  const [customStart, setCustomStart] = useState(() => getDateInputValue(daysAgo(29)))
  const [customEnd, setCustomEnd] = useState(() => getDateInputValue(new Date()))
  const [showCharts, setShowCharts] = useState(true)
  const [premiumInsightsFeed, setPremiumInsightsFeed] = useState<string[]>([])
  const [benchmarkMessage, setBenchmarkMessage] = useState<string>('')

  const currencyCode = localStorage.getItem('met_currency') || 'USD'
  const isPremiumUser = userRole === 'PREMIUM' || userRole === 'ADMIN'

  const fetchData = useCallback(async (accountId: string) => {
    try {
      setLoading(true)
      const tasks: Array<Promise<unknown>> = [
        api.getSummary(accountId),
        api.getTransactions(accountId)
      ]
      if (isPremiumUser) {
        tasks.push(api.getInsights(accountId), api.getBenchmark(accountId))
      }

      const [summaryData, transactionsData, insightsData, benchmarkData] = await Promise.all(tasks) as [
        api.TransactionSummary,
        Transaction[],
        api.TransactionInsightResponse | undefined,
        api.TransactionBenchmarkResponse | undefined
      ]

      setSummary(summaryData)
      setTransactions(transactionsData)
      if (insightsData) {
        setPremiumInsightsFeed(insightsData.insights)
      } else {
        setPremiumInsightsFeed([])
      }
      if (benchmarkData?.available && benchmarkData.message) {
        setBenchmarkMessage(benchmarkData.message)
      } else if (benchmarkData?.reason) {
        setBenchmarkMessage(benchmarkData.reason)
      } else {
        setBenchmarkMessage('')
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setPremiumInsightsFeed([])
      setBenchmarkMessage('')
    } finally {
      setLoading(false)
    }
  }, [isPremiumUser])

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
  }, [fetchData])

  useEffect(() => {
    if (!selectedAccountId) return
    localStorage.setItem('met_account_id', selectedAccountId)
    void fetchData(selectedAccountId)
  }, [selectedAccountId, fetchData])

  useEffect(() => {
    setShowCharts(false)
    const timer = window.setTimeout(() => setShowCharts(true), 220)
    return () => window.clearTimeout(timer)
  }, [isSidebarCollapsed])

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
    if (selectedRange === '90D') {
      return { start: startOfDay(daysAgo(89)), end, label: 'last 90 days' }
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

  useEffect(() => {
    if (!isPremiumUser) {
      setBudgetGoals([])
      return
    }

    const monthKey = getMonthValue(rangeBoundaries.end)
    const loadBudgetGoals = async () => {
      try {
        const goals = await categoriesApi.getBudgetGoals(monthKey)
        setBudgetGoals(goals)
      } catch {
        setBudgetGoals([])
      }
    }

    void loadBudgetGoals()
  }, [isPremiumUser, rangeBoundaries.end])

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

  const premiumInsights = useMemo(() => {
    const dayCount = Math.max(1, chartData.length)
    const averageDailyNet = periodTotals.net / dayCount
    const projected30d = summary.totalBalance + averageDailyNet * 30
    const savingsRate = periodTotals.income > 0 ? ((periodTotals.net / periodTotals.income) * 100) : 0

    return {
      averageDailyNet,
      projected30d,
      savingsRate
    }
  }, [chartData.length, periodTotals, summary.totalBalance])

  const categorySpendingTrends = useMemo(() => {
    const totals = new Map<string, { category: string; amount: number; count: number }>()

    for (const transaction of periodTransactions) {
      if (transaction.type !== 'EXPENSE') continue
      const categoryName = transaction.category?.name || 'Uncategorized'
      const existing = totals.get(categoryName) || { category: categoryName, amount: 0, count: 0 }
      existing.amount += transaction.amount
      existing.count += 1
      totals.set(categoryName, existing)
    }

    const rows = [...totals.values()]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)

    const topAmount = rows[0]?.amount || 0
    const totalTracked = rows.reduce((sum, row) => sum + row.amount, 0)

    return rows.map((row) => ({
      ...row,
      share: totalTracked > 0 ? (row.amount / totalTracked) * 100 : 0,
      relativeWidth: topAmount > 0 ? (row.amount / topAmount) * 100 : 0
    }))
  }, [periodTransactions])

  const budgetPerformance = useMemo(() => {
    const spentByCategory = new Map<string, number>()

    for (const transaction of periodTransactions) {
      if (transaction.type !== 'EXPENSE' || !transaction.category?.id) continue
      spentByCategory.set(transaction.category.id, (spentByCategory.get(transaction.category.id) || 0) + transaction.amount)
    }

    return budgetGoals
      .map((goal) => {
        const spent = spentByCategory.get(goal.categoryId) || 0
        const remaining = goal.amount - spent
        const progress = goal.amount > 0 ? (spent / goal.amount) * 100 : 0
        return {
          ...goal,
          spent,
          remaining,
          progress
        }
      })
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 5)
  }, [budgetGoals, periodTransactions])

  const englishInsightsFeed = useMemo(
    () => premiumInsightsFeed.map((line) => normalizeInsightToEnglish(line)),
    [premiumInsightsFeed]
  )

  const englishBenchmarkMessage = useMemo(
    () => normalizeInsightToEnglish(benchmarkMessage),
    [benchmarkMessage]
  )

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="space-y-3">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tighter">Dashboard</h1>
          <p className="text-sm sm:text-base text-slate-400 font-medium">Current balance and movement across selected periods.</p>
        </div>
        {isPremiumUser && (
        <section className="met-card met-card-hover overflow-hidden rounded-[24px] p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#ff9eff]/35 bg-[#ff9eff]/10 px-3 py-1 text-[11px] font-black tracking-[0.22em] text-[#ff9eff]">
                <Gem size={13} />
                PREMIUM ACTIVE
              </div>
              <div className="space-y-1.5">
                <h2 className="max-w-2xl text-xl font-black tracking-tight text-slate-100 sm:text-2xl">
                  Premium analytics are woven into your daily dashboard.
                </h2>
                <p className="max-w-2xl text-sm sm:text-base text-slate-300">
                  Longer-range analysis, forecast signals and richer review tools are now part of the core workspace.
                </p>
              </div>
            </div>
            <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4 lg:w-auto xl:min-w-[28rem]">
              <PremiumPill icon={LineChart} label="90D Range" value="Enabled" />
              <PremiumPill icon={Sparkles} label="Insights" value="Live" />
              <PremiumPill icon={ShieldCheck} label="Plan" value={userRole} />
              <PremiumPill icon={Gem} label="Filters" value="Advanced" />
            </div>
          </div>
        </section>
        )}
        <div className="met-card met-card-hover rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-400">
            <WalletCards size={16} />
            Active account
          </div>
          <select
            id="dashboard-account"
            name="accountId"
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="sm:min-w-56 min-h-11 px-4 py-2.5 border rounded-xl bg-white/5"
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>{account.name}</option>
            ))}
          </select>
          <span className="text-xs text-slate-400">
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

      <section className="met-card met-card-hover rounded-2xl p-5 md:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <CalendarDays className="text-primary" size={20} />
            <h2 className="text-lg font-bold">Period Analysis</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['1D', '7D', '30D', ...(isPremiumUser ? ['90D'] : []), 'YTD', 'ALL', 'CUSTOM'] as RangeKey[]).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setSelectedRange(range)}
                className={`min-h-11 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                  selectedRange === range
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-white/10 text-slate-400 hover:text-slate-100'
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
              <span className="block text-slate-400">Start date</span>
              <input
                id="dashboard-custom-start"
                name="customStartDate"
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full rounded-xl border bg-white/5 px-3 py-2.5"
              />
            </label>
            <label className="text-sm font-semibold space-y-1">
              <span className="block text-slate-400">End date</span>
              <input
                id="dashboard-custom-end"
                name="customEndDate"
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full rounded-xl border bg-white/5 px-3 py-2.5"
              />
            </label>
          </div>
        )}

        <p className="text-sm text-slate-400">
          Showing: <span className="font-semibold text-slate-100">{periodTitle}</span>
        </p>

        {hasInvalidCustomRange && (
          <p className="text-sm font-semibold text-destructive">Start date must be before end date.</p>
        )}
      </section>

      <Suspense fallback={<ChartsSectionSkeleton />}>
        <DashboardCharts
          chartData={chartData}
          loading={loading}
          showCharts={showCharts}
          formatTooltipCurrency={formatTooltipCurrency}
        />
      </Suspense>

      {isPremiumUser ? (
        <section className="met-card met-card-hover overflow-hidden rounded-[24px] p-5 md:p-6 space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#ff9eff]/35 bg-[#ff9eff]/10 px-3 py-1 text-[11px] font-black tracking-[0.22em] text-[#ff9eff]">
                <Gem size={13} />
                PREMIUM INSIGHTS
              </div>
              <h3 className="text-xl font-black tracking-tight text-slate-100">Decision-ready signals for the next move</h3>
              <p className="text-sm text-slate-300">These metrics react to the selected analysis window and help you see momentum, drift and savings quality.</p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-right">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#ff9eff]">Premium Mode</p>
              <p className="text-sm font-semibold text-slate-300">Insights follow your active account and date window.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-white/12 bg-white/5 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Avg Daily Net</p>
              <p className={`mt-2 text-2xl font-black tracking-tight ${premiumInsights.averageDailyNet >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(premiumInsights.averageDailyNet)}
              </p>
              <p className="mt-2 text-sm text-slate-400">Average net movement per day in the active range.</p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-white/5 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">30-Day Projection</p>
              <p className={`mt-2 text-2xl font-black tracking-tight ${premiumInsights.projected30d >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(premiumInsights.projected30d)}
              </p>
              <p className="mt-2 text-sm text-slate-400">Projected balance if the current pace continues.</p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-white/5 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Savings Rate</p>
              <p className={`mt-2 text-2xl font-black tracking-tight ${premiumInsights.savingsRate >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {premiumInsights.savingsRate.toFixed(1)}%
              </p>
              <p className="mt-2 text-sm text-slate-400">Net retained from income inside the chosen period.</p>
            </div>
          </div>
        </section>
      ) : null}

      {isPremiumUser ? (
        <section className="met-card met-card-hover rounded-[24px] p-5 md:p-6 space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3 py-1 text-[11px] font-black tracking-[0.22em] text-slate-300">
                <LineChart size={13} />
                CATEGORY SPENDING TRENDS
              </div>
              <h3 className="text-xl font-black tracking-tight text-slate-100">Where your expense pressure is concentrated</h3>
              <p className="text-sm text-slate-300">Top categories in the active period ranked by total spend.</p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-right">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Expense focus</p>
              <p className="text-sm font-semibold text-slate-100">{periodTitle}</p>
            </div>
          </div>

          {categorySpendingTrends.length === 0 ? (
            <p className="text-sm text-slate-400">No expense categories in the selected period yet.</p>
          ) : (
            <div className="space-y-4">
              {categorySpendingTrends.map((row, index) => (
                <div key={row.category} className="space-y-2 rounded-xl border border-white/12 bg-white/5 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-100">
                        {index + 1}. {row.category}
                      </p>
                      <p className="text-xs text-slate-400">{row.count} transaction(s) in this range</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-100">{formatCurrency(row.amount)}</p>
                      <p className="text-xs text-slate-400">{row.share.toFixed(1)}% of top tracked spend</p>
                    </div>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#f59e0b,#f97316)]"
                      style={{ width: `${Math.max(10, row.relativeWidth)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {isPremiumUser ? (
        <section className="met-card met-card-hover rounded-[24px] p-5 md:p-6 space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3 py-1 text-[11px] font-black tracking-[0.22em] text-slate-300">
                <Gem size={13} />
                BUDGET VS ACTUAL
              </div>
              <h3 className="text-xl font-black tracking-tight text-slate-100">Are your category budgets still intact?</h3>
              <p className="text-sm text-slate-300">Budget goals are loaded for the month tied to the active analysis window.</p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-right">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Budget month</p>
              <p className="text-sm font-semibold text-slate-100">{getMonthValue(rangeBoundaries.end)}</p>
            </div>
          </div>

          {budgetPerformance.length === 0 ? (
            <p className="text-sm text-slate-400">No monthly category budgets are set for this period yet. Add them from Categories.</p>
          ) : (
            <div className="space-y-4">
              {budgetPerformance.map((goal) => (
                <div key={goal.id} className="space-y-2 rounded-xl border border-white/12 bg-white/5 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-100">{goal.category.name}</p>
                      <p className="text-xs text-slate-400">
                        Budget {formatCurrency(goal.amount)} • Spent {formatCurrency(goal.spent)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-black ${goal.remaining >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {goal.remaining >= 0 ? `${formatCurrency(goal.remaining)} left` : `${formatCurrency(Math.abs(goal.remaining))} over`}
                      </p>
                      <p className="text-xs text-slate-400">{goal.progress.toFixed(1)}% used</p>
                    </div>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full ${goal.progress > 100 ? 'bg-rose-500' : goal.progress > 85 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, Math.max(8, goal.progress))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {isPremiumUser && (
        <section className="met-card met-card-hover rounded-[24px] p-5 md:p-6 space-y-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3 py-1 text-[11px] font-black tracking-[0.22em] text-slate-300">
              <Sparkles size={13} />
              SMART RECOMMENDATIONS
            </div>
            <h3 className="text-xl font-black tracking-tight text-slate-100">Smart recommendations</h3>
            <p className="text-sm text-slate-100/80">Generated from your recent transaction patterns.</p>
          </div>
          {englishInsightsFeed.length === 0 ? (
            <p className="text-sm text-slate-100/80">No recommendation signals yet.</p>
          ) : (
            <div className="space-y-2">
              {englishInsightsFeed.map((line, idx) => (
                <p key={`${idx}-${line}`} className="rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm font-medium text-slate-100">
                  {line}
                </p>
              ))}
            </div>
          )}
          {englishBenchmarkMessage ? (
            <div className="rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm font-medium text-slate-100">
              Benchmark: {englishBenchmarkMessage}
            </div>
          ) : null}
        </section>
      )}

      <section className="met-card met-card-hover rounded-2xl p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Recent Activity (Snapshot)</h3>
          <span className="text-xs text-slate-400">Less critical detail</span>
        </div>
        {recentTransactions.length === 0 ? (
          <p className="text-sm text-slate-400">No transactions in selected period.</p>
        ) : (
          <div className="divide-y">
            {recentTransactions.map((tx) => (
              <div key={tx.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{tx.description || tx.category?.name || 'Transaction'}</p>
                  <p className="text-xs text-slate-400 truncate">
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

function getMonthValue(date: Date) {
  return getDateInputValue(date).slice(0, 7)
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function normalizeInsightToEnglish(input: string) {
  if (!input) return input

  let text = input.trim()
  const replacements: Array<[RegExp, string]> = [
    [/\bpreporuka\b/gi, 'recommendation'],
    [/\bpotrosnja\b/gi, 'spending'],
    [/\bpotrošnja\b/gi, 'spending'],
    [/\btroskovi\b/gi, 'costs'],
    [/\btroškovi\b/gi, 'costs'],
    [/\busted(a|e|i|u)?\b/gi, 'savings'],
    [/\bušted(a|e|i|u)?\b/gi, 'savings'],
    [/\bkategorija\b/gi, 'category'],
    [/\bkategorije\b/gi, 'categories'],
    [/\bbudzet\b/gi, 'budget'],
    [/\bbudžet\b/gi, 'budget'],
    [/\btransakcija\b/gi, 'transaction'],
    [/\btransakcije\b/gi, 'transactions'],
    [/\bracun\b/gi, 'account'],
    [/\bračun\b/gi, 'account'],
    [/\bdana\b/gi, 'days'],
    [/\bmesec\b/gi, 'month'],
    [/\bmesečno\b/gi, 'monthly'],
    [/\bsledecih\b/gi, 'next'],
    [/\bsledećih\b/gi, 'next'],
    [/\bukupno\b/gi, 'total'],
    [/\bprosecno\b/gi, 'average'],
    [/\bprosečno\b/gi, 'average'],
    [/\bprihod\b/gi, 'income'],
    [/\brashod\b/gi, 'expense'],
    [/\brashodi\b/gi, 'expenses'],
    [/\biznad\b/gi, 'above'],
    [/\bispod\b/gi, 'below'],
    [/\bpovec(a|an|ati|anje)\b/gi, 'increase'],
    [/\bpoveć(a|an|ati|anje)\b/gi, 'increase'],
    [/\bsmanj(i|en|iti|enje)\b/gi, 'decrease'],
    [/\bsmanj(i|en|iti|enje)\b/gi, 'decrease']
  ]

  for (const [pattern, value] of replacements) {
    text = text.replace(pattern, value)
  }

  const hasSerbianArtifacts = /[čćžšđČĆŽŠĐ]|Å|Ä|preporuk|potro|trošk|troÅ|uÅ|kategorij|budž|budÅ|račun|raÄ|slede|prose|iznos|datum|opis|vrednost|rashod|prihod/i.test(text)
  if (!hasSerbianArtifacts) {
    return text
  }

  const lower = input.toLowerCase()
  if (/budz|budž|budget|limit|preko|over|remaining|left/.test(lower)) {
    return 'Budget alert: spending is approaching or exceeding plan limits.'
  }
  if (/kategor|category|potros|potroš|spend/.test(lower)) {
    return 'Category insight: review top spending categories and rebalance your budget.'
  }
  if (/prihod|income|rashod|expense|cash|flow/.test(lower)) {
    return 'Cash flow insight: monitor income versus expenses to keep a healthy net balance.'
  }

  return 'Recommendation: review recent trends and adjust your plan for better results.'
}

const StatCard = ({ title, amount, icon: Icon, color, glow = false }: { title: string; amount: string; icon: ComponentType<{ size?: number; className?: string }>; color: string; glow?: boolean }) => (
  <div className="met-card met-card-hover rounded-2xl p-4 sm:p-6 flex flex-col justify-between gap-3 sm:gap-4">
    <div className="flex items-center justify-between text-slate-400">
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

const ChartsSectionSkeleton = () => (
  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 min-w-0">
    <div className="met-card rounded-2xl p-5 md:p-6 min-w-0">
      <div className="h-6 w-40 rounded-md bg-white/10 mb-4" />
      <div className="h-64 sm:h-72 min-h-[16rem] sm:min-h-[18rem] min-w-0 rounded-xl bg-white/10 animate-pulse" />
    </div>
    <div className="met-card rounded-2xl p-5 md:p-6 min-w-0">
      <div className="h-6 w-44 rounded-md bg-white/10 mb-4" />
      <div className="h-64 sm:h-72 min-h-[16rem] sm:min-h-[18rem] min-w-0 rounded-xl bg-white/10 animate-pulse" />
    </div>
  </div>
)

const PremiumPill = ({
  icon: Icon,
  label,
  value
}: {
  icon: ComponentType<{ size?: number; className?: string }>
  label: string
  value: string
}) => (
  <div className="rounded-2xl border border-white/12 bg-white/5 px-3 py-3 text-slate-100">
    <div className="flex items-center gap-2">
      <Icon size={15} className="text-[#ff9eff]" />
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</span>
    </div>
    <p className="mt-2 text-sm font-black tracking-tight">{value}</p>
  </div>
)

export default memo(Dashboard)





