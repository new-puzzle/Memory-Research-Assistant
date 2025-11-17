/**
 * API client for backend communication
 */
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_BASE_URL}/api/v1`,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Unauthorized - clear token and redirect to login
          localStorage.removeItem('auth_token');
          window.location.href = '/';
        }
        return Promise.reject(error);
      }
    );
  }

  // Generic request methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  // Auth endpoints
  async authenticateWithGoogle(token: string) {
    return this.post('/auth/google', { token });
  }

  async getCurrentUser() {
    return this.get('/auth/me');
  }

  async refreshToken() {
    return this.post('/auth/refresh');
  }

  // Research endpoints
  async fetchResearch(data: {
    topic: string;
    context?: string;
    max_papers?: number;
    include_arxiv?: boolean;
  }) {
    return this.post('/research/fetch-research', data);
  }

  async explainTopic(data: {
    topic: string;
    prerequisite?: string;
    related_field?: string;
    complexity_level?: 'beginner' | 'intermediate' | 'advanced';
  }) {
    return this.post('/research/explain-topic', data);
  }

  async organizeNotes(data: {
    notes: Array<{
      id: string;
      title: string;
      content: string;
      content_type?: string;
      tags?: string[];
    }>;
    existing_structure?: any;
  }) {
    return this.post('/research/organize-notes', data);
  }

  // Storage endpoints
  async saveFile(data: {
    filename: string;
    content: string;
    content_type?: string;
    folder_path?: string;
  }) {
    return this.post('/storage/save-file', data);
  }

  async loadFile(data: {
    file_id?: string;
    filename?: string;
    folder_path?: string;
  }) {
    return this.post('/storage/load-file', data);
  }

  async listFiles(folder_path: string = '/Memory-Palace') {
    return this.get(`/storage/list-files?folder_path=${encodeURIComponent(folder_path)}`);
  }

  // Health check
  async healthCheck() {
    return this.get('/health', {
      baseURL: API_BASE_URL, // Use base URL without /api/v1
    });
  }
}

export const apiClient = new ApiClient();
export default apiClient;
