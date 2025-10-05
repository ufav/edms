import { makeAutoObservable, runInAction } from 'mobx';
import { projectsApi } from '../api/client';

export interface Discipline {
  id: number;
  name: string;
  name_en?: string;
  code: string;
  description?: string;
}

class DisciplineStore {
  disciplines: Discipline[] = [];
  isLoading = false;
  error: string | null = null;
  loadedProjectId: number | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  // Загрузка дисциплин проекта
  async loadDisciplines(projectId: number) {
    // Если дисциплины уже загружены для этого проекта - не загружаем повторно
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
      const list = await projectsApi.getDisciplines(projectId);
      runInAction(() => {
        this.disciplines = list;
        this.loadedProjectId = projectId;
      });
    } catch (error) {
      runInAction(() => {
        this.error = 'Ошибка загрузки дисциплин';
        this.disciplines = [];
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  // Очистка дисциплин
  clearDisciplines() {
    this.disciplines = [];
    this.loadedProjectId = null;
    this.error = null;
  }
}

export const disciplineStore = new DisciplineStore();
