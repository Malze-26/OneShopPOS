const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

const getHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return response.json();
  },

  register: async (userData: Record<string, unknown>) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    return response.json();
  },

  getMe: async () => {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: getHeaders(),
    });
    return response.json();
  },

  logout: async () => {
    const response = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return response.json();
  },

  updateProfile: async (name: string, email: string) => {
    const response = await fetch(`${API_URL}/auth/profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ name, email }),
    });
    return response.json();
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await fetch(`${API_URL}/auth/password`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return response.json();
  },
};

export const tenantAPI = {
  getAll: async () => {
    const response = await fetch(`${API_URL}/tenants`, {
      headers: getHeaders(),
    });
    return response.json();
  },

  getOne: async (id: string) => {
    const response = await fetch(`${API_URL}/tenants/${id}`, {
      headers: getHeaders(),
    });
    return response.json();
  },

  create: async (tenantData: Record<string, unknown>) => {
    const response = await fetch(`${API_URL}/tenants`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(tenantData),
    });
    return response.json();
  },

  update: async (id: string, tenantData: Record<string, unknown>) => {
    const response = await fetch(`${API_URL}/tenants/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(tenantData),
    });
    return response.json();
  },

  delete: async (id: string) => {
    const response = await fetch(`${API_URL}/tenants/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return response.json();
  },

  getAnalytics: async () => {
    const response = await fetch(`${API_URL}/tenants/analytics`, {
      headers: getHeaders(),
    });
    return response.json();
  },
};
