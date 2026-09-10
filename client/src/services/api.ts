import axios, { AxiosError } from 'axios';
import { ApiResponse } from '../types/form';

const getApiBaseUrl = (): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL;
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  }
  const proc = (globalThis as unknown as { process?: { env?: Record<string, string> } }).process;
  if (proc?.env) {
    if (proc.env.VITE_API_BASE_URL) return proc.env.VITE_API_BASE_URL;
    if (proc.env.VITE_API_URL) return proc.env.VITE_API_URL;
  }
  return 'http://localhost:5000/api';
};

const API_BASE_URL = getApiBaseUrl();

/**
 * Centralized Axios HTTP client instance
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/**
 * Response interceptor: passes successful responses through and
 * normalizes server and network errors into clean Error instances.
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse<unknown>>) => {
    let message = 'An unexpected API error occurred.';

    if (error.response?.data?.error?.message) {
      // Backend structured error message
      message = error.response.data.error.message;
    } else if (error.response?.status === 404) {
      message = 'Requested form schema was not found (404).';
    } else if (error.response?.status === 400) {
      message = 'Invalid request parameters (400).';
    } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      message = 'Request timed out. Please try again.';
    } else if (!error.response || error.code === 'ERR_NETWORK') {
      message = 'Cannot connect to server. Please ensure the backend API is running.';
    } else if (error.message) {
      message = error.message;
    }

    return Promise.reject(new Error(message));
  }
);

export default apiClient;
