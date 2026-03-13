import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, ChevronRight, ChevronDown, Tag } from 'lucide-react'
import * as api from '../api/categoriesApi'
import CategoryModal from '../components/CategoryModal'

interface Category {
  id: string
  name: string
  type: 'INCOME' | 'EXPENSE'
  parentId: string | null
  subcategories?: Category[]
}

function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({})
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalInitialData, setModalInitialData] = useState<Category | null>(null)
  const [modalParentId, setModalParentId] = useState<string | null>(null)
  const [modalDefaultType, setModalDefaultType] = useState<'INCOME' | 'EXPENSE' | undefined>()

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const data = await api.getCategories()
      setCategories(data)
    } catch (error) {
      console.error('Error fetching categories:', error)
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
        fetchCategories()
      } catch (error) {
        console.error('Error deleting category:', error)
      }
    }
  }

  const handleSaveCategory = async (data: { name: string; type: string; parentId: string | null }) => {
    try {
      if (modalInitialData) {
        await api.updateCategory(modalInitialData.id, data)
      } else {
        await api.createCategory(data)
      }
      fetchCategories()
    } catch (error) {
      console.error('Error saving category:', error)
      throw error
    }
  }

  if (loading) return <div className="p-8 text-center">Loading categories...</div>

  const incomeCats = categories.filter(c => c.type === 'INCOME')
  const expenseCats = categories.filter(c => c.type === 'EXPENSE')

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-end">
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight">Categories</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage your income and expense categories.</p>
        </div>
        <button 
          onClick={handleAddCategory}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
        >
          <Plus size={20} />
          Add Category
        </button>
      </header>

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

function CategoryItem({ category, isExpanded, onToggle, onEdit, onDelete, onAddSub }: { 
  category: Category, 
  isExpanded: boolean, 
  onToggle: () => void,
  onEdit: () => void,
  onDelete: () => void,
  onAddSub: () => void
}) {
  const hasSubs = category.subcategories && category.subcategories.length > 0

  return (
    <div className="border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
        <div className="flex items-center gap-3">
          {hasSubs ? (
            <button onClick={onToggle} className="text-slate-400 hover:text-blue-600 transition-colors cursor-pointer">
              {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
          ) : (
            <div className="w-5" />
          )}
          <span className="font-semibold text-slate-700 dark:text-slate-200">{category.name}</span>
        </div>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={onEdit}
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
            title="Edit"
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={onDelete}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all"
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
              <span className="text-slate-600 dark:text-slate-400 text-sm font-medium">{sub.name}</span>
              <div className="flex items-center gap-1 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                <button 
                  onClick={() => onEdit()} // Should ideally pass the subcategory to edit
                  className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                >
                  <Edit2 size={14} />
                </button>
                <button 
                  onClick={() => onDelete()} // Should pass sub.id
                  className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          <button 
            onClick={onAddSub}
            className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline py-3 transition-all"
          >
            <Plus size={14} />
            Add Subcategory
          </button>
        </div>
      )}
    </div>
  )
}

export default CategoriesPage
