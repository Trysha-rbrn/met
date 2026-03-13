import axios from 'axios';

const API_URL = 'http://localhost:3000/api/categories';

const getAuthHeaders = () => {
  const token = localStorage.getItem('met_token');
  return { Authorization: `Bearer ${token}` };
};

export const getCategories = async () => {
  const response = await axios.get(API_URL, { headers: getAuthHeaders() });
  return response.data;
};

export const createCategory = async (data: { name: string; type: string; parentId?: string | null }) => {
  const response = await axios.post(API_URL, data, { headers: getAuthHeaders() });
  return response.data;
};

export const updateCategory = async (id: string, data: { name: string; type: string; parentId?: string | null }) => {
  const response = await axios.put(`${API_URL}/${id}`, data, { headers: getAuthHeaders() });
  return response.data;
};

export const deleteCategory = async (id: string) => {
  const response = await axios.delete(`${API_URL}/${id}`, { headers: getAuthHeaders() });
  return response.data;
};
