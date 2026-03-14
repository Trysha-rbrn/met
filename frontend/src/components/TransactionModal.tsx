import React, { useState, useEffect } from 'react'
import { X, Calendar, Coins, FileText, WalletCards, CheckCircle2 } from 'lucide-react'
import * as categoryApi from '../api/categoriesApi'
import type { Transaction, TransactionPayload, TransactionType } from '../api/transactionsApi'
import type { Account } from '../api/accountsApi'
import { notify } from '../lib/toast'

interface Category {
  id: string
  name: string
  type: 'INCOME' | 'EXPENSE'
  subcategories?: Category[]
}

interface TransactionModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: TransactionPayload) => Promise<void>
  initialData?: Transaction | null
  accounts: Account[]
  defaultAccountId?: string
}

function TransactionModal({ isOpen, onClose, onSave, initialData, accounts, defaultAccountId }: TransactionModalProps) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [type, setType] = useState<TransactionType>('EXPENSE')
  const [categoryId, setCategoryId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchCategories()
    }
  }, [isOpen])

  useEffect(() => {
    if (initialData) {
      setAmount(initialData.amount.toString())
      setDescription(initialData.description || '')
      setDate(new Date(initialData.date).toISOString().split('T')[0])
      setType(initialData.type)
      setCategoryId(initialData.categoryId || '')
      setAccountId(initialData.accountId || defaultAccountId || accounts[0]?.id || '')
    } else {
      setAmount('')
      setDescription('')
      setDate(new Date().toISOString().split('T')[0])
      setType('EXPENSE')
      setCategoryId('')
      setAccountId(defaultAccountId || accounts[0]?.id || '')
    }
  }, [initialData, isOpen, accounts, defaultAccountId])

  const fetchCategories = async () => {
    try {
      const data = await categoryApi.getCategories()
      setCategories(data)
    } catch (error) {
      console.error('Error fetching categories:', error)
      notify.error('Failed to load categories.')
    }
  }

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || !categoryId || !accountId) return

    setIsSubmitting(true)
    try {
      await onSave({
        amount,
        description,
        date,
        type,
        categoryId,
        accountId,
        metadata: { source: 'web-app', author: 'Trysha-rbrn' }
      })
      onClose()
    } catch (error) {
      console.error('Failed to save transaction:', error)
      notify.error('Failed to save transaction.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredCategories = categories.filter((c) => c.type === type)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-md">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 shadow-[0_30px_80px_-35px_rgba(15,23,42,0.6)] animate-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between gap-4 px-5 sm:px-7 py-5 sm:py-6 border-b border-slate-200/70 dark:border-slate-800/80">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              {initialData ? 'Edit Transaction' : 'Create Transaction'}
            </h2>
            <p className="text-sm text-muted-foreground">
              Save income and expenses with account and category context.
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-5 sm:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <WalletCards size={15} /> Account
              </span>
              <select
                id="transaction-account"
                name="accountId"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                required
              >
                <option value="">Select account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>{account.name}</option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Coins size={15} /> Amount
              </span>
              <input
                id="transaction-amount"
                name="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                required
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Calendar size={15} /> Date
              </span>
              <input
                id="transaction-date"
                name="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-muted-foreground">Type</span>
              <div className="grid grid-cols-2 p-1 rounded-xl bg-muted/70 border">
                <button
                  type="button"
                  onClick={() => setType('EXPENSE')}
                  className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                    type === 'EXPENSE' ? 'bg-white dark:bg-slate-800 text-rose-600 shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setType('INCOME')}
                  className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                    type === 'INCOME' ? 'bg-white dark:bg-slate-800 text-emerald-600 shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  Income
                </button>
              </div>
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-muted-foreground">Category</span>
            <select
              id="transaction-category"
              name="categoryId"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 outline-none"
              required
            >
              <option value="">Select category</option>
              {filteredCategories.map((cat) => (
                <React.Fragment key={cat.id}>
                  <option value={cat.id}>{cat.name}</option>
                  {cat.subcategories?.map((sub) => (
                    <option key={sub.id} value={sub.id}>&nbsp;&nbsp;- {sub.name}</option>
                  ))}
                </React.Fragment>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <FileText size={15} /> Description
            </span>
            <textarea
              id="transaction-description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional note about this transaction"
              rows={3}
              className="w-full px-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 outline-none resize-none"
            />
          </label>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border font-semibold hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <CheckCircle2 size={17} />
              {isSubmitting ? 'Saving...' : initialData ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TransactionModal
