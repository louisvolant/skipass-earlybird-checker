// src/lib/api.ts
import axios, { AxiosError } from 'axios';
import { CheckerConfiguration } from '../lib/types';

console.log('BACKEND_URL:', process.env.BACKEND_URL);

const api = axios.create({
  baseURL: process.env.BACKEND_URL,
  withCredentials: true,
});

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