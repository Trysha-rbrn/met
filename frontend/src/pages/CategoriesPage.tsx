import { useMemo, useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, ChevronRight, ChevronDown, Tag, Gem, Target, CalendarDays } from 'lucide-react'
import * as api from '../api/categoriesApi'
import type { BudgetGoal, Category, CategoryRule } from '../api/categoriesApi'
import CategoryModal from '../components/CategoryModal'
import { notify } from '../lib/toast'
import { renderCategoryIcon } from '../lib/categoryIcons'

type UserRole = 'BASIC' | 'PREMIUM' | 'ADMIN'

interface CategoriesPageProps {
  userRole: UserRole
}

function CategoriesPage({ userRole }: CategoriesPageProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [budgetGoals, setBudgetGoals] = useState<BudgetGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [budgetLoading, setBudgetLoading] = useState(false)
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({})
  const [selectedBudgetMonth, setSelectedBudgetMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [categoryRules, setCategoryRules] = useState<CategoryRule[]>([])
  const [newRuleKeyword, setNewRuleKeyword] = useState('')
  const [newRuleCategoryId, setNewRuleCategoryId] = useState('')
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalInitialData, setModalInitialData] = useState<Category | null>(null)
  const [modalParentId, setModalParentId] = useState<string | null>(null)
  const [modalDefaultType, setModalDefaultType] = useState<'INCOME' | 'EXPENSE' | undefined>()
  const isPremiumUser = userRole === 'PREMIUM' || userRole === 'ADMIN'

  useEffect(() => {
    void fetchCategories()
  }, [])

  useEffect(() => {
    if (!isPremiumUser) {
      setBudgetGoals([])
      setCategoryRules([])
      return
    }

    void fetchBudgetGoals(selectedBudgetMonth)
    void fetchCategoryRules()
  }, [isPremiumUser, selectedBudgetMonth])

  const fetchCategories = async () => {
    try {
      const data = await api.getCategories()
      setCategories(data)
    } catch (error) {
      console.error('Error fetching categories:', error)
      notify.error('Failed to load categories.')
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedCats(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleAddCategory = () => {
    setModalInitialData(null)
    setModalParentId(null)
    setModalDefaultType(undefined)
    setIsModalOpen(true)
  }

  const handleAddSubcategory = (parent: Category) => {
    setModalInitialData(null)
    setModalParentId(parent.id)
    setModalDefaultType(parent.type)
    setIsModalOpen(true)
  }

  const handleEdit = (category: Category) => {
    setModalInitialData(category)
    setModalParentId(category.parentId)
    setModalDefaultType(category.type)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this category? All subcategories will also be deleted.')) {
      try {
        await api.deleteCategory(id)
        notify.success('Category deleted.')
        fetchCategories()
      } catch (error) {
        console.error('Error deleting category:', error)
        notify.error('Failed to delete category.')
      }
    }
  }

  const fetchBudgetGoals = async (month: string) => {
    try {
      setBudgetLoading(true)
      const data = await api.getBudgetGoals(month)
      setBudgetGoals(data)
    } catch (error) {
      console.error('Error fetching budget goals:', error)
      notify.error('Failed to load category budgets.')
    } finally {
      setBudgetLoading(false)
    }
  }

  const fetchCategoryRules = async () => {
    try {
      const rules = await api.getCategoryRules()
      setCategoryRules(rules)
    } catch {
      setCategoryRules([])
    }
  }

  const handleSaveCategory = async (data: { name: string; icon: string; type: string; parentId: string | null }) => {
    try {
      if (modalInitialData) {
        await api.updateCategory(modalInitialData.id, data)
        notify.success('Category updated.')
      } else {
        await api.createCategory(data)
        notify.success('Category created.')
      }
      fetchCategories()
    } catch (error) {
      console.error('Error saving category:', error)
      throw error
    }
  }

  const expenseCategoryOptions = useMemo(
    () => categories.filter((category) => category.type === 'EXPENSE'),
    [categories]
  )

  const budgetMap = useMemo(
    () => new Map(budgetGoals.map((goal) => [goal.categoryId, goal])),
    [budgetGoals]
  )

  const handleSetBudgetGoal = async (category: Category) => {
    const existing = budgetMap.get(category.id)
    const suggestedAmount = existing?.amount ? String(existing.amount) : ''
    const input = window.prompt(`Set monthly budget for ${category.name}`, suggestedAmount)
    if (input === null) return

    const amount = Number(input)
    if (!Number.isFinite(amount) || amount <= 0) {
      notify.warning('Budget amount must be a positive number.')
      return
    }

    try {
      if (existing) {
        await api.updateBudgetGoal(existing.id, amount)
        notify.success('Budget updated.')
      } else {
        await api.createBudgetGoal({ categoryId: category.id, month: selectedBudgetMonth, amount })
        notify.success('Budget created.')
      }
      await fetchBudgetGoals(selectedBudgetMonth)
    } catch (error) {
      console.error('Error saving budget goal:', error)
      notify.error('Failed to save budget.')
    }
  }

  const handleDeleteBudgetGoal = async (goal: BudgetGoal) => {
    if (!window.confirm(`Delete monthly budget for ${goal.category.name}?`)) return

    try {
      await api.deleteBudgetGoal(goal.id)
      notify.success('Budget deleted.')
      await fetchBudgetGoals(selectedBudgetMonth)
    } catch (error) {
      console.error('Error deleting budget goal:', error)
      notify.error('Failed to delete budget.')
    }
  }

  const handleCreateCategoryRule = async () => {
    const keyword = newRuleKeyword.trim().toLowerCase()
    if (!keyword) {
      notify.warning('Enter a keyword.')
      return
    }
    if (!newRuleCategoryId) {
      notify.warning('Choose a category.')
      return
    }

    try {
      await api.createCategoryRule({ keyword, categoryId: newRuleCategoryId, isActive: true })
      notify.success('Rule created.')
      setNewRuleKeyword('')
      await fetchCategoryRules()
    } catch {
      notify.error('Failed to create rule.')
    }
  }

  const handleToggleRule = async (rule: CategoryRule) => {
    try {
      await api.updateCategoryRule(rule.id, { isActive: !rule.isActive })
      await fetchCategoryRules()
    } catch {
      notify.error('Failed to update rule.')
    }
  }

  const handleDeleteRule = async (ruleId: string) => {
    if (!window.confirm('Delete this auto-categorization rule?')) return
    try {
      await api.deleteCategoryRule(ruleId)
      notify.success('Rule deleted.')
      await fetchCategoryRules()
    } catch {
      notify.error('Failed to delete rule.')
    }
  }

  if (loading) return <div className="p-8 text-center">Loading categories...</div>

  const incomeCats = categories.filter(c => c.type === 'INCOME')
  const expenseCats = categories.filter(c => c.type === 'EXPENSE')

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Categories</h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">Manage your income and expense categories.</p>
        </div>
        <button 
          onClick={handleAddCategory}
          className="w-full sm:w-auto min-h-11 flex items-center justify-center gap-2 bg-primary hover:opacity-90 text-primary-foreground px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 active:scale-95"
        >
          <Plus size={20} />
          Add Category
        </button>
      </header>

      {isPremiumUser ? (
        <section className="rounded-[24px] border border-amber-200/70 bg-[linear-gradient(135deg,rgba(255,251,235,0.96),rgba(255,255,255,0.98))] p-5 md:p-6 space-y-4 dark:border-amber-500/30 dark:bg-[linear-gradient(135deg,rgba(41,37,36,0.94),rgba(17,24,39,0.96))]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-black tracking-[0.22em] text-amber-800 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-200">
                <Gem size={13} />
                MONTHLY BUDGET GOALS
              </div>
              <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">Set category targets before the month runs away</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">Budget goals are available for expense categories and feed premium dashboard analysis.</p>
            </div>
            <label className="space-y-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-2"><CalendarDays size={15} /> Budget month</span>
              <input
                type="month"
                value={selectedBudgetMonth}
                onChange={(e) => setSelectedBudgetMonth(e.target.value)}
                className="min-h-11 rounded-2xl border border-amber-200 bg-white px-4 py-2.5 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-200/40 dark:border-amber-500/35 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-amber-500/20"
              />
            </label>
          </div>

          {budgetLoading ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading budget goals...</p>
          ) : expenseCategoryOptions.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Create at least one expense category to start budgeting.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {expenseCategoryOptions.map((category) => {
                const goal = budgetMap.get(category.id)
                return (
                  <div key={category.id} className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/85">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">{category.name}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-2">
                          <CategoryIcon icon={category.icon} small />
                          Expense category
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSetBudgetGoal(category)}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                      >
                        <Target size={15} />
                        {goal ? 'Edit' : 'Set'}
                      </button>
                    </div>
                    <div className="mt-4 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Monthly target</p>
                        <p className="mt-1 text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                          {goal ? formatBudgetCurrency(goal.amount) : 'Not set'}
                        </p>
                      </div>
                      {goal && (
                        <button
                          type="button"
                          onClick={() => handleDeleteBudgetGoal(goal)}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
                        >
                          <Trash2 size={14} />
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="rounded-2xl border border-white/70 bg-white/90 p-4 space-y-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/85">
            <div className="space-y-1">
              <h3 className="text-base font-black tracking-tight text-slate-900 dark:text-slate-100">Auto-categorization rules</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">If description contains a keyword, transaction gets assigned to selected category.</p>
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr,1fr,auto]">
              <input
                value={newRuleKeyword}
                onChange={(e) => setNewRuleKeyword(e.target.value)}
                placeholder='Keyword (e.g. "lidl")'
                className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-amber-200/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-amber-500/20"
              />
              <select
                value={newRuleCategoryId}
                onChange={(e) => setNewRuleCategoryId(e.target.value)}
                className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-amber-200/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-amber-500/20"
              >
                <option value="">Choose category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.type} - {category.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleCreateCategoryRule}
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                Add Rule
              </button>
            </div>
            {categoryRules.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">No rules yet.</p>
            ) : (
              <div className="space-y-2">
                {categoryRules.map((rule) => (
                  <div key={rule.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-900">
                    <p className="text-sm text-slate-700 dark:text-slate-200">
                      <span className="font-bold">"{rule.keyword}"</span> {'->'} {rule.category.name}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleRule(rule)}
                        className="rounded-lg border px-2 py-1 text-xs font-semibold hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        {rule.isActive ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRule(rule.id)}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Income Categories */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-lg px-2">
            <Tag size={20} />
            <h2>Income</h2>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            {incomeCats.length > 0 ? incomeCats.map(cat => (
              <CategoryItem 
                key={cat.id} 
                category={cat} 
                isExpanded={expandedCats[cat.id]} 
                onToggle={() => toggleExpand(cat.id)}
                onEdit={() => handleEdit(cat)}
                onDelete={() => handleDelete(cat.id)}
                onSubEdit={handleEdit}
                onSubDelete={(subId) => handleDelete(subId)}
                onAddSub={() => handleAddSubcategory(cat)}
              />
            )) : (
              <p className="p-8 text-center text-slate-400 italic">No income categories</p>
            )}
          </div>
        </section>

        {/* Expense Categories */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-lg px-2">
            <Tag size={20} />
            <h2>Expenses</h2>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            {expenseCats.length > 0 ? expenseCats.map(cat => (
              <CategoryItem 
                key={cat.id} 
                category={cat} 
                isExpanded={expandedCats[cat.id]} 
                onToggle={() => toggleExpand(cat.id)}
                onEdit={() => handleEdit(cat)}
                onDelete={() => handleDelete(cat.id)}
                onSubEdit={handleEdit}
                onSubDelete={(subId) => handleDelete(subId)}
                onAddSub={() => handleAddSubcategory(cat)}
              />
            )) : (
              <p className="p-8 text-center text-slate-400 italic">No expense categories</p>
            )}
          </div>
        </section>
      </div>

      <CategoryModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveCategory}
        initialData={modalInitialData}
        parentId={modalParentId}
        type={modalDefaultType}
      />
    </div>
  )
}

function CategoryItem({ category, isExpanded, onToggle, onEdit, onDelete, onSubEdit, onSubDelete, onAddSub }: { 
  category: Category, 
  isExpanded: boolean, 
  onToggle: () => void,
  onEdit: () => void,
  onDelete: () => void,
  onSubEdit: (category: Category) => void,
  onSubDelete: (id: string) => void,
  onAddSub: () => void
}) {
  const hasSubs = category.subcategories && category.subcategories.length > 0

  return (
    <div className="border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
        <div className="flex items-center gap-3">
          {hasSubs ? (
            <button onClick={onToggle} className="h-11 w-11 -ml-1 text-slate-400 hover:text-primary transition-colors cursor-pointer flex items-center justify-center">
              {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
          ) : (
            <div className="w-5" />
          )}
          <span className="font-semibold text-slate-700 dark:text-slate-200">{category.name}</span>
          <CategoryIcon icon={category.icon} />
        </div>
        
        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button 
              onClick={onEdit}
              className="h-11 w-11 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all flex items-center justify-center"
              title="Edit"
            >
              <Edit2 size={16} />
            </button>
            <button 
              onClick={onDelete}
              className="h-11 w-11 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all flex items-center justify-center"
              title="Delete"
            >
              <Trash2 size={16} />
          </button>
        </div>
      </div>

      {(hasSubs || isExpanded) && isExpanded && (
        <div className="bg-slate-50/50 dark:bg-slate-800/20 pl-12 pr-4 py-2 space-y-1 border-t border-slate-100 dark:border-slate-800">
          {category.subcategories?.map(sub => (
            <div key={sub.id} className="flex items-center justify-between py-2 group/sub">
              <span className="text-slate-600 dark:text-slate-400 text-sm font-medium inline-flex items-center gap-2">
                <CategoryIcon icon={sub.icon} small />
                {sub.name}
              </span>
              <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover/sub:opacity-100 transition-opacity">
                <button 
                  onClick={() => onSubEdit(sub)}
                  className="p-1.5 text-slate-400 hover:text-primary transition-colors"
                >
                  <Edit2 size={14} />
                </button>
                <button 
                  onClick={() => onSubDelete(sub.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          <button 
            onClick={onAddSub}
            className="flex items-center gap-2 text-xs font-bold text-primary hover:underline py-3 transition-all"
          >
            <Plus size={14} />
            Add Subcategory
          </button>
        </div>
      )}
    </div>
  )
}

function formatBudgetCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: localStorage.getItem('met_currency') || 'USD'
  }).format(amount)
}

function CategoryIcon({ icon, small = false }: { icon: string; small?: boolean }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-full bg-muted/60 ${small ? 'h-5 w-5' : 'h-7 w-7'}`}>
      {renderCategoryIcon(icon, small ? 12 : 15, 'text-muted-foreground')}
    </span>
  )
}

export default CategoriesPage
