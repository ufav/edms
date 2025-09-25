import { makeAutoObservable, runInAction } from 'mobx';
import { projectsApi } from '../api/client';

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
}

class ProjectStore {
  projects: Project[] = [];
  selectedProject: Project | null = null;
  isLoading = false;
  error: string | null = null;

  constructor() {
    makeAutoObservable(this);
    // Не загружаем проекты сразу, ждем аутентификации
  }

  // Загрузка проектов из API
  async loadProjects() {
    console.log('🔄 Loading projects from API...');
    runInAction(() => {
      this.isLoading = true;
      this.error = null;
    });
    
    try {
      console.log('📡 Making API call to projectsApi.getAll()...');
      const apiProjects = await projectsApi.getAll();
      console.log('📦 Raw API response:', apiProjects);
      
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
          updated_at: apiProject.updated_at || ''
        }));
        console.log('✅ Projects loaded from API:', this.projects.length, 'projects');
        console.log('📋 Projects data:', this.projects);
      });
    } catch (error) {
      console.error('❌ Error loading projects:', error);
      runInAction(() => {
        this.error = 'Ошибка загрузки проектов';
        this.projects = []; // Не загружаем моковые данные
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }


  // Выбор проекта
  selectProject(project: Project) {
    console.log('Selecting project:', project);
    this.selectedProject = project;
    console.log('Selected project set:', this.selectedProject);
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
}

export const projectStore = new ProjectStore();
