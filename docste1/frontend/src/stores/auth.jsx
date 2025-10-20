import { makeAutoObservable, action, runInAction } from 'mobx';
import { getUserProjects, verifyToken } from '../Datasources'; // Импортируем verifyToken
import { notification } from 'antd';

class AuthStore {
  token = null;
  username = null;
  user_id = null;
  role_id = null;
  selectedPage = 'welcome';
  sidebarCollapsed = false;
  selectedProjectId = null;
  openKeys = [];
  documentsColumnsSettings = null;
  transmittalsColumnsSettings = null;
  projects = [];
  inactivityTimeout = null;
  inactivityLimit = null;

  constructor() {
    makeAutoObservable(this);
    this.loadUserState();
    this.setupInactivityTimer();
  }

  getUserKey(key) {
    return this.user_id !== null && this.selectedProjectId !== null
      ? `${this.user_id}_${this.selectedProjectId}_${key}`
      : `${this.user_id}_${key}`;
  }

  loadUserState() {
    this.token = localStorage.getItem('access_token') || null;
    if (this.token) {
      this.username = localStorage.getItem(this.getUserKey('username')) || null;
      this.user_id = Number(localStorage.getItem(this.getUserKey('user_id'))) || null;
      this.role_id = Number(localStorage.getItem(this.getUserKey('role_id'))) || null;
      const savedProjectId = localStorage.getItem(this.getUserKey('selectedProjectId'));
      this.selectedProjectId = savedProjectId !== null ? Number(savedProjectId) : null;

      this.selectedPage = localStorage.getItem(this.getUserKey('selectedPage')) || 'welcome';
      this.sidebarCollapsed = localStorage.getItem(this.getUserKey('sidebarCollapsed')) === 'true';
      this.openKeys = JSON.parse(localStorage.getItem(this.getUserKey('openKeys'))) || [];
      this.documentsColumnsSettings = JSON.parse(localStorage.getItem(this.getUserKey('documentsColumnsSettings'))) || null;
      this.transmittalsColumnsSettings = JSON.parse(localStorage.getItem(this.getUserKey('transmittalsColumnsSettings'))) || null;

      this.updateUserProjects();
    }
  }

  verifyToken = action(async () => {
    try {
      const result = await verifyToken();
      console.log('verifyToken result:', result);
      return result;
    } catch (error) {
      console.error('Token verification failed:', error);
      this.clearUser();
      return false;
    }
  });

  setupInactivityTimer = action(() => {
    this.clearInactivityTimer();
    if (this.isAuthenticated && this.inactivityLimit) {
      this.inactivityTimeout = setTimeout(() => {
        this.clearUser();
        notification.error({
          message: 'Session Expired',
          description: 'You were inactive for too long. Please log in again.',
          placement: 'topRight',
        });
        window.location.href = '/';
      }, this.inactivityLimit);
    }
  });

  resetInactivityTimer = action(() => {
    this.setupInactivityTimer();
  });

  clearInactivityTimer = action(() => {
    if (this.inactivityTimeout) {
      clearTimeout(this.inactivityTimeout);
      this.inactivityTimeout = null;
    }
  });

  setUser = action(({ token, username, user_id, role_id, expires_in }) => {
    this.token = token;
    this.username = username;
    this.user_id = Number(user_id);
    this.role_id = Number(role_id);
    this.inactivityLimit = expires_in * 1000;
    localStorage.setItem('access_token', token);
    localStorage.setItem(this.getUserKey('username'), username);
    localStorage.setItem(this.getUserKey('user_id'), String(user_id));
    localStorage.setItem(this.getUserKey('role_id'), String(role_id));
    localStorage.setItem(this.getUserKey('expires_in'), String(expires_in));
    this.loadUserState();
    this.setupInactivityTimer();
  });

  clearUser = action(() => {
    this.token = null;
    this.username = null;
    this.user_id = null;
    this.role_id = null;
    this.projects = [];
    //this.selectedPage = 'welcome';
    //this.sidebarCollapsed = false;
    //this.selectedProjectId = null;
    //this.openKeys = [];
    //this.documentsColumnsSettings = null;
    //this.transmittalsColumnsSettings = null;
    this.inactivityLimit = null;

    this.clearInactivityTimer();

    localStorage.removeItem('access_token');
    localStorage.removeItem(this.getUserKey('username'));
    localStorage.removeItem(this.getUserKey('user_id'));
    localStorage.removeItem(this.getUserKey('role_id'));
    localStorage.removeItem(this.getUserKey('selectedProjectId'));
    //localStorage.removeItem(this.getUserKey('selectedPage'));
    //localStorage.removeItem(this.getUserKey('sidebarCollapsed'));
    //localStorage.removeItem(this.getUserKey('openKeys'));
    //localStorage.removeItem(this.getUserKey('documentsColumnsSettings'));
    //localStorage.removeItem(this.getUserKey('transmittalsColumnsSettings'));
    localStorage.removeItem(this.getUserKey('expires_in'));
  });

  updateUserProjects = action(async () => {
    if (this.user_id === null) {
      this.projects = [];
      return;
    }
    try {
      const projectData = await getUserProjects(this.user_id);
      runInAction(() => {
        this.projects = projectData;
      });
    } catch (error) {
      console.error('Error updating user projects:', error);
      runInAction(() => {
        this.projects = [];
      });
    }
  });

  setSelectedProjectId = action((projectId) => {
    this.selectedProjectId = projectId !== null ? Number(projectId) : null;
    localStorage.setItem(this.getUserKey('selectedProjectId'), String(projectId));
  });

  setSelectedPage = action((page) => {
    this.selectedPage = page;
    localStorage.setItem(this.getUserKey('selectedPage'), page);
  });

  setSidebarCollapsed = action((collapsed) => {
    this.sidebarCollapsed = collapsed;
    localStorage.setItem(this.getUserKey('sidebarCollapsed'), String(collapsed));
  });

  setOpenKeys = action((keys) => {
    this.openKeys = Array.isArray(keys) ? keys : [];
    localStorage.setItem(this.getUserKey('openKeys'), JSON.stringify(this.openKeys));
  });

  setDocumentsColumnsSettings = action((settings) => {
    this.documentsColumnsSettings = settings;
    localStorage.setItem(this.getUserKey('documentsColumnsSettings'), JSON.stringify(settings));
  });

  setTransmittalsColumnsSettings = action((settings) => {
    this.transmittalsColumnsSettings = settings;
    localStorage.setItem(this.getUserKey('transmittalsColumnsSettings'), JSON.stringify(settings));
  });

  get isAuthenticated() {
    return !!this.token;
  }
}

export const authStore = new AuthStore();