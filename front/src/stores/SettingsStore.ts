import { makeAutoObservable, runInAction } from 'mobx';
import { userSettingsApi } from '../api/client';

class SettingsStore {
  settings: { [key: string]: any } = {};
  isLoading = false;
  error: string | null = null;
  loadedSettings: Set<string> = new Set();

  constructor() {
    makeAutoObservable(this);
  }

  // Загрузка настроек пользователя
  async loadSettings(settingsType: string) {
    // Если настройки уже загружены - не загружаем повторно
    if (this.loadedSettings.has(settingsType)) {
      return this.settings[settingsType];
    }

    runInAction(() => {
      this.isLoading = true;
      this.error = null;
    });

    try {
      const settings = await userSettingsApi.get(settingsType);
      runInAction(() => {
        this.settings[settingsType] = settings;
        this.loadedSettings.add(settingsType);
      });
      return settings;
    } catch (error) {
      runInAction(() => {
        this.error = 'Ошибка загрузки настроек';
        this.settings[settingsType] = {};
      });
      return {};
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  // Получение настроек
  getSettings(settingsType: string): any {
    return this.settings[settingsType] || {};
  }

  // Сохранение настроек
  async saveSettings(settingsType: string, settings: any) {
    try {
      // Сохраняем настройки через API
      await userSettingsApi.save(settingsType, settings);
      
      // Обновляем локальное состояние
      runInAction(() => {
        this.settings[settingsType] = settings;
      });
      
      return true;
    } catch (error) {
      runInAction(() => {
        this.error = 'Ошибка сохранения настроек';
      });
      return false;
    }
  }

  // Очистка настроек
  clearSettings() {
    this.settings = {};
    this.loadedSettings.clear();
    this.error = null;
  }
}

export const settingsStore = new SettingsStore();
