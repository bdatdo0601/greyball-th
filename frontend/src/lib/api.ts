import {
  Document,
  DocumentVersion,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  PatchRequest,
  APIResponse
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Documents
  async getDocuments(): Promise<{ documents: Document[] }> {
    return this.request<{ documents: Document[] }>('/api/documents');
  }

  async getDocument(id: string): Promise<{ document: Document }> {
    return this.request<{ document: Document }>(`/api/documents/${id}`);
  }

  async createDocument(data: CreateDocumentRequest): Promise<{ document: Document }> {
    return this.request<{ document: Document }>('/api/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDocument(id: string, data: UpdateDocumentRequest): Promise<{ document: Document }> {
    return this.request<{ document: Document }>(`/api/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async patchDocument(id: string, data: PatchRequest): Promise<{
    document: Document;
    appliedChanges: any[];
    changeCount: number;
    optimizedChangeCount: number;
    metadata?: any;
  }> {
    return this.request(`/api/documents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteDocument(id: string): Promise<{ message: string; id: string }> {
    return this.request<{ message: string; id: string }>(`/api/documents/${id}`, {
      method: 'DELETE',
    });
  }

  // Versions
  async getDocumentVersions(id: string): Promise<{ versions: DocumentVersion[] }> {
    return this.request<{ versions: DocumentVersion[] }>(`/api/documents/${id}/versions`);
  }

  // Search
  async searchDocuments(query: string): Promise<{
    documents: Document[];
    query: string;
    count: number;
  }> {
    const encodedQuery = encodeURIComponent(query);
    return this.request<{
      documents: Document[];
      query: string;
      count: number;
    }>(`/api/search?q=${encodedQuery}`);
  }

  // Health check
  async healthCheck(): Promise<{
    status: string;
    timestamp: string;
    database: string;
  }> {
    return this.request<{
      status: string;
      timestamp: string;
      database: string;
    }>('/health');
  }
}

export const apiClient = new ApiClient();
export default apiClient;
