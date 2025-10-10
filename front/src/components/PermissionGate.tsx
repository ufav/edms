import React from 'react';
import { usePermission, useRole } from '../hooks/usePermissions';

interface PermissionGateProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({ 
  permission, 
  children, 
  fallback = null 
}) => {
  const hasPermission = usePermission(permission as any);
  
  if (hasPermission) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
};

// Компонент для проверки роли
interface RoleGateProps {
  role: 'admin' | 'operator' | 'viewer';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const RoleGate: React.FC<RoleGateProps> = ({ 
  role, 
  children, 
  fallback = null 
}) => {
  const { isAdmin, isOperator, isViewer } = useRole();
  
  const hasRole = (role === 'admin' && isAdmin) || 
                 (role === 'operator' && isOperator) || 
                 (role === 'viewer' && isViewer);
  
  if (hasRole) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
};
