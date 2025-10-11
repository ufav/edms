export const formatProjectDate = (dateString: string | null): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    return dateString;
  }
};

export const formatProjectCode = (code: string | null): string => {
  if (!code) return '';
  return code.toUpperCase().trim();
};

export const formatProjectName = (name: string | null): string => {
  if (!name) return '';
  return name.trim();
};

export const formatProjectDescription = (description: string | null): string => {
  if (!description) return '';
  return description.trim();
};

export const formatProjectStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    'active': 'Активный',
    'planning': 'Планирование',
    'completed': 'Завершен',
    'cancelled': 'Отменен',
  };
  return statusMap[status] || status;
};

export const getProjectStatusColor = (status: string): 'success' | 'primary' | 'error' | 'default' => {
  const colorMap: Record<string, 'success' | 'primary' | 'error' | 'default'> = {
    'active': 'success',
    'completed': 'primary',
    'cancelled': 'error',
    'planning': 'default',
  };
  return colorMap[status] || 'default';
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatParticipantName = (participant: any): string => {
  if (!participant) return '';
  
  if (participant.contact_name) {
    return participant.contact_name;
  }
  
  if (participant.company_name) {
    return participant.company_name;
  }
  
  return 'Неизвестно';
};

export const formatUserRole = (user: any): string => {
  if (!user) return '';
  
  if (user.project_role_name) {
    return user.project_role_name;
  }
  
  return 'Роль не назначена';
};
