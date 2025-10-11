import { useState } from 'react';
import { projectStore } from '../../../stores/ProjectStore';
import { projectsApi } from '../../../api/client';

interface UseProjectActionsProps {
  t: (key: string, options?: any) => string;
}

export interface UseProjectActionsReturn {
  successNotification: {
    open: boolean;
    message: string;
  };
  setSuccessNotification: (notification: { open: boolean; message: string }) => void;
  handleCreate: () => void;
  handleCreateSuccess: (newProject: any) => void;
  handleEdit: (projectId: number) => void;
  handleDelete: (projectId: number) => void;
  handleDeleteProject: (projectId: number) => Promise<void>;
  handleProjectSaved: () => void;
  handleCloseNotification: () => void;
}

export const useProjectActions = ({ t }: UseProjectActionsProps): UseProjectActionsReturn => {
  const [successNotification, setSuccessNotification] = useState<{
    open: boolean;
    message: string;
  }>({ open: false, message: '' });

  const handleCreate = () => {
    // Эта функция будет использоваться в useProjectDialogs
    // Здесь оставляем пустой, логика будет в диалогах
  };

  const handleCreateSuccess = (newProject: any) => {
    projectStore.loadProjects(true); // Принудительно обновляем список проектов
    projectStore.selectProject(newProject); // Выбираем только что созданный проект
    
    // Показываем уведомление об успешном создании
    setSuccessNotification({
      open: true,
      message: t('projects.created_notification', { name: newProject.name })
    });
  };

  const handleEdit = (projectId: number) => {
    // Эта функция будет использоваться в useProjectDialogs
    // Здесь оставляем пустой, логика будет в диалогах
  };

  const handleDelete = (projectId: number) => {
    // Эта функция будет использоваться в useProjectDialogs
    // Здесь оставляем пустой, логика будет в диалогах
  };

  const handleDeleteProject = async (projectId: number) => {
    try {
      await projectsApi.delete(projectId);
      
      // Удаляем проект из стора моментально
      projectStore.removeProject(projectId);
    } catch (error) {
      console.error('Ошибка при удалении проекта:', error);
      throw error; // Перебрасываем ошибку, чтобы хук мог её обработать
    }
  };

  const handleProjectSaved = () => {
    projectStore.loadProjects(true);
    setSuccessNotification({
      open: true,
      message: t('projects.updated_notification')
    });
  };

  const handleCloseNotification = () => {
    setSuccessNotification({ open: false, message: '' });
  };

  return {
    successNotification,
    setSuccessNotification,
    handleCreate,
    handleCreateSuccess,
    handleEdit,
    handleDelete,
    handleDeleteProject,
    handleProjectSaved,
    handleCloseNotification,
  };
};
