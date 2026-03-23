import { http } from './http'

const API_URL = '/categories'

export interface Category {
  id: string
  name: string
  icon: string
  type: 'INCOME' | 'EXPENSE'
  parentId: string | null
  subcategories?: Category[]
}

export interface CategoryPayload {
  name: string
  icon: string
  type: string
  parentId?: string | null
}

export interface BudgetGoal {
  id: string
  userId: string
  categoryId: string
  monthStart: string
  amount: number
  category: {
    id: string
    name: string
    icon: string
    type: 'INCOME' | 'EXPENSE'
    parentId: string | null
  }
}

export interface CategoryRule {
  id: string
  userId: string
  categoryId: string
  keyword: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  category: {
    id: string
    name: string
    icon: string
    type: 'INCOME' | 'EXPENSE'
  }
}

export const getCategories = async () => {
  const response = await http.get<Category[]>(API_URL)
  return response.data
}

export const createCategory = async (data: CategoryPayload) => {
  const response = await http.post<Category>(API_URL, data)
  return response.data
}

export const updateCategory = async (id: string, data: Partial<CategoryPayload>) => {
  const response = await http.put<Category>(`${API_URL}/${id}`, data)
  return response.data
}

export const deleteCategory = async (id: string) => {
  const response = await http.delete(`${API_URL}/${id}`)
  return response.data
}

export const getBudgetGoals = async (month: string) => {
  const response = await http.get<BudgetGoal[]>(`${API_URL}/budgets`, {
    params: { month }
  })
  return response.data
}

export const createBudgetGoal = async (data: { categoryId: string; month: string; amount: number }) => {
  const response = await http.post<BudgetGoal>(`${API_URL}/budgets`, data)
  return response.data
}

export const updateBudgetGoal = async (id: string, amount: number) => {
  const response = await http.patch<BudgetGoal>(`${API_URL}/budgets/${id}`, { amount })
  return response.data
}

export const deleteBudgetGoal = async (id: string) => {
  const response = await http.delete(`${API_URL}/budgets/${id}`)
  return response.data
}

export const getCategoryRules = async () => {
  const response = await http.get<CategoryRule[]>(`${API_URL}/rules`)
  return response.data
}

export const createCategoryRule = async (payload: { keyword: string; categoryId: string; isActive?: boolean }) => {
  const response = await http.post<CategoryRule>(`${API_URL}/rules`, payload)
  return response.data
}

export const updateCategoryRule = async (id: string, payload: Partial<{ keyword: string; categoryId: string; isActive: boolean }>) => {
  const response = await http.patch<CategoryRule>(`${API_URL}/rules/${id}`, payload)
  return response.data
}

export const deleteCategoryRule = async (id: string) => {
  const response = await http.delete(`${API_URL}/rules/${id}`)
  return response.data
}
