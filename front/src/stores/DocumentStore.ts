import { makeAutoObservable, runInAction } from 'mobx';
import { documentsApi, type Document as ApiDocument } from '../api/client';

export interface Document {
  id: number;
  title: string;
  description: string;
  file_name: string;
  file_size: number;
  file_type: string;
  version: string;
  status: string;
  project_id: number;
  uploaded_by: number;
  file_path: string;
  created_at: string;
  updated_at: string;
}

class DocumentStore {
  documents: Document[] = [];
  isLoading = false;
  error: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  // Загрузка документов из API
  async loadDocuments(projectId?: number) {
    console.log('Loading documents from API...', projectId ? `for project ${projectId}` : 'all');
    runInAction(() => {
      this.isLoading = true;
      this.error = null;
    });
    
    try {
      const apiDocuments = await documentsApi.getAll(projectId);
      runInAction(() => {
        this.documents = apiDocuments.map(apiDoc => ({
          id: apiDoc.id,
          title: apiDoc.title,
          description: apiDoc.description,
          file_name: apiDoc.file_name,
          file_size: apiDoc.file_size,
          file_type: apiDoc.file_type,
          version: apiDoc.version,
          status: apiDoc.status,
          project_id: apiDoc.project_id,
          uploaded_by: apiDoc.uploaded_by,
          file_path: apiDoc.file_path,
          created_at: apiDoc.created_at,
          updated_at: apiDoc.updated_at
        }));
        console.log('Documents loaded from API:', this.documents.length);
      });
    } catch (error) {
      console.error('Error loading documents:', error);
      runInAction(() => {
        this.error = 'Ошибка загрузки документов';
        this.documents = [];
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  // Получение документа по ID
  getDocumentById(id: number): Document | undefined {
    return this.documents.find(doc => doc.id === id);
  }

  // Получение документов по проекту
  getDocumentsByProject(projectId: number): Document[] {
    return this.documents.filter(doc => doc.project_id === projectId);
  }

  // Получение статуса документа
  getDocumentStatusLabel(status: string): string {
    const statusMap: { [key: string]: string } = {
      'draft': 'Черновик',
      'review': 'На ревью',
      'approved': 'Утвержден',
      'rejected': 'Отклонен',
      'archived': 'Архив'
    };
    return statusMap[status] || status;
  }

  // Получение цвета статуса документа
  getDocumentStatusColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      'draft': 'default',
      'review': 'warning',
      'approved': 'success',
      'rejected': 'error',
      'archived': 'info'
    };
    return colorMap[status] || 'default';
  }

  // Форматирование размера файла
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const documentStore = new DocumentStore();
