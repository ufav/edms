import { makeAutoObservable, runInAction } from 'mobx';
import { projectStore } from './ProjectStore';
import { documentStore } from './DocumentStore';
import { transmittalStore } from './TransmittalStore';
import { reviewStore } from './ReviewStore';
import { userStore } from './UserStore';
import { referencesStore } from './ReferencesStore';
import { documentsApi } from '../api/client';

export interface DashboardStats {
  totalProjects: number;
  totalDocuments: number;
  totalTransmittals: number;
  pendingReviews: number;
}

export interface DisciplineStat {
  disciplineId: number | null;
  disciplineCode?: string;
  disciplineName?: string;
  documentsCount: number;
  closedDocumentsCount: number;
  closedRatio: number; // 0..1
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
  documentsCount = 0; // Количество документов для текущего проекта

  constructor() {
    makeAutoObservable(this);
  }

  // Получение количества документов для проекта
  async getDocumentsCount(projectId: number): Promise<number> {
    try {
      const response = await documentsApi.getPage({
        page: 1,
        size: 1, // Нам нужен только total, поэтому берем минимум
        project_id: projectId
      });
      return response.total;
    } catch (error) {
      return 0;
    }
  }

  // Получение статистики
  getStats(): DashboardStats {
    const selectedProjectId = projectStore.selectedProject?.id;
    
    // Если проект не выбран, показываем только количество проектов
    if (!selectedProjectId) {
      return {
        totalProjects: projectStore.projects.length,
        totalDocuments: 0,
        totalTransmittals: 0,
        pendingReviews: 0
      };
    }
    
    // Если проект выбран, показываем статистику для этого проекта
    const filteredTransmittals = transmittalStore.transmittals.filter(trans => trans.project_id === selectedProjectId);
    // Все ревью считаются ожидающими, так как они загружаются через getPendingApprovals
    const filteredReviews = reviewStore.reviews.filter(review => review.project_id === selectedProjectId);
    
    return {
      totalProjects: projectStore.projects.length,
      totalDocuments: this.documentsCount,
      totalTransmittals: filteredTransmittals.length,
      pendingReviews: filteredReviews.length
    };
  }

  // Статистика по дисциплинам для выбранного проекта
  getDisciplineStats(): DisciplineStat[] {
    const selectedProjectId = projectStore.selectedProject?.id;
    if (!selectedProjectId) {
      return [];
    }

    const docs = documentStore.getDocumentsByProject(selectedProjectId);

    // Финальные workflow статусы считаем "закрытыми" документами
    const finalStatusNames = ["Approved", "Rejected", "Approved with Comments", "Not Reviewed"];
    const finalStatusIds = referencesStore.workflowStatuses
      .filter((s) => finalStatusNames.includes(s.name))
      .map((s) => s.id);
    const finalStatusIdSet = new Set<number>(finalStatusIds);

    const statsMap = new Map<number | 'none', DisciplineStat>();

    docs.forEach((doc) => {
      const key: number | 'none' = doc.discipline_id ?? 'none';
      let stat = statsMap.get(key);

      if (!stat) {
        stat = {
          disciplineId: doc.discipline_id ?? null,
          disciplineCode: doc.discipline_code,
          disciplineName: doc.discipline_name,
          documentsCount: 0,
          closedDocumentsCount: 0,
          closedRatio: 0,
        };
        statsMap.set(key, stat);
      }

      const isClosed =
        !!doc.workflow_status_id && finalStatusIdSet.has(doc.workflow_status_id);

      stat.documentsCount += 1;
      if (isClosed) {
        stat.closedDocumentsCount += 1;
      }
    });

    return Array.from(statsMap.values())
      .map((stat) => ({
        ...stat,
        closedRatio:
          stat.documentsCount > 0
            ? stat.closedDocumentsCount / stat.documentsCount
            : 0,
      }))
      .sort((a, b) => {
        const codeA = a.disciplineCode || "";
        const codeB = b.disciplineCode || "";
        return codeA.localeCompare(codeB, undefined, { sensitivity: "base" });
      });
  }

  // Получение последних активностей
  getRecentActivities(t?: (key: string, options?: any) => string): RecentActivity[] {
    const activities: RecentActivity[] = [];

    // Добавляем последние документы
    const recentDocuments = documentStore.documents
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 2);
    
