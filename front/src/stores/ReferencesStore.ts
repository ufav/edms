import { makeAutoObservable, runInAction } from 'mobx';
import { referencesApi, documentTypesApi, type RevisionDescription, type RevisionStatus, type RevisionStep, type ReviewCode, type DocumentType } from '../api/client';

class ReferencesStore {
  revisionDescriptions: RevisionDescription[] = [];
  revisionStatuses: RevisionStatus[] = [];
  revisionSteps: RevisionStep[] = [];
  reviewCodes: ReviewCode[] = [];
  documentTypes: DocumentType[] = [];
  
  isLoading = false;
  error: string | null = null;
  
  // Флаги для отслеживания загруженных данных
  isDescriptionsLoaded = false;
  isStatusesLoaded = false;
  isStepsLoaded = false;
  isReviewCodesLoaded = false;
  isDocumentTypesLoaded = false;

  constructor() {
    makeAutoObservable(this);
  }

  // Загрузка описаний ревизий
  async loadRevisionDescriptions() {
    if (this.isDescriptionsLoaded) return;

    runInAction(() => {
      this.isLoading = true;
      this.error = null;
    });

    try {
      const descriptions = await referencesApi.getRevisionDescriptions();
      runInAction(() => {
        this.revisionDescriptions = descriptions;
        this.isDescriptionsLoaded = true;
      });
    } catch (error) {
      runInAction(() => {
        this.error = 'Ошибка загрузки описаний ревизий';
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  // Загрузка статусов ревизий
  async loadRevisionStatuses() {
    if (this.isStatusesLoaded) return;

    runInAction(() => {
      this.isLoading = true;
      this.error = null;
    });

    try {
      const statuses = await referencesApi.getRevisionStatuses();
      runInAction(() => {
        this.revisionStatuses = statuses;
        this.isStatusesLoaded = true;
      });
    } catch (error) {
      runInAction(() => {
        this.error = 'Ошибка загрузки статусов ревизий';
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  // Загрузка шагов ревизий
  async loadRevisionSteps() {
    if (this.isStepsLoaded) return;

    runInAction(() => {
      this.isLoading = true;
      this.error = null;
    });

    try {
      const steps = await referencesApi.getRevisionSteps();
      runInAction(() => {
        this.revisionSteps = steps;
        this.isStepsLoaded = true;
      });
    } catch (error) {
      runInAction(() => {
        this.error = 'Ошибка загрузки шагов ревизий';
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  // Загрузка кодов ревью
  async loadReviewCodes() {
    if (this.isReviewCodesLoaded) return;

    runInAction(() => {
      this.isLoading = true;
      this.error = null;
    });

    try {
      const codes = await referencesApi.getReviewCodes();
      runInAction(() => {
        this.reviewCodes = codes;
        this.isReviewCodesLoaded = true;
      });
    } catch (error) {
      runInAction(() => {
        this.error = 'Ошибка загрузки кодов ревью';
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  // Загрузка типов документов
  async loadDocumentTypes() {
    if (this.isDocumentTypesLoaded) return;

    runInAction(() => {
      this.isLoading = true;
      this.error = null;
    });

    try {
      const documentTypes = await documentTypesApi.getAll();
      runInAction(() => {
        this.documentTypes = documentTypes;
        this.isDocumentTypesLoaded = true;
      });
    } catch (error) {
      runInAction(() => {
        this.error = 'Ошибка загрузки типов документов';
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  // Загрузка всех справочников
  async loadAll() {
    await Promise.all([
      this.loadRevisionDescriptions(),
      this.loadRevisionStatuses(),
      this.loadRevisionSteps(),
      this.loadReviewCodes(),
      this.loadDocumentTypes()
    ]);
  }

  // Получение описания ревизии по ID
  getRevisionDescription(id?: number): RevisionDescription | undefined {
    return this.revisionDescriptions.find(desc => desc.id === id);
  }

  // Получение статуса ревизии по ID
  getRevisionStatus(id?: number): RevisionStatus | undefined {
    return this.revisionStatuses.find(status => status.id === id);
  }

  // Получение шага ревизии по ID
  getRevisionStep(id?: number): RevisionStep | undefined {
    return this.revisionSteps.find(step => step.id === id);
  }

  // Получение кода ревью по ID
  getReviewCode(id?: number): ReviewCode | undefined {
    return this.reviewCodes.find(code => code.id === id);
  }

  // Получение типа документа по ID
  getDocumentType(id?: number): DocumentType | undefined {
    return this.documentTypes.find(type => type.id === id);
  }

  // Получение полного номера ревизии (код + номер)
  getFullRevisionNumber(revision: { number?: string; revision_description_id?: number }): string {
    const description = this.getRevisionDescription(revision.revision_description_id);
    const code = description?.code || '?'; // Показываем "?" если код не найден
    const number = revision.number || '01'; // Дефолтный номер если не указан
    return `${code}${number}`;
  }

  // Получение локализованного названия статуса ревизии
  getRevisionStatusLabel(statusId?: number, language: string = 'ru'): string {
    const status = this.getRevisionStatus(statusId);
    if (!status) return language === 'en' ? 'Not defined' : 'Не определен';
    
    // Если английский язык и есть английское название - используем его
    if (language === 'en' && status.name) {
      return status.name;
    }
    
    // Иначе используем русское название или fallback на английское
    return status.name_native || status.name || (language === 'en' ? 'Not defined' : 'Не определен');
  }

  // Получение локализованного названия шага ревизии
  getRevisionStepLabel(stepId?: number, language: string = 'ru'): string {
    const step = this.getRevisionStep(stepId);
    if (!step) return language === 'en' ? 'Not defined' : 'Не определен';
    
    // Возвращаем код шага вместо описания
    return step.code || (language === 'en' ? 'Not defined' : 'Не определен');
  }

  // Получение локализованного названия кода ревью
  getReviewCodeLabel(codeId?: number, language: string = 'ru'): string {
    const code = this.getReviewCode(codeId);
    if (!code) return language === 'en' ? 'Not defined' : 'Не определен';
    
    // Если английский язык и есть английское название - используем его
    if (language === 'en' && code.name) {
      return code.name;
    }
    
    // Иначе используем русское название или fallback на английское
    return code.name_native || code.name || (language === 'en' ? 'Not defined' : 'Не определен');
  }

  // Очистка всех данных
  clearAll() {
    this.revisionDescriptions = [];
    this.revisionStatuses = [];
    this.revisionSteps = [];
    this.reviewCodes = [];
    this.documentTypes = [];
    this.isDescriptionsLoaded = false;
    this.isStatusesLoaded = false;
    this.isStepsLoaded = false;
    this.isReviewCodesLoaded = false;
    this.isDocumentTypesLoaded = false;
    this.error = null;
  }
}

export const referencesStore = new ReferencesStore();
