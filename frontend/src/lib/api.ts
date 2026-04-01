const API_BASE_URL = 'http://localhost:5000/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const api = {
  // Auth
  login: async (userData: { email: string; password?: string }) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  },

  register: async (userData: { name: string; email: string; password?: string; dept?: string; year?: number }) => {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  },

  // Profile
  getProfile: async () => {
    const res = await fetch(`${API_BASE_URL}/profile`, { headers: getHeaders() });
    return res.json();
  },

  updateProfile: async (profileData: any) => {
    const res = await fetch(`${API_BASE_URL}/profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(profileData)
    });
    return res.json();
  },

  // Listings
  getListings: async () => {
    const res = await fetch(`${API_BASE_URL}/listings`);
    return res.json();
  },

  createListing: async (listingData: any) => {
    const res = await fetch(`${API_BASE_URL}/listings`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(listingData)
    });
    return res.json();
  },

  // Lost & Found
  getLostFound: async () => {
    const res = await fetch(`${API_BASE_URL}/lost-found`);
    return res.json();
  },

  reportLostFound: async (reportData: any) => {
    const res = await fetch(`${API_BASE_URL}/lost-found`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(reportData)
    });
    return res.json();
  },

  // Upload
  uploadImage: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      headers: { ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {}) },
      body: formData
    });
    return res.json();
  }
};
