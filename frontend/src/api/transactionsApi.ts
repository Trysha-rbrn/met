import axios from 'axios';

const API_URL = 'http://localhost:3000/api/transactions';

export const getTransactions = async () => {
  const response = await axios.get(API_URL);
  return response.data;
};

export const getSummary = async () => {
  const response = await axios.get(`${API_URL}/summary`);
  return response.data;
};

export const createTransaction = async (data: any) => {
  const response = await axios.post(API_URL, data);
  return response.data;
};

export const updateTransaction = async (id: string, data: any) => {
  const response = await axios.put(`${API_URL}/${id}`, data);
  return response.data;
};

export const deleteTransaction = async (id: string) => {
  const response = await axios.delete(`${API_URL}/${id}`);
  return response.data;
};
