// Константы ролей пользователей
export const USER_ROLES = {
  ADMIN: 'admin',
  OPERATOR: 'operator', 
  VIEWER: 'viewer'
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// Права доступа для каждой роли
export const ROLE_PERMISSIONS = {
  [USER_ROLES.ADMIN]: {
    canCreateProjects: true,
    canEditProjects: true,
    canDeleteProjects: true,
    canViewProjects: true,
    canCreateDocuments: true,
    canEditDocuments: true,
    canDeleteDocuments: true,
    canViewDocuments: true,
    canCreateTransmittals: true,
    canEditTransmittals: true,
    canDeleteTransmittals: true,
    canViewTransmittals: true,
    canCreateReviews: true,
    canEditReviews: true,
    canDeleteReviews: true,
    canViewReviews: true,
    canManageUsers: true,
    canViewUsers: true,
    canViewDashboard: true
  },
  [USER_ROLES.OPERATOR]: {
    canCreateProjects: true,
    canEditProjects: true,
    canDeleteProjects: false,
    canViewProjects: true,
    canCreateDocuments: true,
    canEditDocuments: true,
    canDeleteDocuments: true,
    canViewDocuments: true,
    canCreateTransmittals: true,
    canEditTransmittals: true,
    canDeleteTransmittals: false,
    canViewTransmittals: true,
    canCreateReviews: true,
    canEditReviews: true,
    canDeleteReviews: false,
    canViewReviews: true,
    canManageUsers: false,
    canViewUsers: true,
    canViewDashboard: true
  },
  [USER_ROLES.VIEWER]: {
    canCreateProjects: false,
    canEditProjects: false,
    canDeleteProjects: false,
    canViewProjects: true,
    canCreateDocuments: false,
    canEditDocuments: false,
    canDeleteDocuments: false,
    canViewDocuments: true,
    canCreateTransmittals: false,
    canEditTransmittals: false,
    canDeleteTransmittals: false,
    canViewTransmittals: true,
    canCreateReviews: false,
    canEditReviews: false,
    canDeleteReviews: false,
    canViewReviews: true,
    canManageUsers: false,
    canViewUsers: false,
    canViewDashboard: true
  }
} as const;

// Функция для проверки прав доступа
export const hasPermission = (userRole: UserRole, permission: keyof typeof ROLE_PERMISSIONS[UserRole]): boolean => {
  return ROLE_PERMISSIONS[userRole]?.[permission] || false;
};

// Функция для получения названия роли
export const getRoleLabel = (role: UserRole): string => {
  const roleLabels: Record<UserRole, string> = {
    [USER_ROLES.ADMIN]: 'Администратор',
    [USER_ROLES.OPERATOR]: 'Оператор',
    [USER_ROLES.VIEWER]: 'Читатель'
  };
  return roleLabels[role] || role;
};

// Функция для получения цвета роли
export const getRoleColor = (role: UserRole): 'error' | 'warning' | 'info' | 'default' => {
  const roleColors: Record<UserRole, 'error' | 'warning' | 'info' | 'default'> = {
    [USER_ROLES.ADMIN]: 'error',
    [USER_ROLES.OPERATOR]: 'warning',
    [USER_ROLES.VIEWER]: 'info'
  };
  return roleColors[role] || 'default';
};
