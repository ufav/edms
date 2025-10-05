import { makeAutoObservable, runInAction } from 'mobx';
import { transmittalsApi, type Transmittal as ApiTransmittal } from '../api/client';

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

class TransmittalStore {
  transmittals: Transmittal[] = [];
  isLoading = false;
  error: string | null = null;
  loadedProjectId: number | null = null; // Отслеживаем для какого проекта загружены данные

  constructor() {
    makeAutoObservable(this);
  }

  // Загрузка трансмитталов из API
  async loadTransmittals(projectId?: number) {
    // Если данные уже загружены для этого проекта, не загружаем повторно
    if (projectId && this.loadedProjectId === projectId && this.transmittals.length > 0) {
      return;
    }

    runInAction(() => {
      this.isLoading = true;
      this.error = null;
    });
    
    try {
      const apiTransmittals = await transmittalsApi.getAll(projectId);
      runInAction(() => {
        this.transmittals = apiTransmittals.map(apiTransmittal => ({
          id: apiTransmittal.id,
          transmittal_number: apiTransmittal.transmittal_number,
          title: apiTransmittal.title,
          description: apiTransmittal.description,
          project_id: apiTransmittal.project_id,
          sender_id: apiTransmittal.sender_id,
          recipient_id: apiTransmittal.recipient_id,
          status: apiTransmittal.status,
          sent_date: apiTransmittal.sent_date,
          received_date: apiTransmittal.received_date,
          created_at: apiTransmittal.created_at,
          updated_at: apiTransmittal.updated_at
        }));
        this.loadedProjectId = projectId || null;
      });
    } catch (error) {
      runInAction(() => {
        this.error = 'Ошибка загрузки трансмитталов';
        this.transmittals = [];
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  // Получение трансмиттала по ID
  getTransmittalById(id: number): Transmittal | undefined {
    return this.transmittals.find(transmittal => transmittal.id === id);
  }

  // Получение трансмитталов по проекту
  getTransmittalsByProject(projectId: number): Transmittal[] {
    return this.transmittals.filter(transmittal => transmittal.project_id === projectId);
  }

  // Получение статуса трансмиттала
  getTransmittalStatusLabel(status: string): string {
    const statusMap: { [key: string]: string } = {
      'draft': 'Черновик',
      'sent': 'Отправлен',
      'received': 'Получен',
      'acknowledged': 'Подтвержден',
      'rejected': 'Отклонен'
    };
    return statusMap[status] || status;
  }

  // Получение цвета статуса трансмиттала
  getTransmittalStatusColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      'draft': 'default',
      'sent': 'warning',
      'received': 'info',
      'acknowledged': 'success',
      'rejected': 'error'
    };
    return colorMap[status] || 'default';
  }

  // Форматирование даты
  formatDate(dateString: string | null): string {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  }
}

export const transmittalStore = new TransmittalStore();
