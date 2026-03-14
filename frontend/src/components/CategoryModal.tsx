import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { notify } from '../lib/toast'
import { CATEGORY_ICON_OPTIONS, renderCategoryIcon, type CategoryIconKey } from '../lib/categoryIcons'

interface Category {
  id: string
  name: string
  icon: string
  type: 'INCOME' | 'EXPENSE'
  parentId: string | null
}

interface CategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: { name: string; icon: string; type: string; parentId: string | null }) => Promise<void>
  initialData?: Category | null
  parentId?: string | null
  type?: 'INCOME' | 'EXPENSE'
}

function CategoryModal({ isOpen, onClose, onSave, initialData, parentId, type }: CategoryModalProps) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState<CategoryIconKey>('Tag')
  const [selectedType, setSelectedType] = useState<'INCOME' | 'EXPENSE'>(type || 'EXPENSE')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (initialData) {
      setName(initialData.name)
      setIcon((initialData.icon as CategoryIconKey) || 'Tag')
      setSelectedType(initialData.type)
    } else {
      setName('')
      setIcon('Tag')
      setSelectedType(type || 'EXPENSE')
    }
  }, [initialData, type, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSubmitting(true)
    try {
      await onSave({
        name,
        icon,
        type: selectedType,
        parentId: initialData ? initialData.parentId : (parentId || null)
      })
      onClose()
    } catch (error) {
      console.error('Failed to save category:', error)
      notify.error('Failed to save category.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg sm:text-xl font-bold">
            {initialData ? 'Edit Category' : parentId ? 'Add Subcategory' : 'Add Category'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 sm:space-y-6">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Category Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Groceries, Freelance..."
              autoFocus
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-primary/40 outline-none transition-all"
              required
            />
          </div>

          {!parentId && !initialData?.parentId && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedType('INCOME')}
                  className={`py-2 rounded-xl border font-medium transition-all ${
                    selectedType === 'INCOME' 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400' 
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  Income
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedType('EXPENSE')}
                  className={`py-2 rounded-xl border font-medium transition-all ${
                    selectedType === 'EXPENSE' 
                      ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-400' 
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  Expense
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Icon
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {CATEGORY_ICON_OPTIONS.map((option) => {
                const active = option.key === icon
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setIcon(option.key)}
                    className={`px-2 py-2 rounded-xl border transition-all flex flex-col items-center gap-1 ${
                      active
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                    title={option.label}
                  >
                    {renderCategoryIcon(option.key, 16)}
                    <span className="text-[10px] font-semibold leading-none">{option.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary hover:opacity-90 text-primary-foreground font-bold py-3 rounded-xl transition-all shadow-lg shadow-primary/20 active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : initialData ? 'Update Category' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CategoryModal
