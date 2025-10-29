import { useState, useEffect, useCallback } from 'react';
import { documentsApi, type Document } from '../../../api/client';

export interface UseServerDocumentPaginationProps {
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
  pageSize?: number;
}

export interface UseServerDocumentPaginationReturn {
  // Состояние пагинации
  page: number;
  size: number;
  total: number;
  pages: number;
  
  // Сеттеры
  setPage: (page: number) => void;
  setSize: (size: number) => void;
  
  // Обработчики
  handleChangePage: (_event: unknown, newPage: number) => void;
  handleChangeSize: (event: React.ChangeEvent<HTMLInputElement>) => void;
  
  // Данные
  documents: Document[];
  isLoading: boolean;
  error: string | null;
  
  // Методы
  refresh: () => Promise<void>;
}

export const useServerDocumentPagination = ({ 
  projectId,
  status,
  search,
  disciplineId,
  documentTypeId,
  revisionDescriptionId,
  dateFrom,
  dateTo,
  sortBy = 'updated_at',
  sortDir = 'desc',
  pageSize = 13
}: UseServerDocumentPaginationProps): UseServerDocumentPaginationReturn => {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(pageSize);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Сброс страницы при изменении фильтров
  useEffect(() => {
    setPage(1);
  }, [projectId, status, search, disciplineId, documentTypeId, revisionDescriptionId, dateFrom, dateTo, sortBy, sortDir]);

  // Загрузка данных
  const loadDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await documentsApi.getPage({
        page,
        size,
        project_id: projectId,
        status,
        search,
        discipline_id: disciplineId,
        document_type_id: documentTypeId,
        revision_description_id: revisionDescriptionId,
        date_from: dateFrom,
        date_to: dateTo,
        sort_by: sortBy,
        sort_dir: sortDir,
      });

      setDocuments(response.items);
      setTotal(response.total);
      setPages(response.pages);
    } catch (err: any) {
      console.error('Error loading documents:', err);
      setError(err.message || 'Ошибка загрузки документов');
      setDocuments([]);
      setTotal(0);
      setPages(0);
    } finally {
      setIsLoading(false);
    }
  }, [
    page,
    size,
    projectId,
    status,
    search,
    disciplineId,
    documentTypeId,
    revisionDescriptionId,
    dateFrom,
    dateTo,
    sortBy,
    sortDir,
  ]);

  // Загружаем данные при изменении параметров
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Обработчики пагинации
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeSize = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSize = parseInt(event.target.value, 10);
    setSize(newSize);
    setPage(1); // Сбрасываем на первую страницу при изменении размера
  };

  return {
    page,
    size,
    total,
    pages,
    setPage,
    setSize,
    handleChangePage,
    handleChangeSize,
    documents,
    isLoading,
    error,
    refresh: loadDocuments,
  };
};
