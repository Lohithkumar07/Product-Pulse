import { apiClient } from './client';
import { DecisionItem, DecisionStatus } from '../types';

export const decisionsApi = {
  list: async (datasetId?: string, status?: string, priority?: string): Promise<DecisionItem[]> => {
    const res = await apiClient.get<DecisionItem[]>('/decisions', {
      params: { datasetId, status, priority },
    });
    return res.data;
  },

  create: async (decision: Partial<DecisionItem>): Promise<DecisionItem> => {
    const res = await apiClient.post<DecisionItem>('/decisions', decision);
    return res.data;
  },

  update: async (id: string, updates: Partial<DecisionItem>): Promise<DecisionItem> => {
    const res = await apiClient.patch<DecisionItem>(`/decisions/${id}`, updates);
    return res.data;
  },

  updateStatus: async (id: string, status: DecisionStatus): Promise<DecisionItem> => {
    const res = await apiClient.patch<DecisionItem>(`/decisions/${id}`, { status });
    return res.data;
  },

  delete: async (id: string): Promise<{ message: string; id: string }> => {
    const res = await apiClient.delete<{ message: string; id: string }>(`/decisions/${id}`);
    return res.data;
  },
};
