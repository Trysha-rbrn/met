import axios from 'axios';

const API_URL = 'http://localhost:3000/api/categories';

export const getCategories = async () => {
  const response = await axios.get(API_URL);
  return response.data;
};

export const createCategory = async (data: { name: string; type: string; parentId?: string | null }) => {
  const response = await axios.post(API_URL, data);
  return response.data;
};

export const updateCategory = async (id: string, data: { name: string; type: string; parentId?: string | null }) => {
  const response = await axios.put(`${API_URL}/${id}`, data);
  return response.data;
};

export const deleteCategory = async (id: string) => {
  const response = await axios.delete(`${API_URL}/${id}`);
  return response.data;
};
