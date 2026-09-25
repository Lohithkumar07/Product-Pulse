import { apiClient } from './client';
import { Dataset } from '../types';

export const datasetsApi = {
  list: async (): Promise<Dataset[]> => {
    const response = await apiClient.get<Dataset[]>('/datasets');
    return response.data;
  },

  get: async (id: string): Promise<Dataset & { metrics: any }> => {
    const response = await apiClient.get<Dataset & { metrics: any }>(`/datasets/${id}`);
    return response.data;
  },

  delete: async (id: string): Promise<{ message: string; id: string }> => {
    const response = await apiClient.delete<{ message: string; id: string }>(`/datasets/${id}`);
    return response.data;
  },

  resetDemo: async (): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/seed/reset');
    return response.data;
  },
};
