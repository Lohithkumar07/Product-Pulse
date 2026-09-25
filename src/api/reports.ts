import { apiClient } from './client';
import { ReportItem } from '../types';

export const reportsApi = {
  generate: async (datasetId?: string, period = '30d'): Promise<ReportItem> => {
    const res = await apiClient.post<ReportItem>('/reports/generate', { datasetId, period });
    return res.data;
  },

  list: async (datasetId?: string): Promise<Array<{ id: string; title: string; period: string; created_at: string }>> => {
    const res = await apiClient.get('/reports', { params: { datasetId } });
    return res.data;
  },

  getById: async (id: string): Promise<ReportItem> => {
    const res = await apiClient.get<ReportItem>(`/reports/${id}`);
    return res.data;
  },
};
