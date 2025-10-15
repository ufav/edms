import { makeAutoObservable, runInAction } from 'mobx';
import { projectsApi } from '../api/client';
import type { ProjectParticipant } from '../api/client';

export interface Project {
  id: number;
  name: string;
  description: string;
  project_code: string;
  status: string;
  start_date: string;
  end_date: string;
  owner_id?: number | null;
  owner_name?: string | null;
  created_at: string;
  updated_at: string;
  participants?: ProjectParticipant[];
}

// Используем интерфейс из API

class ProjectStore {
  projects: Project[] = [];
  selectedProject: Project | null = null;
  isLoading = false;
  error: string | null = null;
  isLoaded = false; // Флаг для отслеживания загрузки

  constructor() {
    makeAutoObservable(this);
    // Не загружаем проекты сразу, ждем аутентификации
  }

  // Загрузка проектов из API
  async loadProjects(force = false) {
    // Если проекты уже загружены, не загружаем повторно (если не принудительная загрузка)
    if (this.isLoaded && !force) {
      return;
    }

    runInAction(() => {
      this.isLoading = true;
      this.error = null;
    });
    
    try {
      const apiProjects = await projectsApi.getAll();
      
      runInAction(() => {
        this.projects = apiProjects.map(apiProject => ({
          id: apiProject.id,
          name: apiProject.name,
          description: apiProject.description,
          project_code: apiProject.project_code || '',
          status: apiProject.status,
          start_date: apiProject.start_date || '',
          end_date: apiProject.end_date || '',
          owner_id: apiProject.owner_id ?? null,
          owner_name: apiProject.owner_name ?? null,
          created_at: apiProject.created_at || '',
          updated_at: apiProject.updated_at || '',
          participants: apiProject.participants || []
        }));
        this.isLoaded = true;
      });
    } catch (error) {
      runInAction(() => {
        this.error = 'Ошибка загрузки проектов';
        this.projects = [];
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  // Выбор проекта
  selectProject(project: Project) {
    this.selectedProject = project;
  }

  // Удаление проекта из стора (для soft delete)
  removeProject(projectId: number) {
    runInAction(() => {
      this.projects = this.projects.filter(project => project.id !== projectId);
      // Если удаляемый проект был выбран, сбрасываем выбор
      if (this.selectedProject && this.selectedProject.id === projectId) {
        this.selectedProject = null;
      }
    });
  }

  // Получение проекта по ID
  getProjectById(id: number): Project | undefined {
    return this.projects.find(project => project.id === id);
  }

  // Проверка, выбран ли проект
  get hasSelectedProject(): boolean {
    return this.selectedProject !== null;
  }

  // Получение статуса проекта
  getProjectStatusLabel(status: string): string {
    const statusMap: { [key: string]: string } = {
      'planning': 'Планирование',
      'active': 'Активный',
      'completed': 'Завершен',
      'cancelled': 'Отменен'
    };
    return statusMap[status] || status;
  }

  // Получение цвета статуса проекта
  getProjectStatusColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      'planning': 'warning',
      'active': 'success',
      'completed': 'info',
      'cancelled': 'error'
    };
    return colorMap[status] || 'default';
  }

  // Очистка проектов при выходе
  clearProjects() {
    this.projects = [];
    this.selectedProject = null;
    this.error = null;
    this.isLoaded = false;
  }
}

export const projectStore = new ProjectStore();
