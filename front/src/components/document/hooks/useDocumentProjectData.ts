import { useState, useEffect, useRef } from 'react';
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
  
  // Используем ref для отслеживания последнего загруженного проекта и предотвращения повторных загрузок
  const lastLoadedProjectIdRef = useRef<number | null>(null);
  const lastLoadedDisciplineIdRef = useRef<number | null>(null);
  const lastLoadedCreatorIdRef = useRef<number | null>(null);

  // Загрузка данных проекта при открытии диалога
  useEffect(() => {
    if (open && projectStore.selectedProject?.id) {
      const projectId = projectStore.selectedProject.id;
      // Загружаем данные только если проект изменился
      if (lastLoadedProjectIdRef.current !== projectId) {
        lastLoadedProjectIdRef.current = projectId;
        loadProjectData(projectId);
      }
    } else if (!open) {
      // Сбрасываем при закрытии диалога
      lastLoadedProjectIdRef.current = null;
    }
  }, [open, projectStore.selectedProject?.id]);

  // Загрузка типов документов для текущей дисциплины в режиме редактирования
  useEffect(() => {
    if (open && isEditing && document?.discipline_id && projectStore.selectedProject?.id) {
      const disciplineId = document.discipline_id;
      // Загружаем только если дисциплина изменилась
      if (lastLoadedDisciplineIdRef.current !== disciplineId) {
        lastLoadedDisciplineIdRef.current = disciplineId;
        loadDocumentTypes(projectStore.selectedProject.id, disciplineId);
      }
    } else if (!open || !isEditing) {
      // Сбрасываем при закрытии диалога или выходе из режима редактирования
      lastLoadedDisciplineIdRef.current = null;
    }
  }, [open, isEditing, document?.discipline_id, projectStore.selectedProject?.id]);

  // Загрузка информации о создателе документа для режима просмотра
  useEffect(() => {
    if (open && !isCreating && document?.created_by) {
      const creatorId = document.created_by;
      // Загружаем только если создатель изменился
      if (lastLoadedCreatorIdRef.current !== creatorId) {
        lastLoadedCreatorIdRef.current = creatorId;
        loadDocumentCreator(creatorId);
      }
    } else if (!open || isCreating) {
      // Сбрасываем при закрытии диалога или переходе в режим создания
      lastLoadedCreatorIdRef.current = null;
    }
  }, [open, isCreating, document?.created_by]);

  // Загрузка дисциплин проекта
  const loadProjectData = async (projectId: number) => {
    setLoadingProjectData(true);
    try {
      // Загружаем дисциплины через стор
      await disciplineStore.loadDisciplines(projectId);
      
      // Загружаем workflow preset sequence для создания и просмотра документа
      try {
        const sequence = await projectsApi.getWorkflowPresetSequence(projectId);
        setWorkflowPresetSequence(sequence || []);
      } catch (error) {
        setWorkflowPresetSequence([]);
      }
      
      // Очищаем типы документов в режиме создания
      if (isCreating) {
        setProjectDocumentTypes([]);
      }
    } catch (error) {
      // Ошибка загрузки данных проекта
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
