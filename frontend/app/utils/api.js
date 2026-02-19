// API utility for frontend - handles all calls to the backend
const API_BASE_URL = 'http://localhost:5000/api';

// Helper function to get auth token
const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken');
  }
  return null;
};

// Helper function to make API calls with auth
const apiCall = async (endpoint, options = {}) => {
  const token = getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }

    return data;
  } catch (error) {
    throw error;
  }
};

// ────── PRODUCTS ──────
export const getProducts = () => apiCall('/pos/products');
export const getProductsByCategory = (categoryId) => apiCall(`/pos/products/category/${categoryId}`);
export const getProduct = (productId) => apiCall(`/pos/products/${productId}`);

// ────── CATEGORIES ──────
export const getCategories = () => apiCall('/pos/categories');

// ────── CUSTOMERS ──────
export const getCustomers = () => apiCall('/pos/customers');
export const getCustomer = (customerId) => apiCall(`/pos/customers/${customerId}`);
export const createCustomer = (name, email) =>
  apiCall('/pos/customers', {
    method: 'POST',
    body: JSON.stringify({ name, email }),
  });
export const updateCustomerPoints = (customerId, pts) =>
  apiCall(`/pos/customers/${customerId}`, {
    method: 'PUT',
    body: JSON.stringify({ pts }),
  });

// ────── ORDERS ──────
export const createOrder = (orderData) =>
  apiCall('/pos/orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
  });
export const getOrders = () => apiCall('/pos/orders');
export const getOrder = (orderId) => apiCall(`/pos/orders/${orderId}`);

// ────── REPORTS ──────
export const getSalesSummary = () => apiCall('/pos/reports/summary');
export const getDailySales = () => apiCall('/pos/reports/daily');
