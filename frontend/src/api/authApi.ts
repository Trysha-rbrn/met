import axios from 'axios';

const API_URL = 'http://localhost:3000/api/auth';

export const register = async (data: any) => {
  const response = await axios.post(`${API_URL}/register`, data);
  return response.data;
};

export const login = async (data: any) => {
  const response = await axios.post(`${API_URL}/login`, data);
  return response.data;
};

export const getMe = async (token: string) => {
  const response = await axios.get(`${API_URL}/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};
