import { useState, useEffect } from 'react';
import { authApi } from '../api/client';

interface User {
  id: number;
  username: string;
  role: string;
}

export const useCurrentUser = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const currentUser = await authApi.getCurrentUser();
        setUser({ id: currentUser.id, username: currentUser.username, role: currentUser.role });
      } catch (error) {
        console.error('Error loading current user:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadCurrentUser();
  }, []);

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
