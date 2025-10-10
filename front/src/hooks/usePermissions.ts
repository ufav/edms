import { useMemo } from 'react';
import { userStore } from '../stores/UserStore';

export interface Permission {
  canViewUsers: boolean;
  canViewAdmin: boolean;
  canCreateProjects: boolean;
  canDeleteProjects: boolean; // Только свои проекты для operator
  canDeleteAnyProjects: boolean; // Любые проекты для admin
  canManageProjectMembers: boolean;
  canViewAllProjects: boolean;
  canViewWorkflows: boolean;
}

export const usePermissions = (): Permission => {
  const user = userStore.currentUser;
  
  return useMemo(() => {
    if (!user) {
      return {
        canViewUsers: false,
        canViewAdmin: false,
        canCreateProjects: false,
        canDeleteProjects: false,
        canDeleteAnyProjects: false,
        canManageProjectMembers: false,
        canViewAllProjects: false,
        canViewWorkflows: false,
      };
    }

    const role = user.role;
    
    switch (role) {
      case 'admin':
        return {
          canViewUsers: true,
          canViewAdmin: true,
          canCreateProjects: true,
          canDeleteProjects: true, // Может удалять любые проекты
          canDeleteAnyProjects: true, // Может удалять любые проекты
          canManageProjectMembers: true,
          canViewAllProjects: true,
          canViewWorkflows: true,
        };
      
      case 'operator':
        return {
          canViewUsers: false,
          canViewAdmin: false,
          canCreateProjects: true,
          canDeleteProjects: true, // Может удалять только свои проекты
          canDeleteAnyProjects: false, // НЕ может удалять чужие проекты
          canManageProjectMembers: true, // В рамках своих проектов
          canViewAllProjects: false, // Только свои проекты
          canViewWorkflows: true,
        };
      
      case 'viewer':
        return {
          canViewUsers: false,
          canViewAdmin: false,
          canCreateProjects: false,
          canDeleteProjects: false,
          canDeleteAnyProjects: false,
          canManageProjectMembers: false,
          canViewAllProjects: false,
          canViewWorkflows: false,
        };
      
      default:
        return {
          canViewUsers: false,
          canViewAdmin: false,
          canCreateProjects: false,
          canDeleteProjects: false,
          canDeleteAnyProjects: false,
          canManageProjectMembers: false,
          canViewAllProjects: false,
          canViewWorkflows: false,
        };
    }
  }, [user]);
};

// Хук для проверки конкретных разрешений
export const usePermission = (permission: keyof Permission): boolean => {
  const permissions = usePermissions();
  return permissions[permission];
};

// Хук для проверки роли
export const useRole = () => {
  const user = userStore.currentUser;
  return {
    isAdmin: user?.role === 'admin',
    isOperator: user?.role === 'operator',
    isViewer: user?.role === 'viewer',
    role: user?.role || null,
  };
};

// Функция для проверки, может ли пользователь удалить конкретный проект
export const canDeleteProject = (project: { created_by?: number; owner_id?: number }): boolean => {
  const user = userStore.currentUser;
  if (!user) return false;
  
  // Админ может удалять любые проекты
  if (user.role === 'admin') return true;
  
  // Оператор может удалять только свои проекты
  if (user.role === 'operator') {
    const projectOwnerId = project.created_by || project.owner_id;
    return projectOwnerId === user.id;
  }
  
  return false;
};