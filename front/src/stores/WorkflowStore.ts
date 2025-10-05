import { makeAutoObservable, runInAction } from 'mobx';
import { workflowPresetsApi, referencesApi } from '../api/client';

export interface WorkflowPreset {
  id: number;
  name: string;
  description?: string;
  is_global: boolean;
  created_by?: number;
  created_at: string;
  updated_at: string;
  sequences: any[];
  rules: any[];
}

export interface RevisionDescription {
  id: number;
  code: string;
  description: string;
  description_native: string;
}

export interface RevisionStep {
  id: number;
  code: string;
  description: string;
  description_native: string;
}

export interface ReviewCode {
  id: number;
  code: string;
  description: string;
  description_native: string;
}

class WorkflowStore {
  presets: WorkflowPreset[] = [];
  revisionDescriptions: RevisionDescription[] = [];
  revisionSteps: RevisionStep[] = [];
  reviewCodes: ReviewCode[] = [];
  
  isLoading = false;
  isReferencesLoading = false;
  error: string | null = null;
  isLoaded = false;
  isReferencesLoaded = false;

  constructor() {
    makeAutoObservable(this);
  }

  // Загрузка пресетов
  async loadPresets(force = false) {
    if (this.isLoaded && !force) {
      return;
    }

    runInAction(() => {
      this.isLoading = true;
      this.error = null;
    });

    try {
      const apiPresets = await workflowPresetsApi.getAll();
      
      runInAction(() => {
        this.presets = apiPresets;
        this.isLoaded = true;
        this.isLoading = false;
      });
    } catch (error: any) {
      runInAction(() => {
        this.error = error.message || 'Ошибка загрузки пресетов';
        this.isLoading = false;
      });
      throw error;
    }
  }

  // Загрузка справочных данных
  async loadReferences(force = false) {
    if (this.isReferencesLoaded && !force) {
      return;
    }

    runInAction(() => {
      this.isReferencesLoading = true;
      this.error = null;
    });

    try {
      const [descriptions, steps, codes] = await Promise.all([
        referencesApi.getRevisionDescriptions(),
        referencesApi.getRevisionSteps(),
        referencesApi.getReviewCodes()
      ]);
      
      runInAction(() => {
        this.revisionDescriptions = descriptions;
        this.revisionSteps = steps;
        this.reviewCodes = codes;
        this.isReferencesLoaded = true;
        this.isReferencesLoading = false;
      });
    } catch (error: any) {
      runInAction(() => {
        this.error = error.message || 'Ошибка загрузки справочных данных';
        this.isReferencesLoading = false;
      });
      throw error;
    }
  }

  // Создание пресета
  async createPreset(presetData: any) {
    try {
      const newPreset = await workflowPresetsApi.create(presetData);
      
      runInAction(() => {
        this.presets.push(newPreset);
      });
      
      return newPreset;
    } catch (error: any) {
      runInAction(() => {
        this.error = error.message || 'Ошибка создания пресета';
      });
      throw error;
    }
  }

  // Обновление пресета
  async updatePreset(id: number, presetData: any) {
    try {
      const updatedPreset = await workflowPresetsApi.update(id, presetData);
      
      runInAction(() => {
        const index = this.presets.findIndex(p => p.id === id);
        if (index !== -1) {
          this.presets[index] = updatedPreset;
        }
      });
      
      return updatedPreset;
    } catch (error: any) {
      runInAction(() => {
        this.error = error.message || 'Ошибка обновления пресета';
      });
      throw error;
    }
  }

  // Удаление пресета
  async deletePreset(id: number) {
    try {
      await workflowPresetsApi.delete(id);
      
      runInAction(() => {
        this.presets = this.presets.filter(p => p.id !== id);
      });
    } catch (error: any) {
      runInAction(() => {
        this.error = error.message || 'Ошибка удаления пресета';
      });
      throw error;
    }
  }

  // Очистка ошибок
  clearError() {
    this.error = null;
  }

  // Очистка данных
  clearData() {
    this.presets = [];
    this.revisionDescriptions = [];
    this.revisionSteps = [];
    this.reviewCodes = [];
    this.isLoaded = false;
    this.isReferencesLoaded = false;
    this.error = null;
  }
}

export const workflowStore = new WorkflowStore();
