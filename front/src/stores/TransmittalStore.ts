import { makeAutoObservable, runInAction } from 'mobx';
import { transmittalsApi, type Transmittal as ApiTransmittal } from '../api/client';

export interface Transmittal {
  id: number;
  transmittal_number: string;
  title: string;
  description: string;
  project_id: number;
  sender_id: number | null;
  // New unified fields
  direction?: 'out' | 'in' | null;
  counterparty_id?: number | null;
  transmittal_date?: string | null;
  created_by: number;
  status: string;
  created_at: string;
  updated_at: string;
}

class TransmittalStore {
  transmittals: Transmittal[] = [];
  isLoading = false;
  error: string | null = null;
  // Details state
  detailsLoading = false;
  detailsError: string | null = null;
  selectedTransmittal: Transmittal | null = null;
  selectedRevisions: any[] = [];
  loadedProjectId: number | null = null; // Отслеживаем для какого проекта загружены данные

  constructor() {
    makeAutoObservable(this);
  }

  // Загрузка трансмитталов из API
  async loadTransmittals(projectId?: number, forceReload = false) {
    // Если данные уже загружены для этого проекта, не загружаем повторно (если не принудительная перезагрузка)
    if (!forceReload && projectId && this.loadedProjectId === projectId && this.transmittals.length > 0) {
      return;
    }

    runInAction(() => {
      this.isLoading = true;
      this.error = null;
    });
    
    try {
      const apiTransmittals = await transmittalsApi.getAll(projectId);
      
      runInAction(() => {
        this.transmittals = apiTransmittals
          .map(apiTransmittal => ({
            id: apiTransmittal.id,
            transmittal_number: apiTransmittal.transmittal_number,
            title: apiTransmittal.title,
            description: apiTransmittal.description,
            project_id: apiTransmittal.project_id,
            sender_id: apiTransmittal.sender_id,
            direction: apiTransmittal.direction ?? null,
            counterparty_id: apiTransmittal.counterparty_id ?? null,
            transmittal_date: apiTransmittal.transmittal_date ?? null,
            created_by: apiTransmittal.created_by,
            status: apiTransmittal.status,
            created_at: apiTransmittal.created_at,
            updated_at: apiTransmittal.updated_at
          }))
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
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

  async loadTransmittalDetails(id: number) {
    runInAction(() => {
      this.detailsLoading = true;
      this.detailsError = null;
      // Сбрасываем предыдущие данные, чтобы не мигал старый список
      this.selectedTransmittal = null;
      this.selectedRevisions = [];
    });
    try {
      const details = await transmittalsApi.getById(id);
      runInAction(() => {
        // Нормализуем в Transmittal (части могут отсутствовать в ответе)
        this.selectedTransmittal = {
          id: details.id,
          transmittal_number: details.transmittal_number,
          title: details.title,
          description: details.description,
          project_id: details.project_id,
          sender_id: details.sender_id,
          direction: details.direction ?? null,
          counterparty_id: details.counterparty_id ?? null,
          transmittal_date: details.transmittal_date ?? null,
          created_by: details.created_by ?? 0,
          status: details.status ?? 'draft',
          created_at: details.created_at ?? '',
          updated_at: details.updated_at ?? '',
        } as any;
        this.selectedRevisions = (details as any).revisions || [];
      });
    } catch (e) {
      runInAction(() => {
        this.detailsError = 'Ошибка загрузки трансмиттала';
        this.selectedTransmittal = null;
        this.selectedRevisions = [];
      });
    } finally {
      runInAction(() => {
        this.detailsLoading = false;
      });
    }
  }

  // Получение трансмитталов по проекту
  getTransmittalsByProject(projectId: number): Transmittal[] {
    return this.transmittals.filter(transmittal => transmittal.project_id === projectId);
  }

  // Получение статуса трансмиттала
  getTransmittalStatusLabel(status: string, t?: (key: string) => string): string {
    // Нормализуем статус к нижнему регистру для поиска в локализации
    const normalizedStatus = status.toLowerCase();
    
    if (t) {
      const key = `transmittals.status.${normalizedStatus}`;
      const result = t(key);
      
      // Если локализация не работает, используем fallback
      if (result === key) {
        const statusMap: { [key: string]: string } = {
          'draft': 'Черновик',
          'sent': 'Отправлен',
          'received': 'Получен',
          'acknowledged': 'Подтвержден',
          'rejected': 'Отклонен'
        };
        return statusMap[normalizedStatus] || status;
      }
      
      return result;
    }
    
    // Fallback для случаев, когда t не передана
    const statusMap: { [key: string]: string } = {
      'draft': 'Черновик',
      'sent': 'Отправлен',
      'received': 'Получен',
      'acknowledged': 'Подтвержден',
      'rejected': 'Отклонен'
    };
    return statusMap[normalizedStatus] || status;
  }

  // Получение цвета статуса трансмиттала
  getTransmittalStatusColor(status: string): string {
    // Нормализуем статус к нижнему регистру
    const normalizedStatus = status.toLowerCase();
    
    const colorMap: { [key: string]: string } = {
      'draft': 'default',
      'sent': 'warning',
      'received': 'info',
      'acknowledged': 'success',
      'rejected': 'error'
    };
    return colorMap[normalizedStatus] || 'default';
  }



  // Форматирование даты
  formatDate(dateString: string | null): string {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${day}.${month}.${year} ${hours}:${minutes}`;
    } catch (error) {
      return dateString;
    }
  }
}

export const transmittalStore = new TransmittalStore();
