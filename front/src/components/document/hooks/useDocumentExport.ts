import { documentsApi, type Document } from '../../../api/client';
import { projectStore } from '../../../stores/ProjectStore';
// @ts-ignore - xlsx-js-style не имеет типов
import * as XLSX from 'xlsx-js-style';
import { useTranslation } from 'react-i18next';
import type { ColumnVisibility, ColumnOrder } from './useDocumentSettings';
import { documentStore } from '../../../stores/DocumentStore';
import { referencesStore } from '../../../stores/ReferencesStore';
import { languageStore } from '../../../stores/LanguageStore';
import { userStore } from '../../../stores/UserStore';

export interface DocumentExportParams {
  projectId?: number;
  status?: string;
  search?: string;
  disciplineId?: number;
  documentTypeId?: number;
  revisionDescriptionId?: number;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortDir?: string;
  visibleCols?: ColumnVisibility;
  columnOrder?: ColumnOrder[];
  language?: string;
}

export interface UseDocumentExportReturn {
  exportToExcel: (params: DocumentExportParams) => Promise<void>;
}

export const useDocumentExport = (): UseDocumentExportReturn => {
  const { t, i18n } = useTranslation();
  
  const exportToExcel = async (params: DocumentExportParams) => {
    try {
      // Загружаем документы порциями, чтобы избежать таймаутов
      const pageSize = 100; // Максимальный размер страницы, поддерживаемый API
      let allDocuments: Document[] = [];
      let currentPage = 1;
      let totalPages = 1;

      // Загружаем первую страницу, чтобы узнать общее количество
      const firstResponse = await documentsApi.getPage({
        project_id: params.projectId,
        status: params.status === 'all' ? undefined : params.status,
        search: params.search || undefined,
        discipline_id: params.disciplineId || undefined,
        document_type_id: params.documentTypeId || undefined,
        revision_description_id: params.revisionDescriptionId || undefined,
        date_from: params.dateFrom,
        date_to: params.dateTo,
        sort_by: params.sortBy,
        sort_dir: params.sortDir,
        size: pageSize,
        page: currentPage,
      });

      allDocuments = [...firstResponse.items];
      totalPages = firstResponse.pages;

      // Загружаем остальные страницы
      while (currentPage < totalPages) {
        currentPage++;
        const response = await documentsApi.getPage({
          project_id: params.projectId,
          status: params.status === 'all' ? undefined : params.status,
          search: params.search || undefined,
          discipline_id: params.disciplineId || undefined,
          document_type_id: params.documentTypeId || undefined,
          revision_description_id: params.revisionDescriptionId || undefined,
          date_from: params.dateFrom,
          date_to: params.dateTo,
          sort_by: params.sortBy,
          sort_dir: params.sortDir,
          size: pageSize,
          page: currentPage,
        });
        allDocuments = [...allDocuments, ...response.items];
      }

      const language = params.language || i18n.language;

      // Маппинг между ключами колонок и полями документа
      const columnFieldMap: Record<string, (doc: Document) => any> = {
        number: (doc) => doc.number || '',
        title: (doc) => doc.title || '',
        file: (doc) => doc.file_name || '',
        size: (doc) => doc.file_size || 0,
        revision: (doc) => documentStore.getFullRevisionNumber(doc, referencesStore),
        status: (doc) => documentStore.getDocumentStatusLabel(doc, referencesStore, language),
        review_status: (doc) => referencesStore.getWorkflowStatusLabel(doc.workflow_status_id, language),
        language: (doc) => {
          const languageItem = languageStore.languages.find(l => l.id === doc.language_id);
          return languageItem ? languageItem.code : 'ru';
        },
        discipline: (doc) => doc.discipline_code || '',
        document_type: (doc) => doc.document_type_code || '',
        drs: (doc) => doc.drs || '',
        date: (doc) => {
          if (!doc.created_at) return null;
          try {
            return new Date(doc.created_at);
          } catch (error) {
            return null;
          }
        },
        updated_at: (doc) => {
          if (!doc.updated_at) return null;
          try {
            return new Date(doc.updated_at);
          } catch (error) {
            return null;
          }
        },
        created_by: (doc) => {
          const creator = userStore.users.find(user => user.id === doc.created_by);
          return creator ? creator.full_name : `User ${doc.created_by}`;
        },
      };

      // Маппинг между ключами колонок и локализованными заголовками
      const columnHeaderMap: Record<string, string> = {
        number: t('documents.export.columns.number'),
        title: t('documents.export.columns.title'),
        file: t('documents.export.columns.file_name'),
        size: t('documents.export.columns.file_size'),
        revision: t('documents.export.columns.revision'),
        status: t('documents.columns.status'),
        review_status: t('documents.columns.review_status'),
        language: t('documents.columns.language'),
        discipline: t('documents.export.columns.discipline'),
        document_type: t('documents.export.columns.document_type'),
        drs: t('documents.export.columns.drs'),
        date: t('documents.export.columns.created_at'),
        updated_at: t('documents.export.columns.updated_at'),
        created_by: t('documents.columns.created_by'),
      };

      // Определяем видимые колонки из настроек
      const visibleCols = params.visibleCols || {
        number: true,
        title: true,
        file: true,
        size: true,
        revision: true,
        status: true,
        review_status: true,
        language: true,
        drs: false,
        date: true,
        updated_at: true,
        created_by: true,
        discipline: true,
        document_type: true,
        actions: false,
      };

      // Получаем порядок колонок из настроек
      const columnOrder = params.columnOrder || [];
      
      // Определяем порядок колонок для экспорта
      const getExportColumnOrder = (): string[] => {
        if (columnOrder.length === 0) {
          // Если порядок не задан, используем дефолтный порядок
          return [
            'number', 'title', 'file', 'size', 'revision', 'status', 'review_status',
            'language', 'discipline', 'document_type', 'drs', 
            'date', 'updated_at', 'created_by'
          ];
        }
        
        // Сортируем колонки по порядку из columnOrder, исключая actions
        const orderedColumns = columnOrder
          .filter(col => col.column !== 'actions' && visibleCols[col.column as keyof ColumnVisibility])
          .sort((a, b) => a.order - b.order)
          .map(col => col.column);
        
        // Добавляем колонки, которые есть в visibleCols, но нет в columnOrder
        const allColumns = Object.keys(columnFieldMap);
        const unorderedColumns = allColumns.filter(col => 
          visibleCols[col as keyof ColumnVisibility] && 
          !columnOrder.some(orderedCol => orderedCol.column === col)
        );
        
        return [...orderedColumns, ...unorderedColumns];
      };

      const exportColumnOrder = getExportColumnOrder();

      // Формируем данные для Excel только с видимыми колонками в правильном порядке
      const excelData = allDocuments.map((doc: Document) => {
        const row: Record<string, any> = {};
        exportColumnOrder.forEach((columnKey) => {
          if (visibleCols[columnKey as keyof ColumnVisibility] && columnFieldMap[columnKey]) {
            const header = columnHeaderMap[columnKey];
            const value = columnFieldMap[columnKey](doc);
            row[header] = value;
          }
        });
        return row;
      });

      // Создаем рабочую книгу
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, t('documents.export.sheet_name'));

      // Настраиваем ширину колонок
      const columnWidths: { wch: number }[] = [];
      const headers = Object.keys(excelData[0] || {});
      
      // Определяем оптимальную ширину для каждой колонки
      headers.forEach((header) => {
        let width = header.length;
        // Проверяем максимальную длину данных в колонке
        excelData.forEach((row: any) => {
          const value = row[header];
          if (value !== null && value !== undefined) {
            const valueLength = String(value).length;
            if (valueLength > width) {
              width = valueLength;
            }
          }
        });
        // Добавляем небольшой отступ и ограничиваем максимальную ширину
        // Для разных типов колонок устанавливаем разную ширину
        let finalWidth = Math.min(Math.max(width + 2, 10), 50);
        if (header.includes('title') || header.includes('Название')) {
          finalWidth = Math.min(Math.max(width + 2, 15), 60);
        } else if (header.includes('description') || header.includes('Описание') || header.includes('remarks') || header.includes('Примечания')) {
          finalWidth = Math.min(Math.max(width + 2, 20), 80);
        } else if (header.includes('date') || header.includes('Дата')) {
          finalWidth = 20;
        } else if (header.includes('size') || header.includes('Размер')) {
          finalWidth = 15;
        }
        columnWidths.push({ wch: finalWidth });
      });
      
      ws['!cols'] = columnWidths;

      // Замораживаем первую строку (заголовки)
      ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' };

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
          // Создаем ячейку, если её нет
          ws[cellAddress] = { t: 's', v: '' };
        }
        // Применяем стиль с глубоким копированием
        ws[cellAddress].s = JSON.parse(JSON.stringify(headerStyle));
      }

      // Определяем, какие колонки содержат даты (по ключам колонок)
      const dateColumnKeys = ['date', 'updated_at'];
      
      // Находим индексы колонок с датами
      const dateColumnIndices: number[] = [];
      exportColumnOrder.forEach((columnKey) => {
        if (dateColumnKeys.includes(columnKey) && visibleCols[columnKey as keyof ColumnVisibility]) {
          // Находим индекс этой колонки в headers
          const header = columnHeaderMap[columnKey];
          const headerIndex = headers.indexOf(header);
          if (headerIndex !== -1) {
            dateColumnIndices.push(headerIndex);
          }
        }
      });

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

      // Стиль для ячеек с датами
      // В Excel формат даты с временем: ДД.ММ.ГГГГ чч:мм
      // Используем формат с экранированием разделителей для xlsx-js-style
      const dateStyle = {
        ...dataStyle,
        numFmt: 'dd"."mm"."yyyy" "hh":"mm' // Формат даты для Excel: ДД.ММ.ГГГГ чч:мм
      };

      // Применяем стили ко всем ячейкам с данными
      for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ c: C, r: R });
          if (!ws[cellAddress]) continue;
          
          // Если это колонка с датой, применяем специальный стиль
          if (dateColumnIndices.includes(C)) {
            // Устанавливаем тип ячейки как дата и применяем формат
            if (ws[cellAddress].v instanceof Date) {
              ws[cellAddress].t = 'd'; // тип дата
              // Применяем стиль с форматом даты
              ws[cellAddress].s = JSON.parse(JSON.stringify(dateStyle));
            } else if (ws[cellAddress].v && typeof ws[cellAddress].v === 'string' && ws[cellAddress].v.match(/^\d{2}\.\d{2}\.\d{4}/)) {
              // Если значение строка в формате даты, конвертируем в Date
              try {
                const dateStr = ws[cellAddress].v;
                const [datePart, timePart] = dateStr.split(' ');
                const [day, month, year] = datePart.split('.');
                const [hours, minutes] = timePart ? timePart.split(':') : ['00', '00'];
                const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
                ws[cellAddress].v = date;
                ws[cellAddress].t = 'd';
                ws[cellAddress].s = JSON.parse(JSON.stringify(dateStyle));
              } catch (e) {
                ws[cellAddress].s = JSON.parse(JSON.stringify(dataStyle));
              }
            } else {
              ws[cellAddress].s = JSON.parse(JSON.stringify(dataStyle));
            }
          } else {
            // Клонируем стиль, чтобы не перезаписывать ссылку
            ws[cellAddress].s = JSON.parse(JSON.stringify(dataStyle));
          }
        }
      }

      // Устанавливаем высоту строки для заголовков
      if (!ws['!rows']) ws['!rows'] = [];
      ws['!rows'][0] = { hpt: 25 }; // Высота заголовка

      // Генерируем имя файла
      const projectName = projectStore.selectedProject?.name || 'all_projects';
      const fileName = `documents_${projectName}_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Сохраняем файл с поддержкой стилей
      // Используем XLSX.write с типом 'array' и создаем Blob для скачивания в браузере
      const wopts: any = { 
        bookType: 'xlsx', 
        bookSST: false, 
        type: 'array', // Используем 'array' вместо 'binary' для браузера
        cellStyles: true 
      };
      
      // Генерируем массив байтов
      const wbout = XLSX.write(wb, wopts);
      
      // Создаем Blob и скачиваем файл
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

