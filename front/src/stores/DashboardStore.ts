import { makeAutoObservable, runInAction } from 'mobx';
import { projectStore } from './ProjectStore';
import { documentStore } from './DocumentStore';
import { transmittalStore } from './TransmittalStore';
import { reviewStore } from './ReviewStore';
import { userStore } from './UserStore';

export interface DashboardStats {
  totalProjects: number;
  totalDocuments: number;
  totalTransmittals: number;
  pendingReviews: number;
}

export interface RecentActivity {
  id: string;
  type: 'document' | 'transmittal' | 'review' | 'project';
  title: string;
  description: string;
  timestamp: string;
  icon: string;
}

class DashboardStore {
  isLoading = false;
  error: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  // Получение статистики
  getStats(): DashboardStats {
    return {
      totalProjects: projectStore.projects.length,
      totalDocuments: documentStore.documents.length,
      totalTransmittals: transmittalStore.transmittals.length,
      pendingReviews: reviewStore.reviews.filter(review => review.status === 'pending').length
    };
  }

  // Получение последних активностей
  getRecentActivities(): RecentActivity[] {
    const activities: RecentActivity[] = [];

    // Добавляем последние документы
    const recentDocuments = documentStore.documents
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 2);
    
    recentDocuments.forEach(doc => {
      activities.push({
        id: `doc-${doc.id}`,
        type: 'document',
        title: 'Загружен новый документ',
        description: `"${doc.title}" - ${this.formatTimeAgo(doc.created_at)}`,
        timestamp: doc.created_at,
        icon: 'document'
      });
    });

    // Добавляем последние трансмитталы
    const recentTransmittals = transmittalStore.transmittals
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 2);
    
    recentTransmittals.forEach(transmittal => {
      activities.push({
        id: `trans-${transmittal.id}`,
        type: 'transmittal',
        title: 'Трансмиттал отправлен',
        description: `${transmittal.transmittal_number} - ${this.formatTimeAgo(transmittal.created_at)}`,
        timestamp: transmittal.created_at,
        icon: 'transmittal'
      });
    });

    // Добавляем последние ревью
    const recentReviews = reviewStore.reviews
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 2);
    
    recentReviews.forEach(review => {
      activities.push({
        id: `review-${review.id}`,
        type: 'review',
        title: 'Документ одобрен',
        description: `"${review.document_title}" - ${this.formatTimeAgo(review.created_at)}`,
        timestamp: review.created_at,
        icon: 'review'
      });
    });

    // Добавляем последние проекты
    const recentProjects = projectStore.projects
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 2);
    
    recentProjects.forEach(project => {
      activities.push({
        id: `project-${project.id}`,
        type: 'project',
        title: 'Создан новый проект',
        description: `"${project.name}" - ${this.formatTimeAgo(project.created_at)}`,
        timestamp: project.created_at,
        icon: 'project'
      });
    });

    // Сортируем по времени и возвращаем последние 4
    return activities
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 4);
  }

  // Форматирование времени "назад"
  private formatTimeAgo(dateString: string): string {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      
      if (diffInHours < 1) {
        return 'только что';
      } else if (diffInHours < 24) {
        return `${diffInHours} час${diffInHours === 1 ? '' : diffInHours < 5 ? 'а' : 'ов'} назад`;
      } else {
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays} дн${diffInDays === 1 ? 'ь' : diffInDays < 5 ? 'я' : 'ей'} назад`;
      }
    } catch (error) {
      return 'недавно';
    }
  }

  // Загрузка всех данных для дашборда
  async loadDashboardData(projectId?: number) {
    runInAction(() => {
      this.isLoading = true;
      this.error = null;
    });
    
    try {
      // Загружаем все данные параллельно (кроме документов - они загружаются в DocumentsPage)
      // Store'ы сами проверяют, нужно ли загружать данные повторно
      await Promise.all([
        projectStore.loadProjects(),
        transmittalStore.loadTransmittals(projectId),
        reviewStore.loadReviews(projectId),
        userStore.loadUsers()
      ]);
      
      runInAction(() => {
      });
    } catch (error) {
      runInAction(() => {
        this.error = 'Ошибка загрузки данных дашборда';
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }
}

export const dashboardStore = new DashboardStore();
