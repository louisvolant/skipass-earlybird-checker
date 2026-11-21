// src/lib/api.ts
import axios, { AxiosError } from 'axios';
import { CheckerConfiguration } from '../lib/types';

const api = axios.create({
  baseURL: '',
  withCredentials: true,
});

// Event broadcast when a protected endpoint answers 401 (session missing or
// expired). The dashboard listens to it and switches back to the login card.
export const AUTH_EXPIRED_EVENT = 'auth-expired';

// Endpoints that manage authentication themselves: a 401 from them is an
// expected login failure, not a session expiry.
const AUTH_ENDPOINTS = ['/api/auth/login', '/api/auth/session', '/api/auth/logout'];

api.interceptors.response.use(undefined, (error: AxiosError) => {
  const status = error.response?.status;
  const url = error.config?.url ?? '';
  if (status === 401 && !AUTH_ENDPOINTS.some((endpoint) => url.startsWith(endpoint))) {
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
  }
  return Promise.reject(error);
});

export async function login(password: string) {
  try {
    const response = await api.post('/api/auth/login', { password });
    return response.data;
  } catch (error) {
    console.error('Error logging in:', error);
    throw error;
  }
}

export async function getSession() {
  try {
    const response = await api.get('/api/auth/session');
    return response.data;
  } catch (error) {
    console.error('Error checking session:', error);
    throw error;
  }
}

export async function logout() {
  try {
    const response = await api.post('/api/auth/logout');
    return response.data;
  } catch (error) {
    console.error('Error logging out:', error);
    throw error;
  }
}

export async function getLastChecks() {
  try {
    const response = await api.get('/api/get-checks');
    return response.data.checks;
  } catch (error) {
    if (error instanceof Error) {
      const axiosError = error as AxiosError;
      console.error(
        'Error fetching checks:',
        axiosError.response?.status,
        axiosError.message,
        axiosError.config
      );
    } else {
      console.error('Error fetching checks:', error);
    }
    throw error;
  }
}

export async function getCheckContent(checkId: number) {
  try {
    const response = await api.get(`/api/get-check-content?check_id=${checkId}`);
    return response.data.content;
  } catch (error) {
    console.error('Error fetching check content:', error);
    throw error;
  }
}

export async function deleteCheckContent(checkId: number) {
  try {
    const response = await api.post('/api/delete-check-content', { check_id: checkId });
    return response.data;
  } catch (error) {
    console.error('Error deleting check:', error);
    throw error;
  }
}

export async function forceCheck() {
  try {
    const response = await api.post('/api/force-check');
    return response.data;
  } catch (error) {
    console.error('Error forcing check:', error);
    throw error;
  }
}

export async function getCheckerConfiguration(activeOnly: boolean = true) {
  try {
    const response = await api.get(`/api/get-checker-configuration?isActiveOnly=${activeOnly}`);
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      const axiosError = error as AxiosError;
      console.error(
        'Error fetching checker config:',
        axiosError.response?.status,
        axiosError.message,
        axiosError.config
      );
    } else {
      console.error('Error fetching checker config:', error);
    }
    throw error;
  }
}

export async function updateCheckerConfiguration(configId: number, updatedConfig: Partial<CheckerConfiguration>) {
  try {
    const response = await api.post('/api/update-checker-configuration', {
      id: configId,
      ...updatedConfig,
    });
    return response.data;
  } catch (error) {
    console.error('Error updating checker configuration:', error);
    throw error;
  }
}

export async function createCheckerConfiguration(newConfig: Omit<CheckerConfiguration, 'id'>) {
  try {
    const response = await api.post('/api/create-checker-configuration', newConfig);
    return response.data;
  } catch (error) {
    console.error('Error creating checker configuration:', error);
    throw error;
  }
}

export async function deleteCheckerConfiguration(configId: number) {
  try {
    const response = await api.post('/api/delete-checker-configuration', { id: configId });
    return response.data;
  } catch (error) {
    console.error('Error deleting checker configuration:', error);
    throw error;
  }
}

export async function clearCache() {
  try {
    const response = await api.post('/api/clear-cache');
    return response.data;
  } catch (error) {
    console.error('Error clearing cache:', error);
    throw error;
  }
}

export async function getDBSize() {
  try {
    const response = await api.get('/api/get-db-usage');
    return response.data.dbUsage || { size: 'N/A' };
  } catch (error) {
    console.error('Error fetching DB size:', error);
    return { size: 'N/A' };
  }
}
