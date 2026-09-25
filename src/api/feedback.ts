import { apiClient } from './client';
import { FeedbackItem } from '../types';

export interface FeedbackQueryParams {
  datasetId?: string;
  productId?: string;
  search?: string;
  sentiment?: string;
  topic?: string;
  priority?: string;
  source?: string;
  rating?: number;
  page?: number;
  limit?: number;
}

export interface FeedbackListResponse {
  items: FeedbackItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export const feedbackApi = {
  list: async (params: FeedbackQueryParams = {}): Promise<FeedbackListResponse> => {
    const res = await apiClient.get<FeedbackListResponse>('/feedback', { params });
    return res.data;
  },

  getById: async (id: string): Promise<{ feedback: FeedbackItem; related_feedback: any[] }> => {
    const res = await apiClient.get<{ feedback: FeedbackItem; related_feedback: any[] }>(`/feedback/${id}`);
    return res.data;
  },

  create: async (data: Partial<FeedbackItem>): Promise<FeedbackItem> => {
    const res = await apiClient.post<FeedbackItem>('/feedback', data);
    return res.data;
  },

  delete: async (id: string): Promise<{ message: string; id: string }> => {
    const res = await apiClient.delete<{ message: string; id: string }>(`/feedback/${id}`);
    return res.data;
  },
};
