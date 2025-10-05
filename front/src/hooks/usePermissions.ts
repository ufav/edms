import { useMemo } from 'react';
import { 
  SYSTEM_ROLES, 
  SYSTEM_ROLE_PERMISSIONS, 
  hasSystemPermission, 
  type SystemRoleCode,
  PROJECT_ROLES,
  PROJECT_ROLE_PERMISSIONS,
  hasProjectPermission,
  type ProjectRoleCode
} from '../types/roles';

// Хук для проверки системных прав доступа
export const useSystemPermissions = (userRole: SystemRoleCode | null) => {
  const permissions = useMemo(() => {
    if (!userRole) {
      // Если роль не определена, возвращаем все права как false
      return Object.keys(SYSTEM_ROLE_PERMISSIONS[SYSTEM_ROLES.VIEWER]).reduce((acc, key) => {
        acc[key as keyof typeof SYSTEM_ROLE_PERMISSIONS[SystemRoleCode]] = false;
        return acc;
      }, {} as Record<string, boolean>);
    }

    return SYSTEM_ROLE_PERMISSIONS[userRole];
  }, [userRole]);

  // Функция для проверки конкретного права
  const checkPermission = (permission: keyof typeof SYSTEM_ROLE_PERMISSIONS[SystemRoleCode]): boolean => {
    return hasSystemPermission(userRole || SYSTEM_ROLES.VIEWER, permission);
  };

  return {
    permissions,
    checkPermission,
    isAdmin: userRole === SYSTEM_ROLES.ADMIN,
    isOperator: userRole === SYSTEM_ROLES.OPERATOR,
    isViewer: userRole === SYSTEM_ROLES.VIEWER
  };
};

// Хук для проверки проектных прав доступа
export const useProjectPermissions = (projectRole: ProjectRoleCode | null) => {
  const permissions = useMemo(() => {
    if (!projectRole) {
      // Если роль не определена, возвращаем все права как false
      return Object.keys(PROJECT_ROLE_PERMISSIONS[PROJECT_ROLES.VIEWER]).reduce((acc, key) => {
        acc[key as keyof typeof PROJECT_ROLE_PERMISSIONS[ProjectRoleCode]] = false;
        return acc;
      }, {} as Record<string, boolean>);
    }

    return PROJECT_ROLE_PERMISSIONS[projectRole];
  }, [projectRole]);

  // Функция для проверки конкретного права
  const checkPermission = (permission: keyof typeof PROJECT_ROLE_PERMISSIONS[ProjectRoleCode]): boolean => {
    return hasProjectPermission(projectRole || PROJECT_ROLES.VIEWER, permission);
  };

  return {
    permissions,
    checkPermission,
    isOwner: projectRole === PROJECT_ROLES.OWNER,
    isManager: projectRole === PROJECT_ROLES.MANAGER,
    isReviewer: projectRole === PROJECT_ROLES.REVIEWER,
    isContributor: projectRole === PROJECT_ROLES.CONTRIBUTOR,
    isViewer: projectRole === PROJECT_ROLES.VIEWER
  };
};

// Обратная совместимость - старый хук
export const usePermissions = (userRole: SystemRoleCode | null) => {
  return useSystemPermissions(userRole);
};
