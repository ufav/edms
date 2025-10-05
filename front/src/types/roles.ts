// Типы для работы с ролями

export interface SystemRole {
  id: number;
  code: string;
  name: string;
  name_en?: string;
  description?: string;
  permissions?: Record<string, any>;
  is_active: boolean;
  created_at: string;
}

export interface ProjectRole {
  id: number;
  code: string;
  name: string;
  name_en?: string;
  description?: string;
  permissions?: Record<string, any>;
  is_active: boolean;
  created_at: string;
}

export interface UserWithSystemRole {
  id: number;
  username: string;
  email: string;
  full_name: string;
  is_active: boolean;
  system_role?: SystemRole;
}

export interface ProjectMemberWithRole {
  id: number;
  project_id: number;
  user_id: number;
  role: string; // Legacy field
  project_role?: ProjectRole;
  permissions?: string;
  joined_at?: string;
  user?: UserWithSystemRole;
}

// Константы для системных ролей
export const SYSTEM_ROLES = {
  ADMIN: 'admin',
  OPERATOR: 'operator',
  VIEWER: 'viewer'
} as const;

export type SystemRoleCode = typeof SYSTEM_ROLES[keyof typeof SYSTEM_ROLES];

// Константы для проектных ролей
export const PROJECT_ROLES = {
  OWNER: 'owner',
  MANAGER: 'manager',
  REVIEWER: 'reviewer',
  CONTRIBUTOR: 'contributor',
  VIEWER: 'viewer'
} as const;

export type ProjectRoleCode = typeof PROJECT_ROLES[keyof typeof PROJECT_ROLES];

// Права доступа для системных ролей
export const SYSTEM_ROLE_PERMISSIONS = {
  [SYSTEM_ROLES.ADMIN]: {
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
    canViewDashboard: true,
    canManageSystemSettings: true
  },
  [SYSTEM_ROLES.OPERATOR]: {
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
    canViewDashboard: true,
    canManageSystemSettings: false
  },
  [SYSTEM_ROLES.VIEWER]: {
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
    canViewDashboard: true,
    canManageSystemSettings: false
  }
} as const;

// Права доступа для проектных ролей
export const PROJECT_ROLE_PERMISSIONS = {
  [PROJECT_ROLES.OWNER]: {
    canManageProject: true,
    canManageMembers: true,
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
    canApproveDocuments: true,
    canRejectDocuments: true
  },
  [PROJECT_ROLES.MANAGER]: {
    canManageProject: false,
    canManageMembers: false,
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
    canApproveDocuments: true,
    canRejectDocuments: true
  },
  [PROJECT_ROLES.REVIEWER]: {
    canManageProject: false,
    canManageMembers: false,
    canCreateDocuments: false,
    canEditDocuments: false,
    canDeleteDocuments: false,
    canViewDocuments: true,
    canCreateTransmittals: false,
    canEditTransmittals: false,
    canDeleteTransmittals: false,
    canViewTransmittals: true,
    canCreateReviews: true,
    canEditReviews: true,
    canDeleteReviews: false,
    canViewReviews: true,
    canApproveDocuments: true,
    canRejectDocuments: true
  },
  [PROJECT_ROLES.CONTRIBUTOR]: {
    canManageProject: false,
    canManageMembers: false,
    canCreateDocuments: true,
    canEditDocuments: true,
    canDeleteDocuments: false,
    canViewDocuments: true,
    canCreateTransmittals: true,
    canEditTransmittals: true,
    canDeleteTransmittals: false,
    canViewTransmittals: true,
    canCreateReviews: false,
    canEditReviews: false,
    canDeleteReviews: false,
    canViewReviews: true,
    canApproveDocuments: false,
    canRejectDocuments: false
  },
  [PROJECT_ROLES.VIEWER]: {
    canManageProject: false,
    canManageMembers: false,
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
    canApproveDocuments: false,
    canRejectDocuments: false
  }
} as const;

// Функции для проверки прав
export const hasSystemPermission = (
  userRole: SystemRoleCode, 
  permission: keyof typeof SYSTEM_ROLE_PERMISSIONS[SystemRoleCode]
): boolean => {
  return SYSTEM_ROLE_PERMISSIONS[userRole]?.[permission] ?? false;
};

export const hasProjectPermission = (
  projectRole: ProjectRoleCode, 
  permission: keyof typeof PROJECT_ROLE_PERMISSIONS[ProjectRoleCode]
): boolean => {
  return PROJECT_ROLE_PERMISSIONS[projectRole]?.[permission] ?? false;
};
