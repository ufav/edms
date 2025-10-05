import { makeAutoObservable, runInAction } from 'mobx';
import { documentsApi, type DocumentRevisionFile } from '../api/client';

class DocumentRevisionStore {
  revisions: { [documentId: number]: DocumentRevisionFile[] } = {};
  isLoading = false;
  error: string | null = null;
  loadedDocuments: Set<number> = new Set();

  constructor() {
    makeAutoObservable(this);
  }

  // Загрузка ревизий документа
  async loadRevisions(documentId: number) {
    // Если ревизии уже загружены для этого документа - не загружаем повторно
    if (this.loadedDocuments.has(documentId)) {
      return this.revisions[documentId] || [];
    }

    runInAction(() => {
      this.isLoading = true;
      this.error = null;
    });

    try {
      const revisions = await documentsApi.getRevisions(documentId);
      runInAction(() => {
        this.revisions[documentId] = revisions;
        this.loadedDocuments.add(documentId);
      });
      return revisions;
    } catch (error) {
      runInAction(() => {
        this.error = 'Ошибка загрузки ревизий';
        this.revisions[documentId] = [];
      });
      return [];
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  // Получение ревизий документа
  getRevisions(documentId: number): DocumentRevisionFile[] {
    return this.revisions[documentId] || [];
  }

  // Очистка ревизий документа
  clearRevisions(documentId: number) {
    delete this.revisions[documentId];
    this.loadedDocuments.delete(documentId);
  }

  // Очистка всех ревизий
  clearAllRevisions() {
    this.revisions = {};
    this.loadedDocuments.clear();
    this.error = null;
  }
}

export const documentRevisionStore = new DocumentRevisionStore();
