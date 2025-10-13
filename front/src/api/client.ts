import axios from 'axios';

// Базовый URL API
const API_BASE_URL = 'http://localhost:8000/api/v1';

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
  is_deleted: number;
  drs?: string;
  project_id: number;
  language_id?: number;
  uploaded_by: number;
  created_by?: number;  // Создатель документа
  file_path: string;
  discipline_id?: number;
  document_type_id?: number;
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

export enum DocumentStatus {
  DRAFT = 'draft',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ARCHIVED = 'archived',
  SUPERSEDED = 'superseded'
}

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  DELEGATED = 'delegated'
}

export interface Transmittal {
  id: number;
  transmittal_number: string;
  title: string;
  description: string;
  project_id: number;
  sender_id: number | null;
  recipient_id: number;
  created_by: number;
  status: string;
  sent_date: string | null;
  received_date: string | null;
  created_at: string;
  updated_at: string;
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

// New Document Structure (v2) interfaces
export interface UniqueDocument {
  id: number;
  number: string;
  title: string;
  title_native?: string;
  project_id: number;
  discipline_id: number;
  type_id: number;
  language_id?: number;
  drs?: string;
  originator_id?: number;
  created: string;
  modified?: string;
  deleted: number;
}

export interface DocumentRevision {
  id: number;
  document_id: number;
  status_id: number;
  step_id: number;
  description_id?: number;
  number?: string;
  user_id?: number;
  remarks?: string;
  created: string;
  modified?: string;
  deleted: number;
}

export interface DocumentRevisionFile {
  id: number;
  document_id: number;
  number: string;  // Переименовано с revision на number (содержит только номер: 01, 02, 03)
  file_name: string;
  file_size: number;
  file_type: string;
  change_description: string | null;
  uploaded_by: number;
  is_deleted: number;  // Флаг удаления: 0 - не удален, 1 - удален
  created_at: string;
  // Новые поля для связи со справочниками
  revision_status_id?: number;
  revision_description_id?: number;
  revision_step_id?: number;
  review_code_id?: number;
}

export interface UploadedFileV2 {
  id: number;
  created: string;
  modified?: string;
  deleted: number;
  path: string;
  filename: string;
  file_size?: number;
  file_type?: string;
  revision_id: number;
}

export interface DocumentWithRevisions extends UniqueDocument {
  revisions: DocumentRevision[];
}

export interface RevisionWithFiles extends DocumentRevision {
  files: UploadedFileV2[];
  status_name?: string;
  step_name?: string;
  description_name?: string;
  user_name?: string;
}

export interface FullDocumentResponse extends UniqueDocument {
  revisions: RevisionWithFiles[];
  project_name?: string;
  discipline_name?: string;
  document_type_name?: string;
  language_name?: string;
  originator_name?: string;
}

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

export interface RevisionStep {
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

export interface ReviewCode {
  id: number;
  code: string;
  name: string;
  name_native?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface Language {
  id: number;
  name: string;
  name_native?: string;
  code?: string;
  is_active: boolean;
  created_at: string;
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

  // Получить выбранный пресет workflow для проекта
  getWorkflowPreset: async (projectId: number): Promise<any> => {
    const response = await apiClient.get(`/projects/${projectId}/workflow-preset`);
    return response.data;
  },

  // Получить sequence пресета workflow для проекта
  getWorkflowPresetSequence: async (projectId: number): Promise<any[]> => {
    const response = await apiClient.get(`/projects/${projectId}/workflow-preset/sequence`);
    return response.data;
  }
};

// API методы для документов
export const documentsApi = {
  // Получить все документы
  getAll: async (projectId?: number): Promise<Document[]> => {
    const params: any = {};
    if (projectId) params.project_id = projectId;
    // Убираем лимит и офсет - загружаем все документы
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

  // Обновить документ
  update: async (id: number, documentData: Partial<Document>): Promise<Document> => {
    const response = await apiClient.put(`/documents/${id}`, documentData);
    return response.data;
  },

  // Удалить документ
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/documents/${id}`);
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
    const response = await apiClient.get(`/documents/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
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

  // Получить ревизии документа
  getRevisions: async (documentId: number): Promise<DocumentRevisionFile[]> => {
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
    const response = await apiClient.get(`/documents/${documentId}/revisions/${revisionId}/download`, {
      responseType: 'blob',
    });
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
  update: async (id: number, transmittalData: Partial<Transmittal>): Promise<Transmittal> => {
    const response = await apiClient.put(`/transmittals/${id}`, transmittalData);
    return response.data;
  },

  // Удалить трансмиттал
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/transmittals/${id}`);
  },

  // Отправить трансмиттал
  send: async (id: number): Promise<Transmittal> => {
    const response = await apiClient.post(`/transmittals/${id}/send`);
    return response.data;
  },

  // Подтвердить получение трансмиттала
  receive: async (id: number): Promise<Transmittal> => {
    const response = await apiClient.post(`/transmittals/${id}/receive`);
    return response.data;
  },

  // Получить активные ревизии документов
  getActiveRevisions: async (projectId?: number): Promise<any[]> => {
    const params = projectId ? { project_id: projectId } : {};
    const response = await apiClient.get('/transmittals/documents/active-revisions', { params });
    return response.data;
  },
};

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
    const response = await apiClient.get('/disciplines');
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
    apiClient.post('/references/user-roles', data).then(res => res.data)
};

// Workflow Presets API
export const workflowPresetsApi = {
  getAll: (): Promise<any[]> => 
    apiClient.get('/workflow-presets').then(res => res.data),
  
  getById: (id: number): Promise<any> => 
    apiClient.get(`/workflow-presets/${id}`).then(res => res.data),
  
  create: (data: any): Promise<any> => 
    apiClient.post('/workflow-presets', data).then(res => res.data),
  
  update: (id: number, data: any): Promise<any> => 
    apiClient.put(`/workflow-presets/${id}`, data).then(res => res.data),
  
  delete: (id: number): Promise<void> => 
    apiClient.delete(`/workflow-presets/${id}`).then(res => res.data)
};

// Дублирующееся объявление languagesApi удалено - используется объявление выше

// Documents v2 API
export const documentsV2Api = {
  // Unique Documents
  getUniqueDocuments: (params?: {
    skip?: number;
    limit?: number;
    project_id?: number;
    discipline_id?: number;
    type_id?: number;
  }): Promise<UniqueDocument[]> => 
    apiClient.get('/documents-v2/unique-documents', { params }).then(res => res.data),
  
  createUniqueDocument: (data: Partial<UniqueDocument>): Promise<UniqueDocument> => 
    apiClient.post('/documents-v2/unique-documents', data).then(res => res.data),
  
  getUniqueDocument: (id: number): Promise<UniqueDocument> => 
    apiClient.get(`/documents-v2/unique-documents/${id}`).then(res => res.data),
  
  // Document Revisions
  getDocumentRevisions: (documentId: number): Promise<DocumentRevision[]> => 
    apiClient.get(`/documents-v2/unique-documents/${documentId}/revisions`).then(res => res.data),
  
  createDocumentRevision: (documentId: number, data: Partial<DocumentRevision>): Promise<DocumentRevision> => 
    apiClient.post(`/documents-v2/unique-documents/${documentId}/revisions`, data).then(res => res.data),
  
  // Revision Files
  getRevisionFiles: (revisionId: number): Promise<UploadedFileV2[]> => 
    apiClient.get(`/documents-v2/revisions/${revisionId}/files`).then(res => res.data),
  
  uploadFileToRevision: (revisionId: number, file: File): Promise<{ message: string; revision_id: number }> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post(`/documents-v2/revisions/${revisionId}/files`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data);
  },
  
  downloadRevisionFile: (revisionId: number, fileId: number): Promise<{
    file_id: number;
    filename: string;
    path: string;
    file_size?: number;
  }> => 
    apiClient.get(`/documents-v2/revisions/${revisionId}/download/${fileId}`).then(res => res.data),
  
  // Reference Data
  getRevisionStatuses: (): Promise<RevisionStatus[]> => 
    apiClient.get('/documents-v2/reference-data/revision-statuses').then(res => res.data),
  
  getRevisionDescriptions: (): Promise<RevisionDescription[]> => 
    apiClient.get('/documents-v2/reference-data/revision-descriptions').then(res => res.data),
  
  getRevisionSteps: (): Promise<RevisionStep[]> => 
    apiClient.get('/documents-v2/reference-data/revision-steps').then(res => res.data),
  
  getOriginators: (): Promise<Originator[]> => 
    apiClient.get('/documents-v2/reference-data/originators').then(res => res.data),
  
  getLanguages: (): Promise<Language[]> => 
    apiClient.get('/documents-v2/reference-data/languages').then(res => res.data)
};


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
export interface UserRole {
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
  getUserRoles: async (): Promise<UserRole[]> => {
    const response = await apiClient.get('/roles/user-roles');
    return response.data;
  },
  
  getUserRole: async (roleId: number): Promise<UserRole> => {
    const response = await apiClient.get(`/roles/user-roles/${roleId}`);
    return response.data;
  },
  
  createUserRole: async (role: Omit<UserRole, 'id' | 'created_at'>): Promise<UserRole> => {
    const response = await apiClient.post('/roles/user-roles', role);
    return response.data;
  },
  
  updateUserRole: async (roleId: number, role: Partial<UserRole>): Promise<UserRole> => {
    const response = await apiClient.put(`/roles/user-roles/${roleId}`, role);
    return response.data;
  },
  
  deleteUserRole: async (roleId: number): Promise<void> => {
    await apiClient.delete(`/roles/user-roles/${roleId}`);
  },
  
  // Project Roles
  getProjectRoles: async (): Promise<ProjectRole[]> => {
    const response = await apiClient.get('/roles/project-roles');
    return response.data;
  },
  
  getProjectRole: async (roleId: number): Promise<ProjectRole> => {
    const response = await apiClient.get(`/roles/project-roles/${roleId}`);
    return response.data;
  },
  
  createProjectRole: async (role: Omit<ProjectRole, 'id' | 'created_at'>): Promise<ProjectRole> => {
    const response = await apiClient.post('/roles/project-roles', role);
    return response.data;
  },
  
  updateProjectRole: async (roleId: number, role: Partial<ProjectRole>): Promise<ProjectRole> => {
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

export default apiClient;
