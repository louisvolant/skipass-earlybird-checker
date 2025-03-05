// src/lib/api.ts
import axios from 'axios';

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

export async function forceCheck() {
  try {
    const response = await api.post('/api/force-check');
    return response.data;
  } catch (error) {
    console.error('Error forcing check:', error);
    throw error;
  }
}