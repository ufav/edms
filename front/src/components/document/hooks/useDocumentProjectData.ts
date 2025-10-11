import { useState, useEffect } from 'react';
import { projectsApi } from '../../../api/client';
import { userStore } from '../../../stores/UserStore';
import { projectStore } from '../../../stores/ProjectStore';
import { disciplineStore } from '../../../stores/DisciplineStore';
import { referencesStore } from '../../../stores/ReferencesStore';

interface UseDocumentProjectDataProps {
  documentId?: number | null;
  document?: any;
  open: boolean;
  isCreating: boolean;
  isEditing?: boolean;
}

export const useDocumentProjectData = ({
  documentId,
  document,
  open,
  isCreating,
  isEditing
}: UseDocumentProjectDataProps) => {
  const [projectDocumentTypes, setProjectDocumentTypes] = useState<any[]>([]);
  const [loadingProjectData, setLoadingProjectData] = useState(false);
  const [documentCreator, setDocumentCreator] = useState<any>(null);
  const [workflowPresetSequence, setWorkflowPresetSequence] = useState<any[]>([]);

  // Загрузка данных проекта при открытии диалога
  useEffect(() => {
    if (open) {
      // Загружаем данные для создания и редактирования документа
      if ((isCreating || isEditing) && projectStore.selectedProject?.id) {
        loadProjectData(projectStore.selectedProject.id);
      }
      // Загружаем типы документов для текущей дисциплины в режиме редактирования
      if (isEditing && document?.discipline_id && projectStore.selectedProject?.id) {
        loadDocumentTypes(projectStore.selectedProject.id, document.discipline_id);
      }
      // Загружаем информацию о создателе документа для режима просмотра
      if (!isCreating && document?.created_by) {
        loadDocumentCreator(document.created_by);
      }
    }
  }, [open, isCreating, isEditing, projectStore.selectedProject?.id, documentId, document?.discipline_id]);

  // Загрузка дисциплин проекта
  const loadProjectData = async (projectId: number) => {
    setLoadingProjectData(true);
    try {
      // Загружаем дисциплины через стор
      await disciplineStore.loadDisciplines(projectId);
      
      // Загружаем workflow preset sequence для создания документа
      if (isCreating) {
        try {
          const sequence = await projectsApi.getWorkflowPresetSequence(projectId);
          setWorkflowPresetSequence(sequence || []);
        } catch (error) {
          console.error('Error loading workflow preset sequence:', error);
          setWorkflowPresetSequence([]);
        }
      }
      
      // Очищаем типы документов в режиме создания
      if (isCreating) {
        setProjectDocumentTypes([]);
      }
    } catch (error) {
      console.error('Error loading project data:', error);
    } finally {
      setLoadingProjectData(false);
    }
  };

  // Загрузка типов документов для выбранной дисциплины
  const loadDocumentTypes = async (projectId: number, disciplineId: number) => {
    try {
      const documentTypes = await projectsApi.getDocumentTypes(projectId, disciplineId);
      setProjectDocumentTypes(documentTypes || []);
      
      // Обновляем referencesStore для DRS
      referencesStore.setProjectDocumentTypes(documentTypes || []);
    } catch (error) {
      setProjectDocumentTypes([]);
      referencesStore.setProjectDocumentTypes([]);
    }
  };

  // Загрузка информации о создателе документа
  const loadDocumentCreator = async (userId: number) => {
    try {
      // Используем userStore для получения информации о пользователе
      const creator = userStore.users.find(user => user.id === userId);
      if (creator) {
        setDocumentCreator(creator);
      } else {
        // Если пользователь не найден в store, загружаем его
        await userStore.loadUsers();
        const loadedCreator = userStore.users.find(user => user.id === userId);
        setDocumentCreator(loadedCreator || null);
      }
    } catch (error) {
      // Ошибка загрузки создателя документа
      setDocumentCreator(null);
    }
  };

  return {
    // Состояние - используем дисциплины из стора
    projectDisciplines: disciplineStore.disciplines,
    projectDocumentTypes,
    loadingProjectData: disciplineStore.isLoading || loadingProjectData,
    documentCreator,
    workflowPresetSequence,
    
    // Функции
    loadProjectData,
    loadDocumentTypes,
    loadDocumentCreator,
    setProjectDocumentTypes,
  };
};
