import axios from 'axios';

// Базовый URL API
const API_BASE_URL = (import.meta as any)?.env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

// Создаем экземпляр axios с базовой конфигурацией
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Хранилище access-токена в памяти
let ACCESS_TOKEN: string | null = null;
export const setAuthToken = (token: string) => {
  ACCESS_TOKEN = token;
};
export const removeAuthToken = () => {
  ACCESS_TOKEN = null;
};
export const getAuthToken = (): string | null => {
  return ACCESS_TOKEN;
};

// Unauthorized handler that the app can set to react on 401 (e.g., logout)
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};

// Интерсептор добавляет Authorization при наличии токена
apiClient.interceptors.request.use((config) => {
  if (ACCESS_TOKEN) {
    config.headers = config.headers || {};
    (config.headers as any)['Authorization'] = `Bearer ${ACCESS_TOKEN}`;
  }
  return config;
});

// Response interceptor: try refresh once on 401, then propagate logout
let isRefreshing = false;
let pendingQueue: Array<() => void> = [];

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error?.response?.status;

    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        if (isRefreshing) {
          // queue the request until refresh completes
          await new Promise<void>((resolve) => pendingQueue.push(resolve));
        } else {
          isRefreshing = true;
          const refreshed = await authApi.refresh();
          setAuthToken(refreshed.access_token);
          // release queued
          pendingQueue.forEach((res) => res());
          pendingQueue = [];
          isRefreshing = false;
        }
        // retry
        return apiClient(originalRequest);
      } catch (e) {
        isRefreshing = false;
        pendingQueue = [];
        removeAuthToken();
        if (onUnauthorized) onUnauthorized();
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

// Интерфейсы для типизации
export interface Project {
  id: number;
  name: string;
  description: string;
  project_code: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  client: string | null;
  created_by: number | null;
  owner_id?: number | null;
  owner_name?: string | null;
  user_role: string | null;  // Роль текущего пользователя в проекте
  members?: ProjectMember[];  // Участники проекта (пользователи)
  participants?: ProjectParticipant[];  // Участники проекта (компании)
  created_at: string | null;
  updated_at: string | null;
}

export interface Discipline {
  id: number;
  code: string;
  name: string;
  name_en?: string | null;
  description: string;
  description_en?: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface DocumentType {
  id: number;
  code: string;
  name: string;
  name_en?: string | null;
  description: string;
  description_en?: string | null;
  discipline_id?: number;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
  drs?: string | null;  // DRS из project_discipline_document_types
}

export interface Language {
  id: number;
  name: string;
  name_native?: string;
  code: string;
  is_active: boolean;
  created_at: string;
}

export interface RevisionStatus {
  id: number;
  name: string;
  name_native?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface RevisionDescription {
  id: number;
  code: string;
  description?: string;
  description_native?: string;
  phase?: string;
  is_active: boolean;
  created_at: string;
}

export interface RevisionStep {
  id: number;
  code: string;
  description?: string;
  description_native?: string;
  description_long?: string;
  is_active: boolean;
  created_at: string;
}

export interface ReviewCode {
  id: number;
  code: string;
  name: string;
  name_native?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface ProjectMember {
  id: number;
  project_id: number;
  user_id: number;
  project_role_id?: number;
  joined_at: string | null;
}

export interface ProjectParticipant {
  id: number;
  project_id: number;
  company_id: number;
  company_name: string;
  contact_id: number | null;
  company_role_id: number | null;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectParticipantCreate {
  company_id: number;
  contact_id?: number;
  company_role_id?: number;
  is_primary?: boolean;
  notes?: string;
}

export interface ProjectParticipantUpdate {
  contact_id?: number;
  company_role_id?: number;
  is_primary?: boolean;
  notes?: string;
}

export interface Company {
  id: number;
  name: string;
}

export interface Document {
  id: number;
  title: string;
  title_native?: string;  // Добавляем поле для нативного названия
  description: string;
  remarks?: string;  // Примечания (текстовое поле)
  number?: string;
  file_name: string;
  file_size: number;
  file_type: string;
  revision: string;  // Номер ревизии (01, 02, 03)
  revision_description_id?: number;  // ID описания ревизии для получения кода (A, B, C, D)
  revision_status_id?: number;  // ID статуса ревизии вместо поля status
  workflow_status_id?: number;  // ID workflow статуса последней ревизии
  is_deleted: number;
  project_id: number;
  language_id?: number;
  uploaded_by: number;
  created_by?: number;  // Создатель документа
  file_path: string;
  discipline_id?: number;
  document_type_id?: number;
  area_id?: number;
  assigned_to?: number;
  created_at: string;
  updated_at: string;
  // Новые поля для связанных данных
  discipline_name?: string;
  discipline_code?: string;
  document_type_name?: string;
  document_type_code?: string;
  drs?: string;  // DRS из project_discipline_document_types
}

// Workflow interfaces
export interface WorkflowTemplate {
  id: number;
  name: string;
  description?: string;
  discipline_id?: number;
  document_type_id?: number;
  is_active: boolean;
  created_at: string;
  steps: WorkflowStep[];
}

export interface WorkflowStep {
  id: number;
  template_id: number;
  step_order: number;
  step_name: string;
  approver_role?: string;
  approver_user_id?: number;
  is_required: boolean;
  escalation_hours: number;
  created_at: string;
}

export interface DocumentWorkflow {
  id: number;
  document_id: number;
  template_id: number;
  status: DocumentStatus;
  current_step_id?: number;
  started_at: string;
  completed_at?: string;
  created_by: number;
}

export interface DocumentApproval {
  id: number;
  workflow_id: number;
  step_id: number;
  approver_id: number;
  status: ApprovalStatus;
  comments?: string;
  approved_at?: string;
  created_at: string;
}

export interface DocumentHistory {
  id: number;
  document_id: number;
  action: string;
  old_value?: string;
  new_value?: string;
  user_id: number;
  timestamp: string;
  comment?: string;
}

export type DocumentStatus =
  | 'draft'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'archived'
  | 'superseded';

export type ApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'delegated';

export interface Transmittal {
  id: number;
  transmittal_number: string;
  title: string;
  description: string;
  project_id: number;
  sender_id: number | null;
  // New unified fields
  direction?: 'out' | 'in' | null;
  counterparty_id?: number | null;
  transmittal_date?: string | null;
  created_by: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface TransmittalUpdate {
  transmittal_number?: string;
  title?: string;
  counterparty_id?: number;
}

export interface TransmittalImportSettings {
  id: number;
  project_id: number;
  company_id: number;
  company_name: string;
  settings_key: string;
  settings_value: {
    sheet_name: string;
    metadata_fields: {
      [key: string]: {
        type: 'label_search';
        label: string;
        position: 'right' | 'left' | 'below' | 'above';
      };
    };
    table_fields: {
      [key: string]: string;
    };
    status_mapping?: Array<{
      incoming_status: string;
      system_status_id: string;
    }>;
  };
  created_at: string;
  updated_at: string;
}

export interface TransmittalImportSettingsCreate {
  project_id: number;
  company_id: number;
  settings_key: string;
  settings_value: {
    sheet_name: string;
    metadata_fields: {
      [key: string]: {
        type: 'label_search';
        label: string;
        position: 'right' | 'left' | 'below' | 'above';
      };
    };
    table_fields: {
      [key: string]: string;
    };
    status_mapping?: Array<{
      incoming_status: string;
      system_status_id: string;
    }>;
  };
}

export interface TransmittalImportSettingsUpdate {
  settings_value: {
    sheet_name: string;
    metadata_fields: {
      [key: string]: {
        type: 'label_search';
        label: string;
        position: 'right' | 'left' | 'below' | 'above';
      };
    };
    table_fields: {
      [key: string]: string;
    };
    status_mapping?: Array<{
      incoming_status: string;
      system_status_id: string;
    }>;
  };
}

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  action: string;
  entity_type: string;
  entity_id: number;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user_username: string | null;
  user_full_name: string | null;
}

// (удалены устаревшие интерфейсы documents-v2)

// Reference tables interfaces
export interface RevisionStatus {
  id: number;
  name: string;
  name_native?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface RevisionDescription {
  id: number;
  code: string;
  description?: string;
  description_native?: string;
  phase?: string;
  is_active: boolean;
  created_at: string;
}

export interface RevisionStepRef {
  id: number;
  code?: string;
  description?: string;
  description_native?: string;
  description_long?: string;
  is_active: boolean;
  created_at: string;
}

export interface Originator {
  id: number;
  name: string;
  name_native?: string;
  code?: string;
  is_active: boolean;
  created_at: string;
}

export interface ReviewCodeRef {
  id: number;
  code: string;
  name: string;
  name_native?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface LanguageRef {
  id: number;
  name: string;
  name_native?: string;
  code?: string;
  is_active: boolean;
  created_at: string;
}

// Ревизии документа (ответ бэкенда /documents/{id}/revisions)
export interface DocumentRevisionItem {
  id: number;
  document_id: number;
  number: string;
  file_name: string | null;
  file_size: number | null;
  file_type: string | null;
  change_description: string;
  uploaded_by: number | null;
  is_deleted: number;
  created_at: string;
  revision_status_id?: number;
  revision_description_id?: number;
  revision_step_id?: number;
  workflow_status_id?: number;
}

export interface Department {
  id: number;
  name: string;
  name_native?: string;
  code?: string;
  company_id?: number;
  is_active: boolean;
  created_at: string;
}

export interface Company {
  id: number;
  name: string;
  name_native?: string;
  is_active: boolean;
  created_at: string;
}

export interface Contact {
  id: number;
  company_id: number;
  company_name: string;
  full_name: string;
  position: string | null;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: number;
  name: string;
  name_native?: string;
  description?: string;
  permissions?: string;
  is_active: boolean;
  created_at: string;
}

export interface WorkflowStatus {
  id: number;
  name: string;
  name_native?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface ProjectSupportFile {
  id: number;
  file_name: string;
  file_size?: number;
  file_type?: string;
  uploaded_by?: number;
  created_at?: string;
}

// API методы для проектов
export const projectsApi = {
  // Получить все проекты
  getAll: async (): Promise<Project[]> => {
    const response = await apiClient.get('/projects/');
    return response.data;
  },

  // Получить проект по ID
  getById: async (id: number): Promise<Project> => {
    const response = await apiClient.get(`/projects/${id}`);
    return response.data;
  },

  // Проверить уникальность кода проекта
  checkCode: async (projectCode: string): Promise<{ 
    exists: boolean; 
    message: string; 
    owner?: string; 
    project_name?: string; 
    is_deleted?: boolean;
  }> => {
    const response = await apiClient.get(`/projects/check-code/${encodeURIComponent(projectCode)}`);
    return response.data;
  },

  // Создать новый проект
  create: async (projectData: Partial<Project> & { 
    selected_disciplines?: number[]; 
    discipline_document_types?: { [key: number]: Array<{ documentTypeId: number, drs?: string }> } 
  }): Promise<Project> => {
    const response = await apiClient.post('/projects/', projectData);
    return response.data;
  },

  // Обновить проект
  update: async (id: number, projectData: Partial<Project>): Promise<Project> => {
    const response = await apiClient.put(`/projects/${id}`, projectData);
    return response.data;
  },

  // Удалить проект
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/projects/${id}`);
  },

  // Управление участниками проекта
  members: {
    // Получить участников проекта
    getAll: async (projectId: number): Promise<ProjectMember[]> => {
      const response = await apiClient.get(`/projects/${projectId}/members/`);
      return response.data;
    },

    // Добавить участника к проекту
    add: async (projectId: number, memberData: { user_id: number; project_role_id?: number }): Promise<ProjectMember> => {
      const response = await apiClient.post(`/projects/${projectId}/members/`, memberData);
      return response.data;
    },

    // Удалить участника из проекта
    remove: async (projectId: number, userId: number): Promise<void> => {
      await apiClient.delete(`/projects/${projectId}/members/${userId}`);
    }
  },

  // Получить дисциплины проекта
  getDisciplines: async (projectId: number): Promise<Discipline[]> => {
    const response = await apiClient.get(`/projects/${projectId}/disciplines`);
    return response.data;
  },

  // Получить участки тех процесса проекта
  getAreas: async (projectId: number): Promise<any[]> => {
    const response = await apiClient.get(`/projects/${projectId}/areas`);
    return response.data;
  },

  // Получить типы документов для дисциплины в проекте
  getDocumentTypes: async (projectId: number, disciplineId: number): Promise<DocumentType[]> => {
    const response = await apiClient.get(`/projects/${projectId}/document-types/${disciplineId}`);
    return response.data;
  },

  // Получить все типы документов для проекта (сгруппированные по дисциплинам)
  getAllDocumentTypes: async (projectId: number): Promise<{ [disciplineId: number]: DocumentType[] }> => {
    const response = await apiClient.get(`/projects/${projectId}/document-types`);
    return response.data;
  },

  // Получить выбранные описания ревизий для проекта
  getRevisionDescriptions: async (projectId: number): Promise<any[]> => {
    const response = await apiClient.get(`/projects/${projectId}/revision-descriptions`);
    return response.data;
  },

  // Получить выбранные шаги ревизий для проекта
  getRevisionSteps: async (projectId: number): Promise<any[]> => {
    const response = await apiClient.get(`/projects/${projectId}/revision-steps`);
    return response.data;
  },

  // Получить статистику по шагам ревизий для проекта
  getRevisionStepsStats: async (projectId: number): Promise<Array<{
    step_id: number;
    step_code: string;
    step_description?: string;
    step_description_native?: string;
    documents_count: number;
  }>> => {
    const response = await apiClient.get(`/projects/${projectId}/revision-steps-stats`);
    return response.data;
  },

  // Получить выбранный пресет workflow для проекта
  getWorkflowPreset: async (projectId: number): Promise<any> => {
    const response = await apiClient.get(`/projects/${projectId}/workflow-preset`);
    return response.data;
  },

  // Получить sequence пресета workflow для проекта
  getWorkflowPresetSequence: async (projectId: number): Promise<any[]> => {
    const response = await apiClient.get(`/projects/${projectId}/workflow-preset/sequence`);
    return response.data;
  },

  // Support pack: файлы, связанные с проектом
  getSupportFiles: async (projectId: number): Promise<ProjectSupportFile[]> => {
    const response = await apiClient.get(`/projects/${projectId}/support-files`);
    return response.data;
  },

  uploadSupportFile: async (
    projectId: number,
    file: File
  ): Promise<ProjectSupportFile> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/projects/${projectId}/support-files`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteSupportFile: async (fileId: number): Promise<void> => {
    await apiClient.delete(`/projects/support-files/${fileId}`);
  },

  downloadSupportFile: async (fileId: number): Promise<Blob> => {
    const response = await apiClient.get(`/projects/support-files/${fileId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

// API методы для документов
export const documentsApi = {
  // Получить все документы (клиентская пагинация)
  getAll: async (projectId?: number, status?: string): Promise<Document[]> => {
    const params: any = {};
    if (projectId) params.project_id = projectId;
    if (status) params.status = status;
    // Убираем лимит и офсет - загружаем все документы
    const response = await apiClient.get('/documents/', { params });
    const data = response.data;

    // Бэкенд возвращает Page-структуру: { items, total, page, size, pages }
    // Для client-side логики здесь нужны только элементы.
    if (Array.isArray(data)) {
      return data as Document[];
    }
    if (data && Array.isArray(data.items)) {
      return data.items as Document[];
    }
    return [];
  },

  // Получить документы с серверной пагинацией
  getPage: async (params: {
    page?: number;
    size?: number;
    project_id?: number;
    status?: string;
    search?: string;
    discipline_id?: number;
    document_type_id?: number;
    revision_description_id?: number;
    area_id?: number;
    date_from?: string;
    date_to?: string;
    sort_by?: string;
    sort_dir?: string;
  }): Promise<{
    items: Document[];
    total: number;
    page: number;
    size: number;
    pages: number;
  }> => {
    const response = await apiClient.get('/documents/', { params });
    return response.data;
  },

  // Получить документ по ID
  getById: async (id: number): Promise<Document> => {
    const response = await apiClient.get(`/documents/${id}`);
    return response.data;
  },

  // Создать документ
  create: async (documentData: Partial<Document>): Promise<Document> => {
    const response = await apiClient.post('/documents/', documentData);
    return response.data;
  },

  // Загрузить документ
  upload: async (formData: FormData): Promise<Document> => {
    const response = await apiClient.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Создать документ с первой ревизией
  createWithRevision: async (formData: FormData, config?: { onUploadProgress?: (progressEvent: any) => void }): Promise<any> => {
    const response = await apiClient.post('/documents/create-with-revision', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      ...config,
    });
    return response.data;
  },

  // Создать документ с первой ревизией (алиас)
  createDocumentWithRevision: async (formData: FormData, config?: { onUploadProgress?: (progressEvent: any) => void }): Promise<any> => {
    return documentsApi.createWithRevision(formData, config);
  },

  // Обновить документ
  update: async (id: number, documentData: Partial<Document>): Promise<Document> => {
    const response = await apiClient.put(`/documents/${id}`, documentData);
    return response.data;
  },

  // Удалить документ
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/documents/${id}`);
  },

  // Выпустить ревизию документа (изменить статус с Draft на In Review)
  releaseRevision: async (revisionId: number, comment?: string): Promise<{ message: string }> => {
    const response = await apiClient.post(`/documents/revisions/${revisionId}/release`, {
      comment: comment || ''
    });
    return response.data;
  },

  // Мягкое удаление документа
  softDelete: async (id: number): Promise<void> => {
    await apiClient.patch(`/documents/${id}/soft-delete`);
  },

  // Восстановить документ
  restore: async (id: number): Promise<void> => {
    await apiClient.patch(`/documents/${id}/restore`);
  },

  // Скачать документ
  download: async (id: number): Promise<Blob> => {
    try {
      const response = await apiClient.get(`/documents/${id}/download`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error: any) {
      console.error('Download error in API client:', error);
      
      // Если ошибка 404, проверяем, является ли response.data JSON с сообщением об ошибке
      if (error.response?.status === 404 && error.response?.data) {
        try {
          // Пытаемся прочитать JSON из blob
          const text = await error.response.data.text();
          console.log('404 response text:', text);
          const errorData = JSON.parse(text);
          console.log('404 error data:', errorData);
          throw new Error(errorData.detail || 'Файл не найден');
        } catch (parseError) {
          console.error('Error parsing 404 response:', parseError);
          // Если не удалось распарсить JSON, используем стандартное сообщение
          throw new Error('Файл не найден');
        }
      }
      
      // Для других ошибок
      if (error.response?.status) {
        throw new Error(`Ошибка сервера: ${error.response.status}`);
      }
      
      throw error;
    }
  },
  
  // Импорт документов по путям из Excel
  importByPaths: async (formData: FormData): Promise<any> => {
    const response = await apiClient.post('/documents/import-by-paths', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Тип элемента ревизии документа из бэкенда
  
  // Получить ревизии документа
  getRevisions: async (documentId: number): Promise<DocumentRevisionItem[]> => {
    const response = await apiClient.get(`/documents/${documentId}/revisions`);
    return response.data;
  },

  // Создать новую ревизию документа
  createRevision: async (documentId: number, formData: FormData): Promise<any> => {
    const response = await apiClient.post(`/documents/${documentId}/revisions`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Сравнить ревизии документа
  compareRevisions: async (documentId: number, r1: string, r2: string): Promise<any> => {
    const response = await apiClient.get(`/documents/${documentId}/revisions/compare`, {
      params: { r1, r2 },
    });
    return response.data;
  },

  // Мягкое удаление ревизии документа
  softDeleteRevision: async (revisionId: number): Promise<void> => {
    await apiClient.delete(`/documents/revisions/${revisionId}`);
  },

  // Восстановление ревизии документа
  restoreRevision: async (revisionId: number): Promise<void> => {
    await apiClient.post(`/documents/revisions/${revisionId}/restore`);
  },

  // Отменить ревизию документа
  cancelRevision: async (revisionId: number): Promise<void> => {
    await apiClient.post(`/documents/revisions/${revisionId}/cancel`);
  },

  // Загрузить новую ревизию документа
  uploadRevision: async (documentId: number, formData: FormData): Promise<any> => {
    const response = await apiClient.post(`/documents/${documentId}/revisions`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Скачать ревизию документа
  downloadRevision: async (documentId: number, revisionId: number): Promise<Blob> => {
    try {
      const response = await apiClient.get(`/documents/${documentId}/revisions/${revisionId}/download`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error: any) {
      console.error('Download revision error in API client:', error);
      
      // Если ошибка 404, проверяем, является ли response.data JSON с сообщением об ошибке
      if (error.response?.status === 404 && error.response?.data) {
        try {
          // Пытаемся прочитать JSON из blob
          const text = await error.response.data.text();
          console.log('404 response text:', text);
          const errorData = JSON.parse(text);
          console.log('404 error data:', errorData);
          throw new Error(errorData.detail || 'Файл не найден');
        } catch (parseError) {
          console.error('Error parsing 404 response:', parseError);
          // Если не удалось распарсить JSON, используем стандартное сообщение
          throw new Error('Файл не найден');
        }
      }
      
      // Для других ошибок
      if (error.response?.status) {
        throw new Error(`Ошибка сервера: ${error.response.status}`);
      }
      
      throw error;
    }
  },
};

// API методы для Autodesk Platform Services
export const autodeskApi = {
  // Получить токен для Autodesk Viewer
  getViewerToken: async (): Promise<{ access_token: string; expires_in: number }> => {
    const response = await apiClient.get('/autodesk/viewer/token');
    return response.data;
  },

  // Подготовить файл для просмотра (загрузить в Autodesk и запустить перевод)
  prepareFileForViewer: async (documentId: number, revisionId: number): Promise<{ urn: string; object_id: string; status: string; message: string }> => {
    const response = await apiClient.post(`/autodesk/documents/${documentId}/revisions/${revisionId}/viewer/prepare`);
    return response.data;
  },

  // Получить статус перевода файла
  getViewerStatus: async (documentId: number, revisionId: number): Promise<{ status: string; message: string }> => {
    const response = await apiClient.get(`/autodesk/documents/${documentId}/revisions/${revisionId}/viewer/status`);
    return response.data;
  },
};

// API методы для трансмитталов
export const transmittalsApi = {
  // Получить все трансмитталы
  getAll: async (projectId?: number): Promise<Transmittal[]> => {
    const params: any = {};
    if (projectId) params.project_id = projectId;
    // Убираем лимит и офсет - загружаем все трансмитталы
    const response = await apiClient.get('/transmittals/', { params });
    return response.data;
  },

  // Получить трансмиттал по ID
  getById: async (id: number): Promise<Transmittal> => {
    const response = await apiClient.get(`/transmittals/${id}`);
    return response.data;
  },

  // Создать трансмиттал
  create: async (transmittalData: Partial<Transmittal>): Promise<Transmittal> => {
    const response = await apiClient.post('/transmittals/', transmittalData);
    return response.data;
  },

  // Обновить трансмиттал
  update: async (id: number, transmittalData: TransmittalUpdate): Promise<Transmittal> => {
    const response = await apiClient.put(`/transmittals/${id}`, transmittalData);
    return response.data;
  },

  // Отправить трансмиттал
  send: async (id: number): Promise<Transmittal> => {
    const response = await apiClient.put(`/transmittals/${id}/send`);
    return response.data;
  },

  // Подтвердить получение трансмиттала
  receive: async (id: number): Promise<Transmittal> => {
    const response = await apiClient.put(`/transmittals/${id}/receive`);
    return response.data;
  },

  // Удалить трансмиттал
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/transmittals/${id}`);
  },

  // Получить активные ревизии документов
  getActiveRevisions: async (projectId?: number): Promise<any[]> => {
    const params = projectId ? { project_id: projectId } : {};
    const response = await apiClient.get('/transmittals/documents/active-revisions', { params });
    return response.data;
  },

  // Удалить ревизию из трансмиттала
  removeRevision: async (transmittalId: number, revisionId: number): Promise<void> => {
    await apiClient.delete(`/transmittals/${transmittalId}/revisions/${revisionId}`);
  },

  // Добавить ревизии в трансмиттал
  addRevisions: async (transmittalId: number, revisionIds: number[]): Promise<any> => {
    const response = await apiClient.post(`/transmittals/${transmittalId}/revisions`, {
      revision_ids: revisionIds
    });
    return response.data;
  },

  // Получить статусы трансмитталов
  getStatuses: async (): Promise<any[]> => {
    const response = await apiClient.get('/transmittals/statuses/');
    return response.data;
  },
};

// Тип для сущности Review (минимально необходимый для фронта)
export interface Review {
  id: number;
  document_id: number;
  reviewer_id?: number;
  comments?: string;
  rating?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

// API методы для ревью
export const reviewsApi = {
  // Получить все ревью
  getAll: async (projectId?: number): Promise<Review[]> => {
    const params: any = {};
    if (projectId) params.project_id = projectId;
    // Убираем лимит и офсет - загружаем все ревью
    const response = await apiClient.get('/reviews/', { params });
    return response.data;
  },

  // Получить ревью по ID
  getById: async (id: number): Promise<Review> => {
    const response = await apiClient.get(`/reviews/${id}`);
    return response.data;
  },

  // Создать ревью
  create: async (reviewData: {
    document_id: number;
    reviewer_id: number;
    comments?: string;
    rating?: number;
  }): Promise<Review> => {
    const response = await apiClient.post('/reviews/', reviewData);
    return response.data;
  },

  // Обновить ревью
  update: async (id: number, reviewData: {
    status?: string;
    comments?: string;
    rating?: number;
  }): Promise<Review> => {
    const response = await apiClient.put(`/reviews/${id}`, reviewData);
    return response.data;
  },

  // Удалить ревью
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/reviews/${id}`);
  },

  // Получить документы, ожидающие утверждения
  getPendingApprovals: async (skip: number = 0, limit: number = 100, projectId?: number): Promise<any[]> => {
    const params: any = { skip, limit };
    if (projectId) params.project_id = projectId;
    const response = await apiClient.get('/reviews/pending-approvals', { params });
    return response.data;
  },

  // Утвердить документ
  approveDocument: async (documentId: number, comments?: string): Promise<{ message: string }> => {
    const body = comments && comments.trim() ? { comments } : {};
    const response = await apiClient.post(`/reviews/approve/${documentId}`, body);
    return response.data;
  },

  // Отклонить документ
  rejectDocument: async (documentId: number, comments?: string): Promise<{ message: string }> => {
    const body = comments && comments.trim() ? { comments } : {};
    const response = await apiClient.post(`/reviews/reject/${documentId}`, body);
    return response.data;
  },

  // Получить статистику ревью
  getReviewsStats: async (projectId?: number): Promise<{
    total: number;
    internal: number;
    transmittal: number;
    overdue: number;
  }> => {
    const params: any = {};
    if (projectId) params.project_id = projectId;
    const response = await apiClient.get('/reviews/stats', { params });
    return response.data;
  },
};

// API методы для пользователей
export const usersApi = {
  // Получить всех пользователей
  getAll: async (): Promise<User[]> => {
    // Убираем лимит и офсет - загружаем всех пользователей
    const response = await apiClient.get('/users/');
    return response.data;
  },

  // Создать пользователя
  create: async (userData: {
    username: string;
    email: string;
    full_name: string;
    password: string;
    role: string;
    is_active: boolean;
  }): Promise<User> => {
    const response = await apiClient.post('/users/', userData);
    return response.data;
  },

  // Обновить пользователя
  update: async (id: number, userData: Partial<User>): Promise<User> => {
    const response = await apiClient.put(`/users/${id}`, userData);
    return response.data;
  },

  // Удалить пользователя
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },

  // Получить текущего пользователя
  getCurrent: async (): Promise<User> => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  // Сменить пароль текущего пользователя
  changePassword: async (oldPassword: string, newPassword: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/change-password', null, {
      params: { old_password: oldPassword, new_password: newPassword },
    });
    return response.data;
  },
};

// API методы для дисциплин и типов документов
export const disciplinesApi = {
  // Получить все дисциплины
  getAll: async (): Promise<Discipline[]> => {
    // Убираем лимит и офсет - загружаем все дисциплины
    const response = await apiClient.get('/disciplines/');
    return response.data;
  },

  // Создать дисциплину
  create: async (disciplineData: { name: string; description?: string; is_active: boolean }): Promise<Discipline> => {
    const response = await apiClient.post('/disciplines', disciplineData);
    return response.data;
  },

  // Обновить дисциплину
  update: async (id: number, disciplineData: Partial<Discipline>): Promise<Discipline> => {
    const response = await apiClient.put(`/disciplines/${id}`, disciplineData);
    return response.data;
  },

  // Удалить дисциплину
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/disciplines/${id}`);
  },

  // Получить все типы документов
  getDocumentTypes: async (): Promise<DocumentType[]> => {
    // Убираем лимит и офсет - загружаем все типы документов
    const response = await apiClient.get('/disciplines/document-types');
    return response.data;
  },

  // Получить типы документов для дисциплины
  getDocumentTypesByDiscipline: async (disciplineId: number): Promise<DocumentType[]> => {
    // Убираем лимит и офсет - загружаем все типы документов для дисциплины
    const response = await apiClient.get(`/disciplines/${disciplineId}/document-types`);
    return response.data;
  },

  // Поиск типов документов по коду в рамках дисциплины
  searchDocumentTypesByCode: async (disciplineId: number, code: string): Promise<DocumentType[]> => {
    const response = await apiClient.get(`/disciplines/${disciplineId}/document-types/search?code=${code}`);
    return response.data;
  },
};

export const languagesApi = {
  // Получить все языки
  getAll: async (): Promise<Language[]> => {
    // Убираем лимит и офсет - загружаем все языки
    const response = await apiClient.get('/references/languages');
    return response.data;
  },

  // Получить язык по ID
  getById: async (id: number): Promise<Language> => {
    const response = await apiClient.get(`/references/languages/${id}`);
    return response.data;
  },

  // Создать язык
  create: async (languageData: { 
    name: string; 
    name_native?: string;
    code: string; 
    is_active?: boolean;
  }): Promise<Language> => {
    const response = await apiClient.post('/references/languages', languageData);
    return response.data;
  },

  // Обновить язык
  update: async (id: number, languageData: Partial<Language>): Promise<Language> => {
    const response = await apiClient.put(`/references/languages/${id}`, languageData);
    return response.data;
  },

  // Удалить язык
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/references/languages/${id}`);
  },
};

export const documentTypesApi = {
  // Получить все типы документов
  getAll: async (): Promise<DocumentType[]> => {
    // Убираем лимит и офсет - загружаем все типы документов
    const response = await apiClient.get('/disciplines/document-types');
    return response.data;
  },

  // Создать тип документа
  create: async (documentTypeData: { 
    name: string; 
    description?: string; 
    discipline_id?: number; 
    is_active: boolean 
  }): Promise<DocumentType> => {
    const response = await apiClient.post('/disciplines/document-types', documentTypeData);
    return response.data;
  },

  // Обновить тип документа
  update: async (id: number, documentTypeData: Partial<DocumentType>): Promise<DocumentType> => {
    const response = await apiClient.put(`/disciplines/document-types/${id}`, documentTypeData);
    return response.data;
  },

  // Удалить тип документа
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/disciplines/document-types/${id}`);
  },
};

// API методы для настроек импорта трансмитталов
export const transmittalImportSettingsApi = {
  // Получить настройки импорта для проекта
  getByProject: async (projectId: number): Promise<TransmittalImportSettings[]> => {
    const response = await apiClient.get(`/transmittal-import-settings/project/${projectId}`);
    return response.data;
  },

  // Создать или обновить настройки импорта
  createOrUpdate: async (settings: TransmittalImportSettingsCreate): Promise<TransmittalImportSettings> => {
    const response = await apiClient.post('/transmittal-import-settings/', settings);
    return response.data;
  },

  // Обновить настройки импорта
  update: async (settingId: number, settings: TransmittalImportSettingsUpdate): Promise<TransmittalImportSettings> => {
    const response = await apiClient.put(`/transmittal-import-settings/${settingId}`, settings);
    return response.data;
  },

  // Удалить настройки импорта
  delete: async (settingId: number): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/transmittal-import-settings/${settingId}`);
    return response.data;
  },
};

// Интерфейс для результата импорта трансмиттала
export interface TransmittalImportResult {
  message: string;
  transmittal_id: number;
  transmittal_number: string;
  metadata: Record<string, string>;
  table_rows_count: number;
  created_revisions_count: number;
  missing_documents?: string[];
}

// API методы для импорта трансмитталов
export const transmittalImportApi = {
  // Импорт входящего трансмиттала
  importIncoming: async (file: File, projectId: number, counterpartyId: number): Promise<TransmittalImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('project_id', projectId.toString());
    formData.append('counterparty_id', counterpartyId.toString());
    
    const response = await apiClient.post('/transmittal-import/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

// API методы для настроек пользователя
export const userSettingsApi = {
  // Получить настройки пользователя для страницы
  get: async (page: string): Promise<Record<string, any>> => {
    const response = await apiClient.get(`/user/settings/${page}`);
    return response.data;
  },

  // Сохранить настройки пользователя для страницы
  save: async (page: string, settings: Record<string, any>): Promise<{ message: string }> => {
    const response = await apiClient.post(`/user/settings/${page}`, settings);
    return response.data;
  },

  // Очистить настройки пользователя для страницы
  clear: async (page: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/user/settings/${page}`);
    return response.data;
  },
};

// API методы для аутентификации
export const authApi = {
  // Вход в систему
  login: async (username: string, password: string): Promise<{ access_token: string; token_type: string }> => {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    
    const response = await apiClient.post('/auth/login', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },

  // Регистрация
  register: async (userData: {
    username: string;
    email: string;
    full_name: string;
    password: string;
  }): Promise<User> => {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },

  // Получить текущего пользователя
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  // Выход из системы
  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  // Обновление access-токена по refresh cookie
  refresh: async (): Promise<{ access_token: string; token_type: string; expires_in: number }> => {
    const response = await apiClient.post('/auth/refresh');
    return response.data;
  },
};

// Обработчик ошибок
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Если токен истек, удаляем его
    if (error.response?.status === 401) {
      removeAuthToken();
      // Можно добавить редирект на страницу входа
    }
    
    // Обрабатываем сетевые ошибки
    if (!error.response) {
      // Сетевая ошибка или таймаут
      const networkError = new Error('Network Error');
      return Promise.reject(networkError);
    }
    
    // Обрабатываем ошибки CORS
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      const corsError = new Error('CORS Error');
      return Promise.reject(corsError);
    }
    
    return Promise.reject(error);
  }
);

export const supportApi = {
  // Создание тикета
  createTicket: async (formData: FormData): Promise<any> => {
    const response = await apiClient.post('/support/tickets', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  // Получение списка тикетов
  getTickets: async (): Promise<any[]> => {
    const response = await apiClient.get('/support/tickets');
    return response.data;
  },
  
  // Получение тикета с сообщениями
  getTicket: async (ticketId: number): Promise<any> => {
    const response = await apiClient.get(`/support/tickets/${ticketId}`);
    return response.data;
  },
  
  // Отправка сообщения в тикет
  createMessage: async (ticketId: number, formData: FormData): Promise<any> => {
    const response = await apiClient.post(`/support/tickets/${ticketId}/messages`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  // Возврат тикета в работу
  reopenTicket: async (ticketId: number): Promise<any> => {
    const response = await apiClient.post(`/support/tickets/${ticketId}/reopen`);
    return response.data;
  },
  
  // Скачивание файла
  downloadFile: async (ticketId: number, fileId: number): Promise<Blob> => {
    const response = await apiClient.get(`/support/tickets/${ticketId}/files/${fileId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },
  
  // Получение chat_id из Telegram
  getTelegramChatId: async (): Promise<any> => {
    const response = await apiClient.get('/support/telegram/get-chat-id');
    return response.data;
  },
  
  // Установка webhook для Telegram бота
  setupTelegramWebhook: async (webhookUrl: string): Promise<any> => {
    const response = await apiClient.post(`/support/telegram/setup-webhook?webhook_url=${encodeURIComponent(webhookUrl)}`);
    return response.data;
  },
  
  // Запуск polling для локальной разработки (без webhook)
  startTelegramPolling: async (): Promise<any> => {
    const response = await apiClient.post('/support/telegram/start-polling');
    return response.data;
  },
};

export const workflowApi = {
  // Workflow Templates
  getTemplates: async (disciplineId?: number, documentTypeId?: number): Promise<WorkflowTemplate[]> => {
    const params = new URLSearchParams();
    if (disciplineId) params.append('discipline_id', disciplineId.toString());
    if (documentTypeId) params.append('document_type_id', documentTypeId.toString());
    
    const response = await apiClient.get('/workflow/workflow-templates/', { params });
    return response.data;
  },

  createTemplate: async (templateData: {
    name: string;
    description?: string;
    discipline_id?: number;
    document_type_id?: number;
  }): Promise<WorkflowTemplate> => {
    const response = await apiClient.post('/workflow/workflow-templates/', templateData);
    return response.data;
  },

  addStep: async (templateId: number, stepData: {
    step_order: number;
    step_name: string;
    approver_role?: string;
    approver_user_id?: number;
    is_required?: boolean;
    escalation_hours?: number;
  }): Promise<{ message: string; step_id: number }> => {
    const response = await apiClient.post(`/workflow/workflow-templates/${templateId}/steps/`, stepData);
    return response.data;
  },

  // Document Workflow
  startWorkflow: async (documentId: number, templateId: number): Promise<{ message: string; workflow_id: number }> => {
    const response = await apiClient.post(`/workflow/documents/${documentId}/start-workflow/`, {
      template_id: templateId
    });
    return response.data;
  },

  getWorkflowStatus: async (documentId: number): Promise<{
    document_id: number;
    status: DocumentStatus;
    current_step?: string;
    progress_percentage: number;
    approvals: Array<{
      id: number;
      step_name: string;
      approver_name: string;
      status: ApprovalStatus;
      comments?: string;
      approved_at?: string;
      created_at: string;
    }>;
    started_at: string;
    completed_at?: string;
  }> => {
    const response = await apiClient.get(`/workflow/documents/${documentId}/workflow-status/`);
    return response.data;
  },

  // Approvals
  approveDocument: async (approvalId: number, comments?: string): Promise<{ message: string }> => {
    const response = await apiClient.post(`/workflow/approvals/${approvalId}/approve/`, {
      comments
    });
    return response.data;
  },

  rejectDocument: async (approvalId: number, comments: string): Promise<{ message: string }> => {
    const response = await apiClient.post(`/workflow/approvals/${approvalId}/reject/`, {
      comments
    });
    return response.data;
  },

  getMyApprovals: async (): Promise<Array<{
    approval_id: number;
    document_id: number;
    document_title: string;
    step_name: string;
    created_at: string;
    escalation_hours: number;
  }>> => {
    const response = await apiClient.get('/workflow/my-approvals/');
    return response.data;
  },

  // Document History
  getDocumentHistory: async (documentId: number): Promise<Array<{
    id: number;
    action: string;
    old_value?: string;
    new_value?: string;
    user_name: string;
    timestamp: string;
    comment?: string;
  }>> => {
    const response = await apiClient.get(`/workflow/documents/${documentId}/history/`);
    return response.data;
  }
};

// Убираем дублирующиеся интерфейсы - они уже определены выше

export interface Originator {
  id: number;
  name: string;
  name_native?: string;
  code?: string;
  is_active: boolean;
  created_at: string;
}

// References API
export const referencesApi = {
  // Revision Statuses
  getRevisionStatuses: (): Promise<RevisionStatus[]> => 
    apiClient.get('/references/revision-statuses').then(res => res.data),
  
  createRevisionStatus: (data: Partial<RevisionStatus>): Promise<RevisionStatus> => 
    apiClient.post('/references/revision-statuses', data).then(res => res.data),
  
  // Revision Descriptions
  getRevisionDescriptions: (): Promise<RevisionDescription[]> => 
    apiClient.get('/references/revision-descriptions').then(res => res.data),
  
  createRevisionDescription: (data: Partial<RevisionDescription>): Promise<RevisionDescription> => 
    apiClient.post('/references/revision-descriptions', data).then(res => res.data),
  
  // Revision Steps
  getRevisionSteps: (): Promise<RevisionStep[]> => 
    apiClient.get('/references/revision-steps').then(res => res.data),
  
  createRevisionStep: (data: Partial<RevisionStep>): Promise<RevisionStep> => 
    apiClient.post('/references/revision-steps', data).then(res => res.data),
  
  // Areas (справочник объектов/площадок)
  getAreas: (): Promise<any[]> => 
    apiClient.get('/references/areas').then(res => res.data),
  
  // Originators
  getOriginators: (): Promise<Originator[]> => 
    apiClient.get('/references/originators').then(res => res.data),
  
  createOriginator: (data: Partial<Originator>): Promise<Originator> => 
    apiClient.post('/references/originators', data).then(res => res.data),
  
  // Review Codes
  getReviewCodes: (): Promise<ReviewCode[]> => 
    apiClient.get('/references/review-codes').then(res => res.data),
  
  createReviewCode: (data: Partial<ReviewCode>): Promise<ReviewCode> => 
    apiClient.post('/references/review-codes', data).then(res => res.data),
  
  // Languages
  getLanguages: (): Promise<Language[]> => 
    apiClient.get('/references/languages').then(res => res.data),
  
  createLanguage: (data: Partial<Language>): Promise<Language> => 
    apiClient.post('/references/languages', data).then(res => res.data),
  
  // Departments
  getDepartments: (): Promise<Department[]> => 
    apiClient.get('/references/departments').then(res => res.data),
  
  createDepartment: (data: Partial<Department>): Promise<Department> => 
    apiClient.post('/references/departments', data).then(res => res.data),
  
  // Companies
  getCompanies: (): Promise<Company[]> => 
    apiClient.get('/references/companies').then(res => res.data),
  
  createCompany: (data: Partial<Company>): Promise<Company> => 
    apiClient.post('/references/companies', data).then(res => res.data),
  
  // User Roles
  getUserRoles: (): Promise<UserRole[]> => 
    apiClient.get('/references/user-roles').then(res => res.data),
  
  createUserRole: (data: Partial<UserRole>): Promise<UserRole> => 
    apiClient.post('/references/user-roles', data).then(res => res.data),
  
  // Workflow Statuses
  getWorkflowStatuses: (): Promise<WorkflowStatus[]> => 
    apiClient.get('/references/workflow-statuses').then(res => res.data),
  
  createWorkflowStatus: (data: Partial<WorkflowStatus>): Promise<WorkflowStatus> => 
    apiClient.post('/references/workflow-statuses', data).then(res => res.data)
};

// Workflow Presets API
export const workflowPresetsApi = {
  getAll: (): Promise<any[]> => 
    apiClient.get('/workflow-presets/').then(res => res.data),
  
  getById: (id: number): Promise<any> => 
    apiClient.get(`/workflow-presets/${id}`).then(res => res.data),
  
  create: (data: any): Promise<any> => 
    apiClient.post('/workflow-presets/', data).then(res => res.data),
  
  update: (id: number, data: any): Promise<any> => 
    apiClient.put(`/workflow-presets/${id}`, data).then(res => res.data),
  
  delete: (id: number): Promise<void> => 
    apiClient.delete(`/workflow-presets/${id}`).then(res => res.data)
};

// Дублирующееся объявление languagesApi удалено - используется объявление выше

// (удалён устаревший documents-v2 API)


// Companies API
export const companiesApi = {
  getAll: (): Promise<Company[]> => 
    apiClient.get('/companies').then(res => res.data)
};

// Company Role interface
export interface CompanyRole {
  id: number;
  code: string;
  name: string;
  name_en?: string | null;
  description?: string | null;
  is_active: boolean;
}

// Company Roles API
export const companyRolesApi = {
  getAll: async (): Promise<CompanyRole[]> => {
    const response = await apiClient.get('/company-roles');
    return response.data;
  }
};

// Contacts API
export const contactsApi = {
  getAll: async (): Promise<Contact[]> => {
    const response = await apiClient.get('/contacts');
    return response.data;
  },
  getByCompany: async (companyId: number): Promise<Contact[]> => {
    const response = await apiClient.get(`/companies/${companyId}/contacts`);
    return response.data;
  },
  create: async (companyId: number, contact: any): Promise<Contact> => {
    const response = await apiClient.post(`/companies/${companyId}/contacts`, contact);
    return response.data;
  },
  update: async (contactId: number, contact: any): Promise<Contact> => {
    const response = await apiClient.put(`/contacts/${contactId}`, contact);
    return response.data;
  },
  delete: async (contactId: number): Promise<void> => {
    await apiClient.delete(`/contacts/${contactId}`);
  }
};

// Project Participants API
export const projectParticipantsApi = {
  create: async (projectId: number, participant: ProjectParticipantCreate): Promise<ProjectParticipant> => {
    const response = await apiClient.post(`/projects/${projectId}/participants`, participant);
    return response.data;
  },
  getAll: async (projectId: number): Promise<ProjectParticipant[]> => {
    const response = await apiClient.get(`/projects/${projectId}/participants`);
    return response.data;
  },
  update: async (projectId: number, participantId: number, participant: ProjectParticipantUpdate): Promise<ProjectParticipant> => {
    const response = await apiClient.put(`/projects/${projectId}/participants/${participantId}`, participant);
    return response.data;
  },
  delete: async (projectId: number, participantId: number): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/participants/${participantId}`);
  }
};

// Roles API
export interface ApiUserRole {
  id: number;
  code: string;
  name: string;
  name_native?: string;
  name_en?: string;
  description?: string;
  permissions?: Record<string, any>;
  is_active: boolean;
  created_at: string;
}

export interface ApiProjectRole {
  id: number;
  code: string;
  name: string;
  name_en?: string;
  description?: string;
  permissions?: Record<string, any>;
  is_active: boolean;
  created_at: string;
}

export interface DocumentComment {
  id: number;
  document_id: number;
  parent_comment_id?: number;
  user_id: number;
  user_name: string;
  content: string;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
  replies: DocumentComment[];
}

export const rolesApi = {
  // User Roles
  getUserRoles: async (): Promise<ApiUserRole[]> => {
    const response = await apiClient.get('/roles/user-roles/');
    return response.data;
  },
  
  getUserRole: async (roleId: number): Promise<ApiUserRole> => {
    const response = await apiClient.get(`/roles/user-roles/${roleId}`);
    return response.data;
  },
  
  createUserRole: async (role: Omit<ApiUserRole, 'id' | 'created_at'>): Promise<ApiUserRole> => {
    const response = await apiClient.post('/roles/user-roles/', role);
    return response.data;
  },
  
  updateUserRole: async (roleId: number, role: Partial<ApiUserRole>): Promise<ApiUserRole> => {
    const response = await apiClient.put(`/roles/user-roles/${roleId}`, role);
    return response.data;
  },
  
  deleteUserRole: async (roleId: number): Promise<void> => {
    await apiClient.delete(`/roles/user-roles/${roleId}`);
  },
  
  // Project Roles
  getProjectRoles: async (): Promise<ApiProjectRole[]> => {
    const response = await apiClient.get('/roles/project-roles/');
    return response.data;
  },
  
  getProjectRole: async (roleId: number): Promise<ApiProjectRole> => {
    const response = await apiClient.get(`/roles/project-roles/${roleId}`);
    return response.data;
  },
  
  createProjectRole: async (role: Omit<ApiProjectRole, 'id' | 'created_at'>): Promise<ApiProjectRole> => {
    const response = await apiClient.post('/roles/project-roles/', role);
    return response.data;
  },
  
  updateProjectRole: async (roleId: number, role: Partial<ApiProjectRole>): Promise<ApiProjectRole> => {
    const response = await apiClient.put(`/roles/project-roles/${roleId}`, role);
    return response.data;
  },
  
  deleteProjectRole: async (roleId: number): Promise<void> => {
    await apiClient.delete(`/roles/project-roles/${roleId}`);
  }
};

// API методы для комментариев документов
export const documentCommentsApi = {
  // Получить комментарии документа
  getComments: async (documentId: number): Promise<DocumentComment[]> => {
    const response = await apiClient.get(`/documents/${documentId}/comments`);
    return response.data;
  },

  // Создать комментарий
  createComment: async (documentId: number, content: string, parentCommentId?: number): Promise<DocumentComment> => {
    const response = await apiClient.post(`/documents/${documentId}/comments`, {
      content,
      parent_comment_id: parentCommentId || null
    });
    return response.data;
  },

  // Обновить комментарий
  updateComment: async (commentId: number, content: string): Promise<DocumentComment> => {
    const response = await apiClient.put(`/comments/${commentId}`, { content });
    return response.data;
  },

  // Удалить комментарий
  deleteComment: async (commentId: number): Promise<void> => {
    await apiClient.delete(`/comments/${commentId}`);
  },

  // Переключить статус "решено"
  toggleResolve: async (commentId: number): Promise<{ message: string }> => {
    const response = await apiClient.patch(`/comments/${commentId}/resolve`);
    return response.data;
  }
};

// API методы для audit logs
export const auditLogsApi = {
  // Получить список логов
  getAll: async (params?: {
    skip?: number;
    limit?: number;
    action?: string;
    entity_type?: string;
    entity_id?: number;
    user_id?: number;
    date_from?: string;
    date_to?: string;
  }): Promise<{ items: AuditLog[]; total: number; skip: number; limit: number }> => {
    const response = await apiClient.get('/audit-logs/', { params });
    return response.data;
  },

  // Получить конкретный лог по ID
  getById: async (logId: number): Promise<AuditLog> => {
    const response = await apiClient.get(`/audit-logs/${logId}`);
    return response.data;
  },
};


export const notificationsApi = {
  // Получить уведомления пользователя
  getNotifications: async (unreadOnly: boolean = false, limit: number = 50): Promise<any[]> => {
    const response = await apiClient.get('/notifications/', { 
      params: { unread_only: unreadOnly, limit } 
    });
    return response.data;
  },

  // Получить количество непрочитанных уведомлений
  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get('/notifications/unread-count/');
    return response.data.count || 0;
  },

  // Отметить уведомление как прочитанное
  markAsRead: async (notificationId: number): Promise<void> => {
    await apiClient.post(`/notifications/${notificationId}/mark-read/`);
  },

  // Отметить все уведомления как прочитанные
  markAllAsRead: async (): Promise<void> => {
    await apiClient.post('/notifications/mark-all-read/');
  },
};

export default apiClient;
