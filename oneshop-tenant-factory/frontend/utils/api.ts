const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6000/api';

const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

const getHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

export const authAPI = {
  login: async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  },

  getMe: async () => {
    const res = await fetch(`${API_URL}/auth/me`, { headers: getHeaders() });
    return res.json();
  },

  logout: async () => {
    const res = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return res.json();
  },

  updateProfile: async (name: string, email: string) => {
    const res = await fetch(`${API_URL}/auth/profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ name, email }),
    });
    return res.json();
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const res = await fetch(`${API_URL}/auth/password`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return res.json();
  },
};

export const tenantAPI = {
  getAll: async () => {
    const res = await fetch(`${API_URL}/tenants`, { headers: getHeaders() });
    return res.json();
  },

  getOne: async (id: string) => {
    const res = await fetch(`${API_URL}/tenants/${id}`, { headers: getHeaders() });
    return res.json();
  },

  create: async (data: Record<string, unknown>) => {
    const res = await fetch(`${API_URL}/tenants`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  update: async (id: string, data: Record<string, unknown>) => {
    const res = await fetch(`${API_URL}/tenants/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  delete: async (id: string) => {
    const res = await fetch(`${API_URL}/tenants/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return res.json();
  },

  getAnalytics: async () => {
    const res = await fetch(`${API_URL}/tenants/analytics`, { headers: getHeaders() });
    return res.json();
  },

  getStoreSettings: async (id: string) => {
    const res = await fetch(`${API_URL}/tenants/${id}/store-settings`, { headers: getHeaders() });
    return res.json();
  },

  getManager: async (id: string) => {
    const res = await fetch(`${API_URL}/tenants/${id}/manager`, { headers: getHeaders() });
    return res.json();
  },

  setManager: async (id: string, data: { name: string; email: string; password: string }) => {
    const res = await fetch(`${API_URL}/tenants/${id}/manager`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
};

export const notificationAPI = {
  getAll: async () => {
    const res = await fetch(`${API_URL}/notifications`, { headers: getHeaders() });
    return res.json();
  },

  markAsRead: async (id: string) => {
    const res = await fetch(`${API_URL}/notifications/${id}/read`, {
      method: 'PUT',
      headers: getHeaders(),
    });
    return res.json();
  },

  markAllAsRead: async () => {
    const res = await fetch(`${API_URL}/notifications/read-all`, {
      method: 'PUT',
      headers: getHeaders(),
    });
    return res.json();
  },
};
