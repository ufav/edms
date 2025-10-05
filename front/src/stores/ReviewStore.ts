import { makeAutoObservable, runInAction } from 'mobx';
import { reviewsApi, type Review as ApiReview } from '../api/client';

export interface Review {
  id: number;
  document_id: number;
  document_title: string;
  reviewer_id: number;
  reviewer_name: string;
  status: string;
  comments: string;
  rating: number;
  created_at: string;
}

class ReviewStore {
  reviews: Review[] = [];
  isLoading = false;
  error: string | null = null;
  loadedProjectId: number | null = null; // Отслеживаем для какого проекта загружены данные

  constructor() {
    makeAutoObservable(this);
  }

  // Загрузка ревью из API
  async loadReviews(projectId?: number) {
    // Если данные уже загружены для этого проекта, не загружаем повторно
    if (projectId && this.loadedProjectId === projectId && this.reviews.length > 0) {
      return;
    }

    runInAction(() => {
      this.isLoading = true;
      this.error = null;
    });
    
    try {
      const apiReviews = await reviewsApi.getAll(projectId);
      runInAction(() => {
        this.reviews = apiReviews.map(apiReview => ({
          id: apiReview.id,
          document_id: apiReview.document_id,
          document_title: apiReview.document_title,
          reviewer_id: apiReview.reviewer_id,
          reviewer_name: apiReview.reviewer_name,
          status: apiReview.status,
          comments: apiReview.comments,
          rating: apiReview.rating,
          created_at: apiReview.created_at
        }));
        this.loadedProjectId = projectId || null;
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
