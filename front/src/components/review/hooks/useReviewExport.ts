import { reviewsApi } from '../../../api/client';
import { projectStore } from '../../../stores/ProjectStore';
import { reviewStore } from '../../../stores/ReviewStore';
// @ts-ignore - xlsx-js-style не имеет типов
import * as XLSX from 'xlsx-js-style';
import { useTranslation } from 'react-i18next';
import type { Review } from '../../../stores/ReviewStore';

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
  const { t, i18n } = useTranslation();
  
  const exportToExcel = async (params: ReviewExportParams) => {
    try {
      // Используем данные из reviewStore или загружаем заново
      let allReviews: Review[] = [];
      
      if (reviewStore.reviews.length > 0 && reviewStore.loadedProjectId === params.projectId) {
        // Используем уже загруженные данные
        allReviews = reviewStore.reviews;
      } else {
        // Загружаем все ревью для проекта
        allReviews = await reviewsApi.getPendingApprovals(0, 10000, params.projectId);
      }
      
      // Применяем фильтры
      let filteredReviews = allReviews;
      
      if (params.search) {
        const searchLower = params.search.toLowerCase();
        filteredReviews = filteredReviews.filter(review =>
          review.document_title?.toLowerCase().includes(searchLower) ||
          review.document_number?.toLowerCase().includes(searchLower) ||
          review.project_name?.toLowerCase().includes(searchLower)
        );
      }
      
      if (params.onlyOverdue) {
        filteredReviews = filteredReviews.filter(review => review.is_overdue === true);
      }
      
      if (params.selectedCompany) {
        if (params.selectedCompany === '__internal__') {
          filteredReviews = filteredReviews.filter(review => review.requires_transmittal === false);
        } else {
          filteredReviews = filteredReviews.filter(review => 
            review.awaiting_company?.name === params.selectedCompany
          );
        }
      }
      
      const language = params.language || i18n.language;
      
      // Форматирование даты
      const formatDate = (dateString: string | null): string => {
        if (!dateString) return '';
        try {
          const date = new Date(dateString);
          const day = date.getDate().toString().padStart(2, '0');
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const year = date.getFullYear();
          const hours = date.getHours().toString().padStart(2, '0');
          const minutes = date.getMinutes().toString().padStart(2, '0');
          return `${day}.${month}.${year} ${hours}:${minutes}`;
        } catch (error) {
          return '';
        }
      };
      
      // Форматирование размера файла
      const formatFileSize = (bytes: number): string => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
      };
      
      // Функция для вычисления количества дней просрочки
      const getOverdueDays = (dueDate: string | null): number | null => {
        if (!dueDate) return null;
        try {
          const due = new Date(dueDate);
          const now = new Date();
          const diffTime = now.getTime() - due.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          return diffDays > 0 ? diffDays : null;
        } catch (error) {
          return null;
        }
      };
      
      // Функция для правильного склонения слова "день"
      const getDaysWord = (days: number): string => {
        if (language === 'ru') {
          const lastDigit = days % 10;
          const lastTwoDigits = days % 100;
          
          if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
            return t('reviews.days_plural');
          }
          if (lastDigit === 1) {
            return t('reviews.day_singular');
          }
          if (lastDigit >= 2 && lastDigit <= 4) {
            return t('reviews.days_few');
          }
          return t('reviews.days_plural');
        }
        return days === 1 ? t('reviews.day_singular') : t('reviews.days_plural');
      };
      
      // Маппинг между полями ревью и значениями для Excel
      const excelData = filteredReviews.map((review: Review) => {
        // Формируем поле просрочено
        let overdueValue = '';
        if (review.is_overdue && review.due_date) {
          const overdueDays = getOverdueDays(review.due_date);
          if (overdueDays) {
            overdueValue = `${t('reviews.overdue_on')} ${overdueDays} ${getDaysWord(overdueDays)}`;
          } else {
            overdueValue = t('reviews.overdue');
          }
        }
        
        // Формируем поле текущего шага
        let currentStepValue = '';
        if (review.current_step) {
          const description = language === 'ru' && review.current_step.description_native
            ? review.current_step.description_native
            : review.current_step.description;
          // Проверяем, что description существует и не null/undefined
          if (description && description.trim() !== '') {
            currentStepValue = `${review.current_step.code} - ${description}`;
          } else {
            // Если description нет, показываем только code
            currentStepValue = review.current_step.code;
          }
        }
        
        return {
          [t('reviews.document')]: review.document_number || '',
          [t('documents.columns.title')]: review.document_title || '',
          [t('reviews.project')]: review.project_name || '',
          [t('reviews.revision')]: review.current_description?.code
            ? `${review.current_description.code}${review.revision_number || ''}`
            : (review.revision_number || ''),
          [t('reviews.current_step')]: currentStepValue,
          [t('reviews.awaiting_company')]: review.awaiting_company
            ? review.awaiting_company.name
            : (review.requires_transmittal === false ? t('reviews.internal_review') : ''),
          [t('reviews.release_date')]: formatDate(review.release_date),
          [t('reviews.due_days')]: review.due_days || '',
          [t('reviews.due_date')]: formatDate(review.due_date),
          [t('reviews.overdue')]: overdueValue,
          [t('documents.columns.file')]: review.file_name || '',
          [t('documents.columns.size')]: formatFileSize(review.file_size),
        };
      });
      
      // Создаем рабочую книгу
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, t('reviews.title'));
      
      // Настраиваем ширину колонок
      const columnWidths: { wch: number }[] = [];
      const headers = Object.keys(excelData[0] || {});
      
      headers.forEach((header) => {
        let width = header.length;
        excelData.forEach((row: any) => {
          const value = row[header];
          if (value !== null && value !== undefined) {
            const valueLength = String(value).length;
            if (valueLength > width) {
              width = valueLength;
            }
          }
        });
        let finalWidth = Math.min(Math.max(width + 2, 10), 50);
        if (header.includes('title') || header.includes('Название') || header.includes('Документ')) {
          finalWidth = Math.min(Math.max(width + 2, 15), 60);
        } else if (header.includes('date') || header.includes('Дата')) {
          finalWidth = 20;
        } else if (header.includes('size') || header.includes('Размер')) {
          finalWidth = 15;
        }
        columnWidths.push({ wch: finalWidth });
      });
      
      ws['!cols'] = columnWidths;
      
      // Замораживаем первую строку (заголовки)
      // Примечание: xlsx-js-style может не поддерживать закрепление панелей во всех версиях Excel
      ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' };
      ws['!views'] = [{
        state: 'frozen',
        ySplit: 1,
        topLeftCell: 'A2',
        activeCell: 'A2'
      }];
      
      // Добавляем автофильтр для заголовков
      if (excelData.length > 0) {
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
        ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: range.e.c, r: 0 } }) };
      }
      
      // Применяем стили к заголовкам
      const headerStyle = {
        font: { 
          bold: true, 
          sz: 11, 
          color: { rgb: 'FFFFFFFF' } 
        },
        fill: { 
          fgColor: { rgb: 'FF4472C4' },
          patternType: 'solid'
        },
        alignment: { 
          horizontal: 'center', 
          vertical: 'center', 
          wrapText: true 
        },
        border: {
          top: { style: 'thin', color: { rgb: 'FF000000' } },
          bottom: { style: 'thin', color: { rgb: 'FF000000' } },
          left: { style: 'thin', color: { rgb: 'FF000000' } },
          right: { style: 'thin', color: { rgb: 'FF000000' } }
        }
      };
      
      // Применяем стили к первой строке (заголовкам)
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ c: C, r: 0 });
        if (!ws[cellAddress]) {
          ws[cellAddress] = { t: 's', v: '' };
        }
        ws[cellAddress].s = JSON.parse(JSON.stringify(headerStyle));
      }
      
      // Применяем стили к данным (границы и выравнивание)
      const dataStyle = {
        alignment: { 
          vertical: 'center', 
          wrapText: true 
        },
        border: {
          top: { style: 'thin', color: { rgb: 'FFD0D0D0' } },
          bottom: { style: 'thin', color: { rgb: 'FFD0D0D0' } },
          left: { style: 'thin', color: { rgb: 'FFD0D0D0' } },
          right: { style: 'thin', color: { rgb: 'FFD0D0D0' } }
        }
      };
      
      // Применяем стили ко всем ячейкам с данными
      for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ c: C, r: R });
          if (!ws[cellAddress]) continue;
          ws[cellAddress].s = JSON.parse(JSON.stringify(dataStyle));
        }
      }
      
      // Устанавливаем высоту строки для заголовков
      if (!ws['!rows']) ws['!rows'] = [];
      ws['!rows'][0] = { hpt: 25 };
      
      // Генерируем имя файла
      const projectName = projectStore.selectedProject?.name || 'all_projects';
      const fileName = `reviews_${projectName}_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // Сохраняем файл с поддержкой стилей
      const wopts: any = { 
        bookType: 'xlsx', 
        bookSST: false, 
        type: 'array',
        cellStyles: true 
      };
      
      const wbout = XLSX.write(wb, wopts);
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Ошибка при экспорте в Excel:', error);
      throw error;
    }
  };
  
  return {
    exportToExcel,
  };
};
