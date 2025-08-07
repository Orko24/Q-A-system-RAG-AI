import axios from 'axios';
import { Document, ChatSession, SearchResult } from '../types';

// In Docker: use relative URLs so Nginx can proxy to backend
// In development: use direct localhost connection  
const API_BASE_URL = process.env.NODE_ENV === 'production' ? '' : (process.env.REACT_APP_API_URL || 'http://localhost:8000');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const documentAPI = {
  upload: async (file: File, onProgress?: (progress: number) => void): Promise<Document> => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/api/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percentCompleted);
          }
        },
      });

      return response.data;
    } catch (error: any) {
      // Enhance error messages for common issues
      if (error.response?.status === 413) {
        throw new Error(`File too large: "${file.name}" exceeds the 50MB limit`);
      } else if (error.response?.status === 400) {
        throw new Error(error.response?.data?.detail || 'Invalid file format or size');
      } else if (error.response?.status >= 500) {
        throw new Error('Server error occurred while uploading');
      } else if (error.message?.includes('Network Error')) {
        throw new Error('Network connection failed. Please check your internet connection.');
      }
      
      // Re-throw original error if not handled above
      throw error;
    }
  },

  list: async (): Promise<Document[]> => {
    const response = await api.get('/api/documents/');
    return response.data;
  },

  get: async (id: number): Promise<Document> => {
    const response = await api.get(`/api/documents/${id}`);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/documents/${id}`);
  },

  getStatus: async (id: number): Promise<{
    id: number;
    status: string;
    total_chunks: number;
    error_message?: string;
  }> => {
    const response = await api.get(`/api/documents/${id}/status`);
    return response.data;
  },
};

export const chatAPI = {
  getSessions: async (documentId: number): Promise<ChatSession[]> => {
    const response = await api.get(`/api/chat/${documentId}/sessions`);
    return response.data;
  },

  getSession: async (sessionId: number): Promise<ChatSession> => {
    const response = await api.get(`/api/chat/sessions/${sessionId}`);
    return response.data;
  },

  deleteSession: async (sessionId: number): Promise<void> => {
    await api.delete(`/api/chat/sessions/${sessionId}`);
  },
};

export const searchAPI = {
  semantic: async (query: string, documentId: number, topK: number = 5): Promise<{
    results: SearchResult[];
    query: string;
  }> => {
    const response = await api.post('/api/search/semantic', {
      query,
      document_id: documentId,
      top_k: topK,
    });
    return response.data;
  },

  health: async (): Promise<{
    status: string;
    vector_store: any;
  }> => {
    const response = await api.get('/api/search/health');
    return response.data;
  },
};

export const systemAPI = {
  health: async (): Promise<{
    status: string;
    database: string;
    vector_store: string;
    api_keys: { openai: boolean; claude: boolean };
    upload_dir: boolean;
    chroma_dir: boolean;
  }> => {
    const response = await api.get('/health');
    return response.data;
  },

  info: async (): Promise<{
    max_file_size_mb: number;
    supported_file_types: string[];
    chunk_size: number;
    chunk_overlap: number;
    embedding_model: string;
    available_llms: string[];
  }> => {
    const response = await api.get('/api/info');
    return response.data;
  },
};

export default api;
