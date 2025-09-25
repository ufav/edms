import axios from 'axios';

// Базовый URL API
const API_BASE_URL = 'http://localhost:8000/api/v1';

// Создаем экземпляр axios с базовой конфигурацией
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
  manager_id: number | null;
  created_by: number | null;
  owner_id?: number | null;
  owner_name?: string | null;
  user_role: string | null;  // Роль текущего пользователя в проекте
  created_at: string | null;
  updated_at: string | null;
}

export interface ProjectMember {
  id: number;
  project_id: number;
  user_id: number;
  role: string;
  joined_at: string | null;
}

export interface Document {
  id: number;
  title: string;
  description: string;
  file_name: string;
  file_size: number;
  file_type: string;
  version: string;
  status: string;
  project_id: number;
  uploaded_by: number;
  file_path: string;
  created_at: string;
  updated_at: string;
}

export interface Transmittal {
  id: number;
  transmittal_number: string;
  title: string;
  description: string;
  project_id: number;
  sender_id: number;
  recipient_id: number;
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
  created_at: string;
  updated_at: string;
}

// Функция для установки токена авторизации
export const setAuthToken = (token: string) => {
  apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

// Функция для удаления токена авторизации
export const removeAuthToken = () => {
  delete apiClient.defaults.headers.common['Authorization'];
};

// API методы для проектов
export const projectsApi = {
  // Получить все проекты
  getAll: async (): Promise<Project[]> => {
    console.log('🌐 API: Making GET request to /projects/');
    const response = await apiClient.get('/projects/');
    console.log('🌐 API: Response received:', response.data);
    return response.data;
  },

  // Получить проект по ID
  getById: async (id: number): Promise<Project> => {
    const response = await apiClient.get(`/projects/${id}`);
    return response.data;
  },

  // Создать новый проект
  create: async (projectData: Partial<Project>): Promise<Project> => {
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
    add: async (projectId: number, memberData: { user_id: number; role: string }): Promise<ProjectMember> => {
      const response = await apiClient.post(`/projects/${projectId}/members/`, memberData);
      return response.data;
    },

    // Удалить участника из проекта
    remove: async (projectId: number, userId: number): Promise<void> => {
      await apiClient.delete(`/projects/${projectId}/members/${userId}`);
    }
  }
};

// API методы для документов
export const documentsApi = {
  // Получить все документы
  getAll: async (projectId?: number): Promise<Document[]> => {
    const params = projectId ? { project_id: projectId } : {};
    const response = await apiClient.get('/documents/', { params });
    return response.data;
  },

  // Получить документ по ID
  getById: async (id: number): Promise<Document> => {
    const response = await apiClient.get(`/documents/${id}`);
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

  // Обновить документ
  update: async (id: number, documentData: Partial<Document>): Promise<Document> => {
    const response = await apiClient.put(`/documents/${id}`, documentData);
    return response.data;
  },

  // Удалить документ
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/documents/${id}`);
  },

  // Скачать документ
  download: async (id: number): Promise<Blob> => {
    const response = await apiClient.get(`/documents/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

// API методы для трансмитталов
export const transmittalsApi = {
  // Получить все трансмитталы
  getAll: async (projectId?: number): Promise<Transmittal[]> => {
    const params = projectId ? { project_id: projectId } : {};
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
};

// API методы для ревью
export const reviewsApi = {
  // Получить все ревью
  getAll: async (projectId?: number): Promise<Review[]> => {
    const params = projectId ? { project_id: projectId } : {};
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
    const response = await apiClient.get('/users/');
    return response.data;
  },

  // Получить пользователя по ID
  getById: async (id: number): Promise<User> => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  },

  // Получить текущего пользователя
  getCurrent: async (): Promise<User> => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
};

// API методы для аутентификации
export const authApi = {
  // Вход в систему
  login: async (username: string, password: string): Promise<{ access_token: string; token_type: string }> => {
    console.log('🔐 API: Making login request for user:', username);
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    
    const response = await apiClient.post('/auth/login', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    console.log('🔐 API: Login response received:', response.data);
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
};

// Обработчик ошибок
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    
    // Если токен истек, удаляем его
    if (error.response?.status === 401) {
      removeAuthToken();
      // Можно добавить редирект на страницу входа
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
