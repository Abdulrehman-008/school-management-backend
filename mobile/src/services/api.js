import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://school-management-backend-inovatters.vercel.app/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Authorization token — using a then-chain to avoid async interceptor issues
api.interceptors.request.use(
  (config) => {
    return AsyncStorage.getItem('token')
      .then((token) => {
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      })
      .catch(() => config); // If AsyncStorage fails, continue without token
  },
  (error) => Promise.reject(error)
);

// Normalize all error responses to a plain Error with a readable message
api.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = 'An unexpected error occurred';

    if (error.code === 'ECONNABORTED') {
      message = 'Request timed out. Please check your internet connection.';
    } else if (!error.response) {
      // No response = network-level failure
      message = `Network error: ${error.message}`;
    } else {
      message =
        error.response.data?.message ||
        error.response.data?.error ||
        `Server error (${error.response.status})`;
    }

    return Promise.reject(new Error(message));
  }
);

export default api;
