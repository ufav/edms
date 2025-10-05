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

  const isSuperAdmin = user?.role === 'superadmin';
  const isAdmin = user?.role === 'admin';
  const isOperator = user?.role === 'operator';
  const isViewer = user?.role === 'viewer';

  // Функция для проверки, может ли пользователь управлять проектом
  const canManageProject = (project: any) => {
    if (!user) return false;
    
    // Суперадмин может управлять любыми проектами
    if (isSuperAdmin) return true;
    
    // Проверяем роль пользователя в проекте
    return project.user_role === 'admin';
  };

  return {
    user,
    isLoading,
    isSuperAdmin,
    isAdmin,
    isOperator,
    isViewer,
    canManageProject
  };
};
