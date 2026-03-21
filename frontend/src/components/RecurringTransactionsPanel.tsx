import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { CalendarClock, Gem, Lock, PauseCircle, PlayCircle, Plus, Repeat2, Sparkles, Trash2 } from 'lucide-react'
import type { Account } from '../api/accountsApi'
import type { Category } from '../api/categoriesApi'
import type { RecurringFrequency, RecurringTransaction, RecurringTransactionPayload, TransactionType } from '../api/transactionsApi'

type UserRole = 'BASIC' | 'PREMIUM' | 'ADMIN'

interface RecurringTransactionsPanelProps {
  accounts: Account[]
  categories: Category[]
  currencyCode: string
  isPremiumUser: boolean
  loading: boolean
  recurringTransactions: RecurringTransaction[]
  userRole: UserRole
  onCreate: (data: RecurringTransactionPayload) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onRunDue: () => Promise<void>
  onUpdate: (id: string, data: Partial<RecurringTransactionPayload>) => Promise<void>
}

const getToday = () => new Date().toISOString().slice(0, 10)

function RecurringTransactionsPanel({
  accounts,
  categories,
  currencyCode,
  isPremiumUser,
  loading,
  recurringTransactions,
  userRole,
  onCreate,
  onDelete,
  onRunDue,
  onUpdate
}: RecurringTransactionsPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<TransactionType>('EXPENSE')
  const [categoryId, setCategoryId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [frequency, setFrequency] = useState<RecurringFrequency>('MONTHLY')
  const [startDate, setStartDate] = useState(getToday())
  const [endDate, setEndDate] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!accountId && accounts[0]?.id) {
      setAccountId(accounts[0].id)
    }
  }, [accountId, accounts])

  const flatCategories = useMemo(
    () => categories.flatMap((category) => [category, ...(category.subcategories || [])]),
    [categories]
  )

  const filteredCategories = useMemo(
    () => flatCategories.filter((category) => category.type === type),
    [flatCategories, type]
  )

  const dueCount = useMemo(() => {
    const today = new Date(getToday())
    return recurringTransactions.filter((item) => item.isActive && new Date(item.nextRunDate) <= today).length
  }, [recurringTransactions])

  const activeCount = recurringTransactions.filter((item) => item.isActive).length

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(value)

  const resetForm = () => {
    setEditingId(null)
    setAmount('')
    setDescription('')
    setType('EXPENSE')
    setCategoryId('')
    setAccountId(accounts[0]?.id || '')
    setFrequency('MONTHLY')
    setStartDate(getToday())
    setEndDate('')
    setIsActive(true)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!amount || !categoryId) return

    setSubmitting(true)
    try {
      const payload: RecurringTransactionPayload = {
        amount,
        description,
        type,
        categoryId,
        accountId: accountId || undefined,
        frequency,
        startDate,
        endDate: endDate || undefined,
        isActive
      }

      if (editingId) {
        await onUpdate(editingId, payload)
      } else {
        await onCreate(payload)
      }
      resetForm()
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (item: RecurringTransaction) => {
    setEditingId(item.id)
    setAmount(item.amount.toString())
    setDescription(item.description || '')
    setType(item.type)
    setCategoryId(item.categoryId)
    setAccountId(item.accountId || accounts[0]?.id || '')
    setFrequency(item.frequency)
    setStartDate(item.startDate.slice(0, 10))
    setEndDate(item.endDate ? item.endDate.slice(0, 10) : '')
    setIsActive(item.isActive)
  }

  if (!isPremiumUser) {
    return (
      <section className="met-card overflow-hidden rounded-[28px] p-5 md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-black tracking-[0.22em] text-slate-300">
              <Lock size={13} />
              LOCKED RECURRING PREVIEW
            </div>
            <h3 className="text-xl font-black tracking-tight text-slate-100 sm:text-2xl">Recurring plans keep routine cash flow on rails.</h3>
            <p className="max-w-2xl text-sm text-slate-300">
              Premium lets you define salary, rent, subscriptions and other repeating entries once, then generate due transactions on demand.
            </p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-3 lg:w-auto xl:min-w-[34rem]">
            <PreviewCard title="Monthly salary" subtitle="Auto-ready on the first day of the month." />
            <PreviewCard title="Bills cadence" subtitle="Track weekly or monthly obligations before they slip." />
            <PreviewCard title="Due batch run" subtitle="Generate every overdue recurring entry in one click." />
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="met-card met-card-hover overflow-hidden rounded-[28px] p-5 md:p-6">
      <div className="flex flex-col gap-5 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ff9eff]/35 bg-[#ff9eff]/10 px-3 py-1 text-[11px] font-black tracking-[0.22em] text-[#ff9eff]">
            <Repeat2 size={13} />
            RECURRING ENGINE
          </div>
          <h3 className="text-2xl font-black tracking-tight text-slate-100">Routine money movement, already staged.</h3>
          <p className="max-w-2xl text-sm text-slate-300">
            Set repeating templates for income or expenses, then push due entries into the ledger when you are ready to review them.
          </p>
        </div>
        <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4 lg:w-auto xl:min-w-[32rem]">
          <SignalCard icon={Repeat2} label="Templates" value={String(recurringTransactions.length)} />
          <SignalCard icon={PlayCircle} label="Due Now" value={String(dueCount)} />
          <SignalCard icon={Sparkles} label="Active" value={String(activeCount)} />
          <SignalCard icon={Gem} label="Plan" value={userRole} />
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
        <form onSubmit={handleSubmit} className="rounded-[24px] border border-white/12 bg-white/5 p-4 backdrop-blur">
          <div className="flex flex-col gap-3 border-b border-white/10 pb-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black tracking-[0.18em] text-slate-400">
                {editingId ? 'EDIT TEMPLATE' : 'NEW TEMPLATE'}
              </p>
              <p className="mt-1 text-sm text-slate-300">Best for salary, rent, subscriptions, savings transfers or any predictable flow.</p>
            </div>
            <button
              type="button"
              onClick={onRunDue}
              disabled={loading || dueCount === 0}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#ff9eff]/35 bg-[#ff9eff]/10 px-4 py-2.5 text-sm font-bold text-[#ff9eff] transition hover:bg-[#ff9eff]/18 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PlayCircle size={15} />
              Run Due Items
            </button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Amount</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                className="w-full min-h-12 rounded-2xl border border-white/12 bg-white/5 px-4 text-sm outline-none transition focus:border-[#ff9eff]/55 focus:bg-white/8 focus:ring-4 focus:ring-[#ff9eff]/20 text-slate-100 placeholder:text-slate-500"
                required
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Frequency</span>
              <select
                value={frequency}
                onChange={(event) => setFrequency(event.target.value as RecurringFrequency)}
                className="w-full min-h-12 rounded-2xl border border-white/12 bg-white/5 px-4 text-sm font-semibold outline-none transition focus:border-[#ff9eff]/55 focus:bg-white/8 focus:ring-4 focus:ring-[#ff9eff]/20 text-slate-100"
              >
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Type</span>
              <div className="grid grid-cols-2 rounded-2xl border border-white/12 bg-white/5 p-1">
                <button
                  type="button"
                  onClick={() => setType('EXPENSE')}
                  className={`min-h-10 rounded-xl text-sm font-bold transition ${type === 'EXPENSE' ? 'bg-white/90 text-rose-400 shadow-sm' : 'text-slate-400'}`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setType('INCOME')}
                  className={`min-h-10 rounded-xl text-sm font-bold transition ${type === 'INCOME' ? 'bg-white/90 text-emerald-400 shadow-sm' : 'text-slate-400'}`}
                >
                  Income
                </button>
              </div>
            </label>
            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Account</span>
              <select
                value={accountId}
                onChange={(event) => setAccountId(event.target.value)}
                className="w-full min-h-12 rounded-2xl border border-white/12 bg-white/5 px-4 text-sm outline-none transition focus:border-[#ff9eff]/55 focus:bg-white/8 focus:ring-4 focus:ring-[#ff9eff]/20 text-slate-100"
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>{account.name}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Category</span>
              <select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className="w-full min-h-12 rounded-2xl border border-white/12 bg-white/5 px-4 text-sm outline-none transition focus:border-[#ff9eff]/55 focus:bg-white/8 focus:ring-4 focus:ring-[#ff9eff]/20 text-slate-100"
                required
              >
                <option value="">Select category</option>
                {filteredCategories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Description</span>
              <input
                type="text"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional note shown on generated transactions"
                className="w-full min-h-12 rounded-2xl border border-white/12 bg-white/5 px-4 text-sm outline-none transition focus:border-[#ff9eff]/55 focus:bg-white/8 focus:ring-4 focus:ring-[#ff9eff]/20 text-slate-100 placeholder:text-slate-500"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Start date</span>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-full min-h-12 rounded-2xl border border-white/12 bg-white/5 px-4 text-sm outline-none transition focus:border-[#ff9eff]/55 focus:bg-white/8 focus:ring-4 focus:ring-[#ff9eff]/20 text-slate-100"
                required
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">End date</span>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="w-full min-h-12 rounded-2xl border border-white/12 bg-white/5 px-4 text-sm outline-none transition focus:border-[#ff9eff]/55 focus:bg-white/8 focus:ring-4 focus:ring-[#ff9eff]/20 text-slate-100"
              />
            </label>
          </div>

          {editingId ? (
            <label className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3 py-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
              />
              Template active
            </label>
          ) : null}

          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-400">
              Due items are created as real transactions with recurring metadata for easier review later.
            </div>
            <div className="flex gap-2">
              {editingId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-white/10"
                >
                  Cancel edit
                </button>
              ) : null}
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#ff9eff] px-5 py-2.5 text-sm font-bold text-[#1c0d32] transition hover:opacity-90 disabled:opacity-60"
              >
                <Plus size={15} />
                {submitting ? 'Saving...' : editingId ? 'Update template' : 'Create template'}
              </button>
            </div>
          </div>
        </form>

        <div className="rounded-[24px] border border-white/12 bg-white/5 p-4 backdrop-blur">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <p className="text-sm font-black tracking-[0.18em] text-slate-400">LIVE TEMPLATES</p>
              <p className="mt-1 text-sm text-slate-300">Active templates keep next run dates and last execution timestamps in view.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-bold text-slate-300">
              <CalendarClock size={13} />
              {loading ? 'Loading...' : `${recurringTransactions.length} total`}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {recurringTransactions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 bg-white/4 p-5 text-sm text-slate-400">
                No recurring templates yet. Start with salary, rent or any subscription that keeps showing up every month.
              </div>
            ) : (
              recurringTransactions.map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/12 bg-white/5 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-bold text-slate-100">{item.description || item.category?.name || 'Recurring template'}</p>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-black tracking-[0.16em] ${item.isActive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-slate-300'}`}>
                          {item.isActive ? 'ACTIVE' : 'PAUSED'}
                        </span>
                        <span className="rounded-full bg-[#ff9eff]/12 px-2.5 py-1 text-[11px] font-black tracking-[0.16em] text-[#ff9eff]">
                          {item.frequency}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-300">
                        <span>{formatCurrency(item.amount)}</span>
                        <span>{item.account?.name || 'No account'}</span>
                        <span>{item.category?.name || 'No category'}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-400">
                        <span>Starts {formatDate(item.startDate)}</span>
                        <span>Next run {formatDate(item.nextRunDate)}</span>
                        <span>{item.lastRunAt ? `Last run ${formatDate(item.lastRunAt)}` : 'Not run yet'}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onUpdate(item.id, { isActive: !item.isActive })}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/5 px-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10"
                      >
                        {item.isActive ? <PauseCircle size={15} /> : <PlayCircle size={15} />}
                        {item.isActive ? 'Pause' : 'Resume'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(item)}
                        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(item.id)}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-rose-400/35 bg-rose-500/10 px-3 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/15"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const SignalCard = ({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Repeat2
  label: string
  value: string
}) => (
  <div className="rounded-2xl border border-white/12 bg-white/5 px-3 py-3">
    <div className="flex items-center gap-2">
      <Icon size={15} className="text-[#ff9eff]" />
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</span>
    </div>
    <p className="mt-2 text-sm font-black tracking-tight text-slate-100">{value}</p>
  </div>
)

const PreviewCard = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="rounded-2xl border border-white/12 bg-white/5 p-4">
    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{title}</p>
    <p className="mt-3 text-sm text-slate-300">{subtitle}</p>
  </div>
)

export default RecurringTransactionsPanel

