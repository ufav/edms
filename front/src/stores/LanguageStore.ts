import { makeAutoObservable, runInAction } from 'mobx';
import { languagesApi } from '../api/client';

export interface Language {
  id: number;
  name: string;
  native_name: string;
  name_native?: string;
  code: string;
}

class LanguageStore {
  languages: Language[] = [];
  isLoading = false;
  error: string | null = null;
  isLoaded = false;

  constructor() {
    makeAutoObservable(this);
  }

  // Загрузка языков
  async loadLanguages() {
    // Если языки уже загружены - не загружаем повторно
    if (this.isLoaded) {
      return;
    }

    runInAction(() => {
      this.isLoading = true;
      this.error = null;
    });

    try {
      const list = await languagesApi.getAll();
      runInAction(() => {
        this.languages = list;
        this.isLoaded = true;
      });
    } catch (error) {
      runInAction(() => {
        this.error = 'Ошибка загрузки языков';
        this.languages = [];
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  // Очистка языков
  clearLanguages() {
    this.languages = [];
    this.isLoaded = false;
    this.error = null;
  }
}

export const languageStore = new LanguageStore();
