// src/lib/api.ts
import axios from 'axios';
import { CheckerConfiguration } from '../lib/types';

console.log('BACKEND_URL:', process.env.BACKEND_URL);

const api = axios.create({
  baseURL: process.env.BACKEND_URL,
  withCredentials: true
});

export async function getLastChecks() {
  try {
    const response = await api.get('/api/get-checks');
    return response.data.checks;
  } catch (error) {
    console.error('Error fetching checks:', error);
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

export async function getCheckerConfiguration() {
  try {
    const response = await api.get(`/api/get-checker-configuration`);
    return response.data;
  } catch (error) {
    console.error('Error fetching checker configuration:', error);
    throw error;
  }
}

export async function updateCheckerConfiguration(configId: number, updatedConfig: Partial<CheckerConfiguration>) {
  try {
    const response = await api.post('/api/update-checker-configuration', {
      id: configId,
      ...updatedConfig
    });
    return response.data;
  } catch (error) {
    console.error('Error updating checker configuration:', error);
    throw error;
  }
}