import { useEffect } from 'react';
import { projectStore } from '../../../stores/ProjectStore';
import { documentStore } from '../../../stores/DocumentStore';
import { disciplineStore } from '../../../stores/DisciplineStore';
import { languageStore } from '../../../stores/LanguageStore';
import { userStore } from '../../../stores/UserStore';
import { referencesStore } from '../../../stores/ReferencesStore';

export interface UseDocumentDataLoadingReturn {
  // Методы для принудительной перезагрузки данных
  reloadDocuments: () => void;
  reloadDisciplines: () => void;
  reloadLanguages: () => void;
  reloadUser: () => void;
  reloadReferences: () => void;
}

export const useDocumentDataLoading = (): UseDocumentDataLoadingReturn => {
  // Загружаем документы и дисциплины при изменении проекта
  useEffect(() => {
    if (projectStore.hasSelectedProject && projectStore.selectedProject) {
      const projectId = projectStore.selectedProject.id;
      
      // Загружаем документы
      documentStore.loadDocuments(projectId);
      
      // Загружаем дисциплины проекта для боковой панели
      disciplineStore.loadDisciplines(projectId);
    } else {
      disciplineStore.clearDisciplines();
    }
  }, [projectStore.selectedProject]);

  // Загружаем языки
  useEffect(() => {
    languageStore.loadLanguages();
  }, []);

  // Загружаем информацию о пользователе
  useEffect(() => {
    userStore.loadCurrentUser();
    userStore.loadUsers(); // Загружаем всех пользователей для отображения создателей документов
  }, []);

  // Загружаем справочные данные
  useEffect(() => {
    referencesStore.loadAll();
  }, []);

  // Методы для принудительной перезагрузки данных
  const reloadDocuments = () => {
    if (projectStore.hasSelectedProject && projectStore.selectedProject) {
      documentStore.reloadDocuments(projectStore.selectedProject.id);
    }
  };

  const reloadDisciplines = () => {
    if (projectStore.hasSelectedProject && projectStore.selectedProject) {
      disciplineStore.loadDisciplines(projectStore.selectedProject.id);
    }
  };

  const reloadLanguages = () => {
    languageStore.loadLanguages();
  };

  const reloadUser = () => {
    userStore.loadCurrentUser();
  };

  const reloadReferences = () => {
    referencesStore.loadAll();
  };

  return {
    reloadDocuments,
    reloadDisciplines,
    reloadLanguages,
    reloadUser,
    reloadReferences,
  };
};
