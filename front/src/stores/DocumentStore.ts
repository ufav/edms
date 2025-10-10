import { makeAutoObservable, runInAction } from 'mobx';
import { documentsApi, type Document as ApiDocument } from '../api/client';

export type Document = ApiDocument;

class DocumentStore {
  documents: Document[] = [];
  isLoading = false;
  error: string | null = null;
  currentProjectId: number | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  // Принудительная перезагрузка документов
  async reloadDocuments(projectId?: number) {
    return this.loadDocuments(projectId, true);
  }

  // Загрузка документов из API
  async loadDocuments(projectId?: number, forceReload = false) {
    // Если это тот же проект и документы уже загружены - не загружаем повторно (если не принудительная перезагрузка)
    if (projectId && this.currentProjectId === projectId && this.documents.length > 0 && !forceReload) {
      return;
    }
    
    // Если это новый проект, очищаем старые документы
    if (projectId && this.currentProjectId !== projectId) {
      runInAction(() => {
        this.documents = [];
        this.currentProjectId = projectId;
      });
    }
    
    runInAction(() => {
      this.isLoading = true;
      this.error = null;
    });
    
    try {
      const apiDocuments = await documentsApi.getAll(projectId);
      
        runInAction(() => {
          this.documents = apiDocuments.map(apiDoc => {
            return {
            id: apiDoc.id,
            title: apiDoc.title,
            title_native: apiDoc.title_native || apiDoc.description, // Fallback на description если title_native undefined
            description: apiDoc.description,
            remarks: apiDoc.remarks,
            number: apiDoc.number,
            file_name: apiDoc.file_name,
            file_size: apiDoc.file_size,
            file_type: apiDoc.file_type,
            revision: apiDoc.revision,
            revision_description_id: apiDoc.revision_description_id,
            revision_status_id: apiDoc.revision_status_id,
            is_deleted: apiDoc.is_deleted ?? 0,
            drs: apiDoc.drs,
            project_id: apiDoc.project_id,
            language_id: apiDoc.language_id,
            uploaded_by: apiDoc.uploaded_by,
            created_by: apiDoc.created_by,
            file_path: apiDoc.file_path,
            discipline_id: apiDoc.discipline_id,
            document_type_id: apiDoc.document_type_id,
            assigned_to: apiDoc.assigned_to,
            created_at: apiDoc.created_at,
            updated_at: apiDoc.updated_at,
            // Новые поля для связанных данных
            discipline_name: apiDoc.discipline_name,
            discipline_code: apiDoc.discipline_code,
            document_type_name: apiDoc.document_type_name,
            document_type_code: apiDoc.document_type_code,
            drs: apiDoc.drs
          };
          });
          this.currentProjectId = projectId || null;
        });
    } catch (error) {
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

  // Получение статуса документа из справочника с учетом локализации
  getDocumentStatusLabel(document: Document, referencesStore: any, language: string = 'ru'): string {
    const status = referencesStore.getRevisionStatus(document.revision_status_id);
    if (!status) return language === 'en' ? 'Not defined' : 'Не определен';
    
    // Если английский язык и есть английское название - используем его
    if (language === 'en' && status.name) {
      return status.name;
    }
    
    // Иначе используем русское название или fallback на английское
    return status.name_native || status.name || (language === 'en' ? 'Not defined' : 'Не определен');
  }

  // Получение цвета статуса документа
  getDocumentStatusColor(document: Document, referencesStore: any): string {
    const status = referencesStore.getRevisionStatus(document.revision_status_id);
    const statusName = status?.name || '';
    
    // Маппинг статусов на цвета
    const colorMap: { [key: string]: string } = {
      'Active': 'success',
      'Cancelled': 'error',
      'Hold': 'warning',
      'Rejected': 'error',
      'Superseded': 'default',
      'Archieved': 'default'
    };
    return colorMap[statusName] || 'default';
  }

  // Форматирование размера файла
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Принудительное обновление документов
  async refreshDocuments(projectId?: number) {
    // Сбрасываем кэш и загружаем заново
    this.documents = [];
    this.currentProjectId = null;
    await this.loadDocuments(projectId);
  }

  // Получение полного номера ревизии (код + номер) для документа
  getFullRevisionNumber(document: Document, referencesStore: any): string {
    const description = referencesStore.getRevisionDescription(document.revision_description_id);
    const code = description?.code || 'A';
    return `${code}${document.revision || '01'}`;
  }
}

export const documentStore = new DocumentStore();
