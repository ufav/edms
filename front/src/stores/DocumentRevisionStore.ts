import { makeAutoObservable, runInAction } from 'mobx';
import { documentsApi, type DocumentRevisionFile } from '../api/client';

class DocumentRevisionStore {
  revisions: { [documentId: number]: DocumentRevisionFile[] } = {};
  isLoading = false;
  loadingDocuments: Set<number> = new Set(); // Отслеживаем загрузку для каждого документа
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
      this.loadingDocuments.add(documentId);
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
        this.loadingDocuments.delete(documentId);
      });
    }
  }

  // Получение ревизий документа
  getRevisions(documentId: number): DocumentRevisionFile[] {
    return this.revisions[documentId] || [];
  }

  // Проверка загрузки конкретного документа
  isLoadingDocument(documentId: number): boolean {
    return this.loadingDocuments.has(documentId);
  }

  // Принудительная перезагрузка ревизий документа
  async reloadRevisions(documentId: number) {
    // Удаляем из кэша, чтобы принудительно перезагрузить
    this.loadedDocuments.delete(documentId);
    return await this.loadRevisions(documentId);
  }

  // Очистка ревизий документа
  clearRevisions(documentId: number) {
    delete this.revisions[documentId];
    this.loadedDocuments.delete(documentId);
    this.loadingDocuments.delete(documentId);
  }

  // Очистка всех ревизий
  clearAllRevisions() {
    this.revisions = {};
    this.loadedDocuments.clear();
    this.loadingDocuments.clear();
    this.error = null;
  }

  // Получение документа (из первой ревизии)
  getDocument(documentId: number): any {
    const revisions = this.getRevisions(documentId);
    if (revisions.length > 0) {
      return revisions[0].document;
    }
    return null;
  }

  // Обновление документа
  updateDocument(documentId: number, updateData: any) {
    const revisions = this.getRevisions(documentId);
    if (revisions.length > 0 && revisions[0].document) {
      // Обновляем данные документа в первой ревизии
      Object.assign(revisions[0].document, updateData);
    }
  }
}

export const documentRevisionStore = new DocumentRevisionStore();
