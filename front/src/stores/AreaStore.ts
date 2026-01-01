import { makeAutoObservable, runInAction } from 'mobx';
import { projectsApi } from '../api/client';

export interface Area {
  id: number;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
}

class AreaStore {
  areas: Area[] = [];
  isLoading = false;
  error: string | null = null;
  loadedProjectId: number | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  // Загрузка участков тех процесса проекта
  async loadAreas(projectId: number) {
    // Если areas уже загружены для этого проекта - не загружаем повторно
    if (this.loadedProjectId === projectId) {
      return;
    }
    
    // Если уже загружаем для этого проекта - не загружаем повторно
    if (this.isLoading && this.loadedProjectId === projectId) {
      return;
    }

    runInAction(() => {
      this.isLoading = true;
      this.error = null;
    });

    try {
      const list = await projectsApi.getAreas(projectId);
      runInAction(() => {
        this.areas = list;
        this.loadedProjectId = projectId;
      });
    } catch (error) {
      console.error('Error loading areas:', error);
      runInAction(() => {
        this.error = 'Ошибка загрузки участков тех процесса';
        this.areas = [];
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  // Очистка areas
  clearAreas() {
    runInAction(() => {
      this.areas = [];
      this.loadedProjectId = null;
      this.error = null;
    });
  }

  // Принудительная перезагрузка areas для проекта
  async reloadAreas(projectId: number) {
    runInAction(() => {
      this.loadedProjectId = null; // Сбрасываем кэш, чтобы загрузить заново
    });
    await this.loadAreas(projectId);
  }
}

export const areaStore = new AreaStore();
