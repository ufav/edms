import { makeAutoObservable, runInAction } from 'mobx';
import { transmittalsApi } from '../api/client';

export interface ActiveRevision {
  id: number;
  document_id: number;
  document_title: string;
  document_number: string;
  revision_number: string;
  revision_description_code?: string;
  file_name: string;
  file_type?: string;
  file_size: number;
  created_at: string;
}

class ActiveRevisionsStore {
  activeRevisions: ActiveRevision[] = [];
  isLoading = false;
  error: string | null = null;
  currentProjectId: number | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  // Загрузка активных ревизий
  async loadActiveRevisions(projectId?: number) {
    // Если это тот же проект и данные уже загружены - не загружаем повторно
    if (projectId && this.currentProjectId === projectId && this.activeRevisions.length > 0) {
      return;
    }

    runInAction(() => {
      this.isLoading = true;
      this.error = null;
    });

    try {
      const revisions = await transmittalsApi.getActiveRevisions(projectId);
      
      runInAction(() => {
        this.activeRevisions = revisions;
        this.currentProjectId = projectId || null;
      });
    } catch (err: any) {
      runInAction(() => {
        this.error = err.message || 'Ошибка загрузки активных ревизий';
        this.activeRevisions = [];
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  // Принудительная перезагрузка активных ревизий
  async refreshActiveRevisions(projectId?: number) {
    // Сбрасываем кэш для принудительной перезагрузки
    runInAction(() => {
      this.activeRevisions = [];
      this.currentProjectId = null;
    });
    
    await this.loadActiveRevisions(projectId);
  }

  // Очистка данных при смене проекта
  clearActiveRevisions() {
    runInAction(() => {
      this.activeRevisions = [];
      this.currentProjectId = null;
      this.error = null;
    });
  }

  // Получение активных ревизий по ID документа
  getActiveRevisionsByDocumentId(documentId: number): ActiveRevision[] {
    return this.activeRevisions.filter(revision => revision.document_id === documentId);
  }

  // Проверка, есть ли активная ревизия для документа
  hasActiveRevision(documentId: number): boolean {
    return this.activeRevisions.some(revision => revision.document_id === documentId);
  }
}

export const activeRevisionsStore = new ActiveRevisionsStore();
