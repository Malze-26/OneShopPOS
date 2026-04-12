// Authentication utility functions

export const logout = () => {
  // Clear all auth data
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  
  // Optionally call backend logout endpoint
  // fetch('http://localhost:5000/api/auth/logout', {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${localStorage.getItem('token')}`
  //   }
  // });
  
  // Redirect to login
  window.location.href = '/login';
};

export const getUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const getToken = () => {
  return localStorage.getItem('token');
};

export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};