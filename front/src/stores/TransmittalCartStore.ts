import { makeAutoObservable, runInAction } from 'mobx';
import { transmittalsApi } from '../api/client';

export interface SelectedRevision {
  id: number;
  document_id: number;
  document_title: string;
  document_number: string;
  revision_number: string;
  revision_description_code?: string;
  file_name: string;
  file_size: number;
  created_at: string;
}

class TransmittalCartStore {
  // Состояние
  selectedRevisionIds: number[] = [];
  isLoading: boolean = false;
  error: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  // Добавление ревизии в корзину
  addRevision = (revisionId: number) => {
    if (!this.selectedRevisionIds.includes(revisionId)) {
      this.selectedRevisionIds.push(revisionId);
    }
    this.error = null;
  };

  // Удаление ревизии из корзины
  removeRevision = (revisionId: number) => {
    this.selectedRevisionIds = this.selectedRevisionIds.filter(id => id !== revisionId);
    this.error = null;
  };

  // Очистка всей корзины
  clearAll = () => {
    this.selectedRevisionIds = [];
    this.error = null;
  };

  // Проверка, выбрана ли ревизия
  isRevisionSelected = (revisionId: number): boolean => {
    return this.selectedRevisionIds.includes(revisionId);
  };

  // Получение количества выбранных ревизий
  get selectedCount(): number {
    return this.selectedRevisionIds.length;
  };

  // Проверка, пуста ли корзина
  get isEmpty(): boolean {
    return this.selectedRevisionIds.length === 0;
  };

  // Создание трансмиттала
  createTransmittal = async (transmittalData: any, projectId: number) => {
    if (this.selectedRevisionIds.length === 0) {
      runInAction(() => {
        this.error = 'Выберите хотя бы одну ревизию для создания трансмиттала';
      });
      return;
    }

    runInAction(() => {
      this.isLoading = true;
      this.error = null;
    });

    try {
      // Подготавливаем данные для создания трансмиттала
      const transmittalCreateData = {
        ...transmittalData,
        project_id: projectId,
        revision_ids: this.selectedRevisionIds
      };

      // Создаем трансмиттал через API
      await transmittalsApi.create(transmittalCreateData);

      // Очищаем корзину после успешного создания
      this.clearAll();
      
      return true; // Успешное создание
    } catch (err: any) {
      runInAction(() => {
        this.error = err.message || 'Ошибка создания трансмиттала';
      });
      throw err; // Пробрасываем ошибку дальше
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  };

  // Получение выбранных ревизий из списка активных ревизий
  getSelectedRevisions = (activeRevisions: SelectedRevision[]): SelectedRevision[] => {
    return activeRevisions.filter(revision => 
      this.selectedRevisionIds.includes(revision.id)
    );
  };
}

export const transmittalCartStore = new TransmittalCartStore();