    recentDocuments.forEach((doc, index) => {
      // Используем doc.id если он есть, иначе используем индекс
      const docId = doc.id || `document-${index}`;
      activities.push({
        id: `doc-${docId}`,
        type: 'document',
        title: t ? t('dashboard.activity.document_uploaded') : 'Загружен новый документ',
        description: `"${doc.title}" - ${this.formatTimeAgo(doc.created_at, t)}`,
        timestamp: doc.created_at,
        icon: 'document'
      });
    });

    // Добавляем последние трансмитталы
    const recentTransmittals = transmittalStore.transmittals
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 2);
    
    recentTransmittals.forEach((transmittal, index) => {
      const isSent = transmittal.status === 'sent';
      const title = isSent 
        ? (t ? t('dashboard.activity.transmittal_sent') : 'Трансмиттал отправлен')
        : (t ? t('dashboard.activity.transmittal_created') : 'Создан трансмиттал');
      
      // Используем transmittal.id если он есть, иначе используем индекс
      const transmittalId = transmittal.id || `transmittal-${index}`;
      activities.push({
        id: `trans-${transmittalId}`,
        type: 'transmittal',
        title: title,
        description: `${transmittal.transmittal_number} - ${this.formatTimeAgo(transmittal.created_at, t)}`,
        timestamp: transmittal.created_at,
        icon: 'transmittal'
      });
    });

    // Добавляем последние ревью
    const recentReviews = reviewStore.reviews
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 2);
    
    recentReviews.forEach((review, index) => {
      // Используем review.id если он есть, иначе используем индекс
      const reviewId = review.id || `review-${index}`;
      activities.push({
        id: `review-${reviewId}`,
        type: 'review',
        title: t ? t('dashboard.activity.document_approved') : 'Документ одобрен',
        description: `"${review.document_title}" - ${this.formatTimeAgo(review.created_at, t)}`,
        timestamp: review.created_at,
        icon: 'review'
      });
    });

    // Добавляем последние проекты
    const recentProjects = projectStore.projects
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 2);
    
    recentProjects.forEach((project, index) => {
      // Используем project.id если он есть, иначе используем индекс
      const projectId = project.id || `project-${index}`;
      activities.push({
        id: `project-${projectId}`,
        type: 'project',
        title: t ? t('dashboard.activity.project_created') : 'Создан новый проект',
        description: `"${project.name}" - ${this.formatTimeAgo(project.created_at, t)}`,
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
  private formatTimeAgo(dateString: string, t?: (key: string, options?: any) => string): string {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      
      if (diffInHours < 1) {
        return t ? t('dashboard.time.just_now') : 'только что';
      } else if (diffInHours < 24) {
        if (t) {
          return t('dashboard.time.hours_ago', { count: diffInHours });
        }
        return `${diffInHours} час${diffInHours === 1 ? '' : diffInHours < 5 ? 'а' : 'ов'} назад`;
      } else {
        const diffInDays = Math.floor(diffInHours / 24);
        if (t) {
          return t('dashboard.time.days_ago', { count: diffInDays });
        }
        return `${diffInDays} дн${diffInDays === 1 ? 'ь' : diffInDays < 5 ? 'я' : 'ей'} назад`;
      }
    } catch (error) {
      return t ? t('dashboard.time.recently') : 'недавно';
    }
  }

  // Загрузка всех данных для дашборда
  async loadDashboardData(projectId?: number) {
    runInAction(() => {
      this.isLoading = true;
      this.error = null;
    });
    
    try {
      // Загружаем все данные параллельно
      // Store'ы сами проверяют, нужно ли загружать данные повторно
      await Promise.all([
        projectStore.loadProjects(),
        documentStore.loadDocuments(projectId),
        transmittalStore.loadTransmittals(projectId),
        reviewStore.loadReviews(projectId, true), // Принудительная загрузка
        userStore.loadUsers(),
        referencesStore.loadWorkflowStatuses(),
      ]);
      
      // Загружаем количество документов отдельно
      if (projectId) {
        const documentsCount = await this.getDocumentsCount(projectId);
        runInAction(() => {
          this.documentsCount = documentsCount;
        });
      } else {
        runInAction(() => {
          this.documentsCount = 0;
        });
      }
      
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
