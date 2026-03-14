import axios from 'axios';
import { API_BASE_URL } from './baseUrl'

const API_URL = `${API_BASE_URL}/auth`;

export interface AuthUser {
  id: string
  name: string
  email: string
}

export interface AuthResponse {
  user: AuthUser
  token: string
}

export interface AuthPayload {
  email: string
  password: string
  name?: string
}

export interface UpdateProfilePayload {
  name?: string
  currentPassword?: string
  newPassword?: string
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('met_token');
  return { Authorization: `Bearer ${token}` };
};

export const register = async (data: AuthPayload) => {
  const response = await axios.post<AuthResponse>(`${API_URL}/register`, data);
  return response.data;
};

export const login = async (data: AuthPayload) => {
  const response = await axios.post<AuthResponse>(`${API_URL}/login`, data);
  return response.data;
};

export const getMe = async () => {
  const response = await axios.get<AuthUser>(`${API_URL}/me`, {
    headers: getAuthHeaders()
  });
  return response.data;
};

export const updateProfile = async (data: UpdateProfilePayload) => {
  const response = await axios.put<AuthUser>(`${API_URL}/profile`, data, {
    headers: getAuthHeaders()
  });
  return response.data;
};

export const deleteAccount = async (password: string) => {
  const response = await axios.delete(`${API_URL}/profile`, {
    data: { password },
    headers: getAuthHeaders()
  });
  return response.data;
};
