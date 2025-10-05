/**
 * Утилиты для локализации ролей пользователей
 */

// Маппинг ролей для локализации
export const getRoleLabel = (role: string, t: (key: string) => string): string => {
  const roleMap: { [key: string]: string } = {
    'Administrator': t('roles.admin'),
    'Operator': t('roles.operator'),
    'Viewer': t('roles.viewer'),
    // Старые роли для совместимости
    'admin': t('roles.admin'),
    'operator': t('roles.operator'),
    'viewer': t('roles.viewer'),
    'superadmin': t('roles.admin')
  };
  return roleMap[role] || role;
};

// Маппинг цветов для ролей
export const getRoleColor = (role: string): 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  const colorMap: { [key: string]: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' } = {
    'Administrator': 'error',
    'Operator': 'warning',
    'Viewer': 'info',
    // Старые роли для совместимости
    'admin': 'error',
    'operator': 'warning',
    'viewer': 'info',
    'superadmin': 'error'
  };
  return colorMap[role] || 'info';
};

// Проверка, является ли роль административной
export const isAdminRole = (role: string): boolean => {
  return role === 'Administrator' || role === 'admin' || role === 'superadmin';
};

// Проверка, является ли роль операторской
export const isOperatorRole = (role: string): boolean => {
  return role === 'Operator' || role === 'operator';
};

// Проверка, является ли роль читательской
export const isViewerRole = (role: string): boolean => {
  return role === 'Viewer' || role === 'viewer';
};
