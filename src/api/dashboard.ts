import { apiClient } from './client';
import { DashboardOverview, SentimentBreakdown, TrendPoint, TopIssue } from '../types';

export const dashboardApi = {
  getOverview: async (datasetId?: string, period = '30d'): Promise<DashboardOverview> => {
    const res = await apiClient.get<DashboardOverview>('/dashboard/overview', {
      params: { datasetId, period },
    });
    return res.data;
  },

  getSentiment: async (datasetId?: string): Promise<SentimentBreakdown> => {
    const res = await apiClient.get<SentimentBreakdown>('/dashboard/sentiment', {
      params: { datasetId },
    });
    return res.data;
  },

  getTrends: async (datasetId?: string, period = '30d'): Promise<{ period: string; trends: TrendPoint[] }> => {
    const res = await apiClient.get<{ period: string; trends: TrendPoint[] }>('/dashboard/trends', {
      params: { datasetId, period },
    });
    return res.data;
  },

  getTopics: async (datasetId?: string): Promise<{ topics: any[]; top_issues: TopIssue[] }> => {
    const res = await apiClient.get<{ topics: any[]; top_issues: TopIssue[] }>('/dashboard/topics', {
      params: { datasetId },
    });
    return res.data;
  },
};
