import React, { useState, useEffect } from 'react'
import { X, Calendar, DollarSign, FileText } from 'lucide-react'
import * as categoryApi from '../api/categoriesApi'

interface Category {
  id: string
  name: string
  type: 'INCOME' | 'EXPENSE'
  subcategories?: Category[]
}

interface TransactionModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => Promise<void>
  initialData?: any
}

function TransactionModal({ isOpen, onClose, onSave, initialData }: TransactionModalProps) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE')
  const [categoryId, setCategoryId] = useState('')
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
      setCategoryId(initialData.categoryId)
    } else {
      setAmount('')
      setDescription('')
      setDate(new Date().toISOString().split('T')[0])
      setType('EXPENSE')
      setCategoryId('')
    }
  }, [initialData, isOpen])

  const fetchCategories = async () => {
    try {
      const data = await categoryApi.getCategories()
      setCategories(data)
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || !categoryId) return

    setIsSubmitting(true)
    try {
      await onSave({
        amount,
        description,
        date,
        type,
        categoryId,
        metadata: { source: 'web-app', author: 'Trysha-rbrn' }
      })
      onClose()
    } catch (error) {
      console.error('Failed to save transaction:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredCategories = categories.filter(c => c.type === type)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold">
            {initialData ? 'Edit Transaction' : 'New Transaction'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Type Toggle */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-950 rounded-xl">
            <button
              type="button"
              onClick={() => setType('EXPENSE')}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                type === 'EXPENSE' 
                  ? 'bg-white dark:bg-slate-800 text-rose-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setType('INCOME')}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                type === 'INCOME' 
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Income
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Amount */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <DollarSign size={14} /> Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                required
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Calendar size={14} /> Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                required
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              required
            >
              <option value="">Select a category</option>
              {filteredCategories.map(cat => (
                <React.Fragment key={cat.id}>
                  <option value={cat.id} className="font-bold">{cat.name}</option>
                  {cat.subcategories?.map(sub => (
                    <option key={sub.id} value={sub.id}>&nbsp;&nbsp;— {sub.name}</option>
                  ))}
                </React.Fragment>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <FileText size={14} /> Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What was this for?"
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? 'Processing...' : initialData ? 'Update Transaction' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TransactionModal
