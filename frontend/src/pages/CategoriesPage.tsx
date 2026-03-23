import { useMemo, useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Gem, Target, CalendarDays } from 'lucide-react'
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
  const [selectedBudgetMonth, setSelectedBudgetMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [categoryRules, setCategoryRules] = useState<CategoryRule[]>([])
  const [newRuleKeyword, setNewRuleKeyword] = useState('')
  const [newRuleCategoryId, setNewRuleCategoryId] = useState('')

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
    if (!window.confirm('Are you sure you want to delete this category? All subcategories will also be deleted.')) return
    try {
      await api.deleteCategory(id)
      notify.success('Category deleted.')
      await fetchCategories()
    } catch (error) {
      console.error('Error deleting category:', error)
      notify.error('Failed to delete category.')
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
      await fetchCategories()
    } catch (error) {
      console.error('Error saving category:', error)
      throw error
    }
  }

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

  const goalTotals = useMemo(() => {
    const totalBudget = budgetGoals.reduce((sum, goal) => sum + goal.amount, 0)
    const totalSpent = 0
    return { totalBudget, totalSpent, remaining: totalBudget - totalSpent }
  }, [budgetGoals])

  const categoryCards = useMemo(
    () => categories.filter((category) => !category.parentId),
    [categories]
  )

  if (loading) return <div className="p-8 text-center">Loading categories...</div>

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[#64748b]">Budget / Plan</p>
          <h1 className="text-3xl font-extrabold tracking-tight">Categories</h1>
        </div>
        <button
          onClick={handleAddCategory}
          className="flex items-center gap-2 rounded-[10px] bg-[#ff9eff] px-5 py-2.5 text-sm font-bold text-black transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(255,158,255,0.4)]"
        >
          <Plus size={16} />
          New Category
        </button>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
          <p className="mb-1 text-[10px] text-[#64748b]">Total Budget</p>
          <p className="text-lg font-extrabold">{formatBudgetCurrency(goalTotals.totalBudget)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
          <p className="mb-1 text-[10px] text-[#64748b]">Total Spent</p>
          <p className="text-lg font-extrabold text-[#ff9eff]">{formatBudgetCurrency(goalTotals.totalSpent)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
          <p className="mb-1 text-[10px] text-[#64748b]">Remaining</p>
          <p className="text-lg font-extrabold text-emerald-400">{formatBudgetCurrency(goalTotals.remaining)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {categoryCards.map((category) => {
          const goal = budgetMap.get(category.id)
          const spent = 0
          const budget = goal?.amount || 0
          const percent = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0
          const statusColor = percent >= 86 ? 'text-red-400' : percent >= 60 ? 'text-yellow-400' : 'text-emerald-400'
          const statusText = percent >= 86 ? 'Near limit' : percent >= 60 ? 'Watch out' : 'On track'
          return (
            <article key={category.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition hover:-translate-y-0.5 hover:border-[#ff9eff]/25">
              <div className="mb-5 flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#ff9eff]/10 text-[#ff9eff]">
                    {renderCategoryIcon(category.icon, 20)}
                  </div>
                  <div>
                    <h3 className="font-bold">{category.name}</h3>
                    <p className="mt-0.5 text-[10px] text-[#64748b]">
                      Budget: {budget > 0 ? formatBudgetCurrency(budget) : 'Not set'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleEdit(category)} className="rounded-md p-2 text-[#64748b] transition hover:bg-white/5 hover:text-white">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(category.id)} className="rounded-md p-2 text-[#64748b] transition hover:bg-white/5 hover:text-rose-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-[#64748b]">{formatBudgetCurrency(spent)} spent</span>
                  <span className={statusColor}>{percent}% · {statusText}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${percent}%`,
                      background: percent >= 86 ? 'linear-gradient(90deg,#dc89e1,#ef4444)' : 'linear-gradient(90deg,#dc89e1,#ff9eff)'
                    }}
                  />
                </div>
                <p className="text-[10px] text-[#64748b]">
                  {budget > 0 ? formatBudgetCurrency(Math.max(0, budget - spent)) : 'Set a budget target'}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleSetBudgetGoal(category)}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold hover:bg-white/10"
                >
                  <Target size={13} />
                  {goal ? 'Edit Budget' : 'Set Budget'}
                </button>
                <button
                  type="button"
                  onClick={() => handleAddSubcategory(category)}
                  className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold hover:bg-white/10"
                >
                  Add Subcategory
                </button>
                {goal ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteBudgetGoal(goal)}
                    className="rounded-lg border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-200 hover:bg-rose-500/15"
                  >
                    Remove Budget
                  </button>
                ) : null}
              </div>

              {category.subcategories && category.subcategories.length > 0 ? (
                <div className="mt-4 border-t border-white/10 pt-3">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#64748b]">Subcategories</p>
                  <div className="space-y-2">
                    {category.subcategories.map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2">
                        <span className="inline-flex items-center gap-2 text-xs">
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10">{renderCategoryIcon(sub.icon, 12)}</span>
                          {sub.name}
                        </span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleEdit(sub)} className="rounded p-1 text-[#64748b] hover:text-white">
                            <Edit2 size={12} />
                          </button>
                          <button onClick={() => handleDelete(sub.id)} className="rounded p-1 text-[#64748b] hover:text-rose-400">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          )
        })}

        <button
          onClick={handleAddCategory}
          className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 bg-transparent transition hover:border-[#ff9eff]/35 hover:bg-[#ff9eff]/[0.03]"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-white/15">
            <Plus size={18} className="text-[#64748b]" />
          </span>
          <span className="text-sm font-bold text-[#64748b]">Add custom category</span>
        </button>
      </div>

      {isPremiumUser ? (
        <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#ff9eff]/35 bg-[#ff9eff]/10 px-3 py-1 text-[11px] font-black tracking-[0.22em] text-[#ff9eff]">
                <Gem size={13} />
                MONTHLY BUDGET GOALS
              </div>
              <h2 className="text-xl font-black tracking-tight text-slate-100">Set category targets</h2>
            </div>
            <label className="space-y-1 text-sm font-semibold text-slate-300">
              <span className="inline-flex items-center gap-2"><CalendarDays size={15} /> Budget month</span>
              <input
                type="month"
                value={selectedBudgetMonth}
                onChange={(e) => setSelectedBudgetMonth(e.target.value)}
                className="min-h-11 rounded-2xl border border-white/12 bg-white/5 px-4 py-2.5 outline-none transition focus:border-[#ff9eff]/55 focus:ring-4 focus:ring-[#ff9eff]/20 text-slate-100"
              />
            </label>
          </div>

          {budgetLoading ? <p className="text-sm text-slate-400">Loading budget goals...</p> : null}

          <div className="rounded-2xl border border-white/12 bg-white/5 p-4 space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-black tracking-tight text-slate-100">Auto-categorization rules</h3>
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr,1fr,auto]">
              <input
                value={newRuleKeyword}
                onChange={(e) => setNewRuleKeyword(e.target.value)}
                placeholder='Keyword (e.g. "lidl")'
                className="min-h-11 rounded-xl border border-white/12 bg-white/5 px-3 text-sm outline-none focus:ring-4 focus:ring-[#ff9eff]/20 text-slate-100 placeholder:text-slate-500"
              />
              <select
                value={newRuleCategoryId}
                onChange={(e) => setNewRuleCategoryId(e.target.value)}
                className="min-h-11 rounded-xl border border-white/12 bg-white/5 px-3 text-sm outline-none focus:ring-4 focus:ring-[#ff9eff]/20 text-slate-100"
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
                className="min-h-11 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-bold text-slate-200 hover:bg-white/10"
              >
                Add Rule
              </button>
            </div>
            {categoryRules.length === 0 ? (
              <p className="text-xs text-slate-400">No rules yet.</p>
            ) : (
              <div className="space-y-2">
                {categoryRules.map((rule) => (
                  <div key={rule.id} className="flex flex-col gap-2 rounded-xl border border-white/12 bg-white/5 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-200">
                      <span className="font-bold">"{rule.keyword}"</span> {'->'} {rule.category.name}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleRule(rule)}
                        className="rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-xs font-semibold text-slate-200 hover:bg-white/10"
                      >
                        {rule.isActive ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRule(rule.id)}
                        className="rounded-lg border border-rose-400/35 bg-rose-500/10 px-2 py-1 text-xs font-semibold text-rose-200 hover:bg-rose-500/15"
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

function formatBudgetCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: localStorage.getItem('met_currency') || 'USD'
  }).format(amount)
}

export default CategoriesPage
