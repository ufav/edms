import { makeAutoObservable, runInAction } from 'mobx';
import { usersApi, authApi, type User as ApiUser } from '../api/client';
import { useTranslation } from 'react-i18next';

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

class UserStore {
  users: User[] = [];
  currentUser: any = null;
  isLoading = false;
  error: string | null = null;
  isCurrentUserLoaded = false;
  isUsersLoaded = false;

  constructor() {
    makeAutoObservable(this);
  }

  // Загрузка текущего пользователя
  async loadCurrentUser() {
    // Если пользователь уже загружен - не загружаем повторно
    if (this.isCurrentUserLoaded) {
      return;
    }

    try {
      const userInfo = await authApi.getCurrentUser();
      runInAction(() => {
        this.currentUser = userInfo;
        this.isCurrentUserLoaded = true;
      });
    } catch (error) {
      runInAction(() => {
        this.currentUser = null;
        this.isCurrentUserLoaded = true;
      });
    }
  }

  // Загрузка пользователей из API
  async loadUsers() {
    // Если пользователи уже загружены - не загружаем повторно
    if (this.isUsersLoaded) {
      return;
    }

    runInAction(() => {
      this.isLoading = true;
      this.error = null;
    });
    
    try {
      const apiUsers = await usersApi.getAll();
      runInAction(() => {
        this.users = apiUsers.map(apiUser => ({
          id: apiUser.id,
          username: apiUser.username,
          email: apiUser.email,
          full_name: apiUser.full_name,
          role: apiUser.role,
          is_active: apiUser.is_active,
          is_admin: apiUser.is_admin,
          created_at: apiUser.created_at,
          updated_at: apiUser.updated_at
        }));
        this.isUsersLoaded = true;
      });
    } catch (error) {
      runInAction(() => {
        this.error = 'Ошибка загрузки пользователей';
        this.users = [];
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  // Получение пользователя по ID
  getUserById(id: number): User | undefined {
    return this.users.find(user => user.id === id);
  }

  // Получение роли пользователя
  getUserRoleLabel(role: string): string {
    // Используем статический маппинг, так как в MobX store нет доступа к useTranslation
    const roleMap: { [key: string]: string } = {
      'Administrator': 'Администратор',
      'Operator': 'Оператор', 
      'Viewer': 'Читатель',
      // Старые роли для совместимости
      'admin': 'Администратор',
      'operator': 'Оператор',
      'viewer': 'Читатель',
      'superadmin': 'Администратор'
    };
    return roleMap[role] || role;
  }

  // Получение цвета роли пользователя
  getUserRoleColor(role: string): string {
    const colorMap: { [key: string]: string } = {
      'Administrator': 'error',
      'Operator': 'warning',
      'Viewer': 'info',
      // Старые роли для совместимости
      'admin': 'error',
      'operator': 'warning',
      'viewer': 'info',
      'superadmin': 'error'
    };
    return colorMap[role] || 'default';
  }

  // Форматирование даты
  formatDate(dateString: string): string {
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
  }

  // Очистка кэша пользователей
  clearUsers() {
    this.users = [];
    this.isUsersLoaded = false;
    this.error = null;
  }

  // Очистка текущего пользователя
  clearCurrentUser() {
    this.currentUser = null;
    this.isCurrentUserLoaded = false;
  }
}

export const userStore = new UserStore();
