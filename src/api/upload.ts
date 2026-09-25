import { apiClient } from './client';
import { ImportResult } from '../types';

export const uploadApi = {
  uploadCsv: async (
    file: File,
    name?: string,
    onUploadProgress?: (progressEvent: any) => void
  ): Promise<ImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    if (name) {
      formData.append('name', name);
    }

    const res = await apiClient.post<ImportResult>('/upload/csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
    return res.data;
  },
};
