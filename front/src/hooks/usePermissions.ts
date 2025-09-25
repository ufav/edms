import { useMemo } from 'react';
import { USER_ROLES, ROLE_PERMISSIONS, hasPermission, type UserRole } from '../utils/roles';

// Хук для проверки прав доступа пользователя
export const usePermissions = (userRole: UserRole | null) => {
  const permissions = useMemo(() => {
    if (!userRole) {
      // Если роль не определена, возвращаем все права как false
      return Object.keys(ROLE_PERMISSIONS[USER_ROLES.VIEWER]).reduce((acc, key) => {
        acc[key as keyof typeof ROLE_PERMISSIONS[UserRole]] = false;
        return acc;
      }, {} as Record<string, boolean>);
    }

    return ROLE_PERMISSIONS[userRole];
  }, [userRole]);

  // Функция для проверки конкретного права
  const checkPermission = (permission: keyof typeof ROLE_PERMISSIONS[UserRole]): boolean => {
    return hasPermission(userRole || USER_ROLES.VIEWER, permission);
  };

  return {
    permissions,
    checkPermission,
    isAdmin: userRole === USER_ROLES.ADMIN,
    isOperator: userRole === USER_ROLES.OPERATOR,
    isViewer: userRole === USER_ROLES.VIEWER
  };
};
