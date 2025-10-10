import { makeAutoObservable, runInAction } from 'mobx';
import { disciplinesApi, referencesApi, workflowPresetsApi, type Discipline, type DocumentType } from '../api/client';

class ProjectDialogStore {
  disciplines: Discipline[] = [];
  documentTypes: DocumentType[] = [];
  revisionDescriptions: any[] = [];
  revisionSteps: any[] = [];
  workflowPresets: any[] = [];
  
  // Кэш для данных конкретного проекта
  projectDataCache: { [projectId: number]: {
    disciplines: any[];
    revisionDescriptions: any[];
    revisionSteps: any[];
    workflowPreset: any;
    documentTypes: { [disciplineId: number]: any[] };
    participants: any[];
    members: any[];
  } } = {};
  
  isLoading = false;
  error: string | null = null;
  
  // Флаги для отслеживания загруженных данных
  isDisciplinesLoaded = false;
  isDocumentTypesLoaded = false;
  isRevisionDescriptionsLoaded = false;
  isRevisionStepsLoaded = false;
  isWorkflowPresetsLoaded = false;

  constructor() {
    makeAutoObservable(this);
  }

  // Загрузка всех данных для диалога проекта
  async loadAllData() {
    // Проверяем, нужно ли загружать данные
    if (this.isDisciplinesLoaded && 
        this.isDocumentTypesLoaded && 
        this.isRevisionDescriptionsLoaded && 
        this.isRevisionStepsLoaded && 
        this.isWorkflowPresetsLoaded) {
      return; // Все данные уже загружены
    }

    runInAction(() => {
      this.isLoading = true;
      this.error = null;
    });

    try {
      // Загружаем все данные параллельно
      const [disciplinesData, documentTypesData, revisionDescriptionsData, revisionStepsData, workflowPresetsData] = await Promise.all([
        disciplinesApi.getAll(),
        disciplinesApi.getDocumentTypes(),
        referencesApi.getRevisionDescriptions(),
        referencesApi.getRevisionSteps(),
        workflowPresetsApi.getAll()
      ]);

      runInAction(() => {
        this.disciplines = disciplinesData;
        this.documentTypes = documentTypesData;
        this.revisionDescriptions = revisionDescriptionsData;
        this.revisionSteps = revisionStepsData;
        this.workflowPresets = workflowPresetsData;
        
        this.isDisciplinesLoaded = true;
        this.isDocumentTypesLoaded = true;
        this.isRevisionDescriptionsLoaded = true;
        this.isRevisionStepsLoaded = true;
        this.isWorkflowPresetsLoaded = true;
      });
    } catch (error: any) {
      runInAction(() => {
        this.error = `Ошибка загрузки данных: ${error.message || 'Неизвестная ошибка'}`;
      });
      throw error;
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  // Загрузка данных конкретного проекта с кэшированием
  async loadProjectData(projectId: number) {
    // Проверяем кэш
    if (this.projectDataCache[projectId]) {
      return this.projectDataCache[projectId];
    }

    runInAction(() => {
      this.isLoading = true;
      this.error = null;
    });

    try {
      const { projectsApi, projectParticipantsApi } = await import('../api/client');
      
      // Загружаем все данные проекта параллельно
      const [
        projectDisciplines,
        projectRevisions,
        projectRevisionSteps,
        projectWorkflow,
        projectDocumentTypes,
        projectParticipants,
        projectMembers
      ] = await Promise.all([
        projectsApi.getDisciplines(projectId),
        projectsApi.getRevisionDescriptions(projectId).catch(() => []),
        projectsApi.getRevisionSteps(projectId).catch(() => []),
        projectsApi.getWorkflowPreset(projectId).catch(() => null),
        projectsApi.getAllDocumentTypes(projectId).catch(() => ({})),
        projectParticipantsApi.getAll(projectId).catch(() => []),
        projectsApi.members.getAll(projectId).catch(() => [])
      ]);

      const projectData = {
        disciplines: projectDisciplines,
        revisionDescriptions: projectRevisions,
        revisionSteps: projectRevisionSteps,
        workflowPreset: projectWorkflow,
        documentTypes: projectDocumentTypes,
        participants: projectParticipants,
        members: projectMembers
      };

      runInAction(() => {
        this.projectDataCache[projectId] = projectData;
        this.isLoading = false;
      });

      return projectData;
    } catch (error: any) {
      runInAction(() => {
        this.error = `Ошибка загрузки данных проекта: ${error.message || 'Неизвестная ошибка'}`;
        this.isLoading = false;
      });
      throw error;
    }
  }

  // Очистка кэша проекта
  clearProjectCache(projectId?: number) {
    if (projectId) {
      delete this.projectDataCache[projectId];
    } else {
      this.projectDataCache = {};
    }
  }

  // Принудительная перезагрузка workflow presets
  async reloadWorkflowPresets() {
    try {
      const workflowPresetsData = await workflowPresetsApi.getAll();
      runInAction(() => {
        this.workflowPresets = workflowPresetsData;
        this.isWorkflowPresetsLoaded = true;
      });
    } catch (error: any) {
      runInAction(() => {
        this.error = `Ошибка перезагрузки пресетов: ${error.message || 'Неизвестная ошибка'}`;
      });
      throw error;
    }
  }

  // Очистка всех данных (для принудительной перезагрузки)
  clearAll() {
    this.disciplines = [];
    this.documentTypes = [];
    this.revisionDescriptions = [];
    this.revisionSteps = [];
    this.workflowPresets = [];
    this.isDisciplinesLoaded = false;
    this.isDocumentTypesLoaded = false;
    this.isRevisionDescriptionsLoaded = false;
    this.isRevisionStepsLoaded = false;
    this.isWorkflowPresetsLoaded = false;
    this.error = null;
  }
}

export const projectDialogStore = new ProjectDialogStore();
