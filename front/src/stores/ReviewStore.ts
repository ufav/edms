import { makeAutoObservable, runInAction } from 'mobx';
import { reviewsApi, type Review as ApiReview } from '../api/client';

export interface Review {
  document_id: number;
  document_title: string;
  document_number: string;
  project_id: number;
  project_name: string;
  revision_id: number;
  revision_number: string;
  file_name: string;
  file_size: number;
  file_type: string;
  change_description: string;
  created_at: string;
  uploaded_by: number;
  current_step: {
    id: number;
    code: string;
    description: string;
    description_native: string;
  } | null;
}

class ReviewStore {
  reviews: Review[] = [];
  isLoading = false;
  error: string | null = null;
  loadedProjectId: number | null = null; // Отслеживаем для какого проекта загружены данные
  lastLoadedAt: number | null = null; // Время последней загрузки
  cacheTTL = 3 * 60 * 1000; // 3 минуты TTL для кеша ревью

  constructor() {
    makeAutoObservable(this);
  }

  // Загрузка ревью из API
  async loadReviews(projectId?: number, forceReload = false) {
    // Проверяем TTL кеша
    const now = Date.now();
    const isCacheExpired = this.lastLoadedAt && (now - this.lastLoadedAt) > this.cacheTTL;
    
    // Если данные уже загружены для этого проекта и кеш не истек, не загружаем повторно
    if (projectId && this.loadedProjectId === projectId && this.reviews.length > 0 && !forceReload && !isCacheExpired) {
      return;
    }
    
    // Если проект изменился, сбрасываем данные
    if (projectId && this.loadedProjectId !== projectId) {
      runInAction(() => {
        this.reviews = [];
        this.loadedProjectId = null;
      });
    }

    runInAction(() => {
      this.isLoading = true;
      this.error = null;
    });
    
    try {
      const apiReviews = await reviewsApi.getPendingApprovals(0, 100, projectId);
      runInAction(() => {
        // Сохраняем оригинальные данные без маппинга
        this.reviews = apiReviews;
        this.loadedProjectId = projectId || null;
        this.lastLoadedAt = now;
      });
    } catch (error) {
      runInAction(() => {
        this.error = 'Ошибка загрузки ревью';
        this.reviews = [];
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  // Принудительное обновление ревью
  async refreshReviews(projectId?: number) {
    await this.loadReviews(projectId, true);
  }

  // Получение ревью по ID
  getReviewById(id: number): Review | undefined {
    return this.reviews.find(review => review.id === id);
  }

  // Получение ревью по проекту
  getReviewsByProject(projectId: number): Review[] {
    return this.reviews.filter(review => review.document_id === projectId);
  }

  // Получение статуса ревью
  getReviewStatusLabel(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': 'Ожидает',
      'in_progress': 'В процессе',
      'completed': 'Завершено',
      'rejected': 'Отклонено'
    };
    return statusMap[status] || status;
  }

  // Получение цвета статуса ревью
  getReviewStatusColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      'pending': 'warning',
      'in_progress': 'info',
      'completed': 'success',
      'rejected': 'error'
    };
    return colorMap[status] || 'default';
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

export const reviewStore = new ReviewStore();
