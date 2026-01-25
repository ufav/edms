import { reviewsApi } from '../../../api/client';
import { useTranslation } from 'react-i18next';

export interface ReviewExportParams {
  projectId?: number;
  search?: string;
  selectedCompany?: string | null;
  onlyOverdue?: boolean;
  language?: string;
}

export interface UseReviewExportReturn {
  exportToExcel: (params: ReviewExportParams) => Promise<void>;
}

export const useReviewExport = (): UseReviewExportReturn => {
  const { i18n } = useTranslation();
  
  const exportToExcel = async (params: ReviewExportParams) => {
    try {
      // Используем бэкенд-эндпоинт для генерации Excel
      // Это обеспечивает единую логику с автоматической рассылкой
      await reviewsApi.exportToExcel({
        projectId: params.projectId,
        search: params.search,
        selectedCompany: params.selectedCompany,
        onlyOverdue: params.onlyOverdue,
        language: params.language || i18n.language,
      });
    } catch (error: any) {
      console.error('Ошибка при экспорте в Excel:', error);
      throw error;
    }
  };
  
  return {
    exportToExcel,
  };
};
