import { apiClient } from './client';
import { AISummary, DecisionItem } from '../types';

export const analysisApi = {
  getSummary: async (datasetId?: string): Promise<AISummary> => {
    const res = await apiClient.post<AISummary>('/analysis/summary', { datasetId });
    return res.data;
  },

  generateDecisions: async (datasetId?: string): Promise<{ decisions: Partial<DecisionItem>[] }> => {
    const res = await apiClient.post<{ decisions: Partial<DecisionItem>[] }>('/analysis/decisions', { datasetId });
    return res.data;
  },

  analyzeText: async (text: string, rating?: number): Promise<any> => {
    const res = await apiClient.post('/analysis/sentiment', { text, rating });
    return res.data;
  },
};
