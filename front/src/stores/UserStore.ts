import { makeAutoObservable, runInAction } from 'mobx';
import { usersApi, type User as ApiUser } from '../api/client';

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
  isLoading = false;
  error: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  // Загрузка пользователей из API
  async loadUsers() {
    console.log('Loading users from API...');
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
        console.log('Users loaded from API:', this.users.length);
      });
    } catch (error) {
      console.error('Error loading users:', error);
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
    const roleMap: { [key: string]: string } = {
      'admin': 'Администратор',
      'operator': 'Оператор',
      'viewer': 'Читатель'
    };
    return roleMap[role] || role;
  }

  // Получение цвета роли пользователя
  getUserRoleColor(role: string): string {
    const colorMap: { [key: string]: string } = {
      'admin': 'error',
      'operator': 'warning',
      'viewer': 'info'
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
}

export const userStore = new UserStore();
