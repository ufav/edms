import { useEffect, useCallback } from 'react';
import { projectStore } from '../../../stores/ProjectStore';
import { activeRevisionsStore, type ActiveRevision } from '../../../stores/ActiveRevisionsStore';

export interface UseActiveRevisionsReturn {
  // Состояние
  activeRevisions: ActiveRevision[];
  isLoading: boolean;
  error: string | null;
  
  // Обработчики
  loadActiveRevisions: (projectId?: number) => void;
  refreshActiveRevisions: () => void;
}

export const useActiveRevisions = (): UseActiveRevisionsReturn => {
  // Загрузка активных ревизий
  const loadActiveRevisions = useCallback((projectId?: number) => {
    activeRevisionsStore.loadActiveRevisions(projectId);
  }, []);

  // Обновление активных ревизий (принудительная перезагрузка)
  const refreshActiveRevisions = useCallback(() => {
    const projectId = projectStore.selectedProject?.id;
    activeRevisionsStore.refreshActiveRevisions(projectId);
  }, []);

  // Автоматическая загрузка при изменении проекта
  useEffect(() => {
    if (projectStore.selectedProject?.id) {
      loadActiveRevisions(projectStore.selectedProject.id);
    } else {
      activeRevisionsStore.clearActiveRevisions();
    }
  }, [projectStore.selectedProject?.id, loadActiveRevisions]);

  return {
    activeRevisions: activeRevisionsStore.activeRevisions,
    isLoading: activeRevisionsStore.isLoading,
    error: activeRevisionsStore.error,
    loadActiveRevisions,
    refreshActiveRevisions,
  };
};
