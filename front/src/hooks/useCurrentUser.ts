import { useEffect } from 'react';
import { userStore } from '../stores/UserStore';

interface User {
  id: number;
  username: string;
  role: string;
}

export const useCurrentUser = () => {
  // Загружаем пользователя один раз при монтировании хука
  useEffect(() => {
    userStore.loadCurrentUser();
  }, []);

  const user = userStore.currentUser;
  const isLoading = !userStore.isCurrentUserLoaded;

  const isAdmin = user?.role === 'admin';
  const isOperator = user?.role === 'operator';
  const isViewer = user?.role === 'viewer';

  // Функция для проверки, может ли пользователь управлять проектом
  const canManageProject = (project: any) => {
    if (!user) return false;
    
    // Админ может управлять любыми проектами
    if (isAdmin) return true;
    
    // Проверяем роль пользователя в проекте
    return project.user_role === 'admin';
  };

  // Функция для проверки, может ли пользователь редактировать проект
  const canEditProject = (project: any) => {
    if (!user) return false;
    
    // Админ может редактировать любые проекты
    if (isAdmin) return true;
    
    // Оператор может редактировать только свои проекты (где он владелец)
    if (isOperator) {
      return project.owner_id === user.id;
    }
    
    return false;
  };

  // Функция для проверки, может ли пользователь удалить проект
  const canDeleteProject = (project: any) => {
    if (!user) return false;
    
    // Админ может удалять любые проекты
    if (isAdmin) return true;
    
    // Оператор может удалять только свои проекты (где он владелец)
    if (isOperator) {
      return project.owner_id === user.id;
    }
    
    return false;
  };

  return {
    user,
    isLoading,
    isAdmin,
    isOperator,
    isViewer,
    canManageProject,
    canEditProject,
    canDeleteProject
  };
};
