import axios from 'axios';

const API_URL = 'http://localhost:3000/api/auth';

const getAuthHeaders = () => {
  const token = localStorage.getItem('met_token');
  return { Authorization: `Bearer ${token}` };
};

export const register = async (data: any) => {
  const response = await axios.post(`${API_URL}/register`, data);
  return response.data;
};

export const login = async (data: any) => {
  const response = await axios.post(`${API_URL}/login`, data);
  return response.data;
};

export const getMe = async () => {
  const response = await axios.get(`${API_URL}/me`, {
    headers: getAuthHeaders()
  });
  return response.data;
};

export const updateProfile = async (data: any) => {
  const response = await axios.put(`${API_URL}/profile`, data, {
    headers: getAuthHeaders()
  });
  return response.data;
};

export const deleteAccount = async () => {
  const response = await axios.delete(`${API_URL}/profile`, {
    headers: getAuthHeaders()
  });
  return response.data;
};
