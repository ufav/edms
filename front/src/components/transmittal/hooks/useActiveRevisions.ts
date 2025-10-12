import { useState, useEffect, useCallback } from 'react';
import { transmittalsApi } from '../../../api/client';
import { projectStore } from '../../../stores/ProjectStore';

export interface ActiveRevision {
  id: number;
  document_id: number;
  document_title: string;
  document_number: string;
  revision_number: string;
  revision_description_code?: string;
  file_name: string;
  file_type?: string;
  file_size: number;
  created_at: string;
}

export interface UseActiveRevisionsReturn {
  // Состояние
  activeRevisions: ActiveRevision[];
  isLoading: boolean;
  error: string | null;
  
  // Обработчики
  loadActiveRevisions: (projectId?: number) => Promise<void>;
  refreshActiveRevisions: () => Promise<void>;
}

export const useActiveRevisions = (): UseActiveRevisionsReturn => {
  const [activeRevisions, setActiveRevisions] = useState<ActiveRevision[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загрузка активных ревизий
  const loadActiveRevisions = useCallback(async (projectId?: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const revisions = await transmittalsApi.getActiveRevisions(projectId);
      setActiveRevisions(revisions);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки активных ревизий');
      setActiveRevisions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Обновление активных ревизий
  const refreshActiveRevisions = useCallback(async () => {
    const projectId = projectStore.selectedProject?.id;
    await loadActiveRevisions(projectId);
  }, [loadActiveRevisions]);

  // Автоматическая загрузка при изменении проекта
  useEffect(() => {
    if (projectStore.selectedProject?.id) {
      loadActiveRevisions(projectStore.selectedProject.id);
    } else {
      setActiveRevisions([]);
    }
  }, [projectStore.selectedProject?.id, loadActiveRevisions]);

  return {
    activeRevisions,
    isLoading,
    error,
    loadActiveRevisions,
    refreshActiveRevisions,
  };
};
