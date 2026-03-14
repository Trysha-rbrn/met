import axios from 'axios';
import { API_BASE_URL } from './baseUrl'

const API_URL = `${API_BASE_URL}/categories`;

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

const getAuthHeaders = () => {
  const token = localStorage.getItem('met_token');
  return { Authorization: `Bearer ${token}` };
};

export const getCategories = async () => {
  const response = await axios.get<Category[]>(API_URL, { headers: getAuthHeaders() });
  return response.data;
};

export const createCategory = async (data: CategoryPayload) => {
  const response = await axios.post<Category>(API_URL, data, { headers: getAuthHeaders() });
  return response.data;
};

export const updateCategory = async (id: string, data: Partial<CategoryPayload>) => {
  const response = await axios.put<Category>(`${API_URL}/${id}`, data, { headers: getAuthHeaders() });
  return response.data;
};

export const deleteCategory = async (id: string) => {
  const response = await axios.delete(`${API_URL}/${id}`, { headers: getAuthHeaders() });
  return response.data;
};
