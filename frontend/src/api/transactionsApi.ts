import axios from 'axios';

const API_URL = 'http://localhost:3000/api/transactions';

const getAuthHeaders = () => {
  const token = localStorage.getItem('met_token');
  return { Authorization: `Bearer ${token}` };
};

export const getTransactions = async () => {
  const response = await axios.get(API_URL, { headers: getAuthHeaders() });
  return response.data;
};

export const getSummary = async () => {
  const response = await axios.get(`${API_URL}/summary`, { headers: getAuthHeaders() });
  return response.data;
};

export const createTransaction = async (data: any) => {
  const response = await axios.post(API_URL, data, { headers: getAuthHeaders() });
  return response.data;
};

export const updateTransaction = async (id: string, data: any) => {
  const response = await axios.put(`${API_URL}/${id}`, data, { headers: getAuthHeaders() });
  return response.data;
};

export const deleteTransaction = async (id: string) => {
  const response = await axios.delete(`${API_URL}/${id}`, { headers: getAuthHeaders() });
  return response.data;
};
