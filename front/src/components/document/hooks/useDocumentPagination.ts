import { useState, useEffect, useMemo } from 'react';
import { type Document as ApiDocument } from '../../../api/client';

export interface UseDocumentPaginationProps {
  filteredDocuments: ApiDocument[];
  dependencies?: any[]; // Зависимости для сброса страницы при изменении фильтров
}

export interface UseDocumentPaginationReturn {
  // Состояние пагинации
  page: number;
  rowsPerPage: number;
  
  // Сеттеры
  setPage: (page: number) => void;
  setRowsPerPage: (rowsPerPage: number) => void;
  
  // Обработчики
  handleChangePage: (_event: unknown, newPage: number) => void;
  handleChangeRowsPerPage: (event: React.ChangeEvent<HTMLInputElement>) => void;
  
  // Пагинированные документы
  paginatedDocuments: ApiDocument[];
  
  // Общее количество документов
  totalCount: number;
  
  // Опции для строк на странице
  rowsPerPageOptions: number[];
}

export const useDocumentPagination = ({ 
  filteredDocuments, 
  dependencies = [] 
}: UseDocumentPaginationProps): UseDocumentPaginationReturn => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Сброс страницы при изменении фильтров
  useEffect(() => {
    setPage(0);
  }, dependencies);

  // Пагинация документов
  const paginatedDocuments = useMemo(() => {
    return filteredDocuments.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );
  }, [filteredDocuments, page, rowsPerPage]);

  // Обработчики пагинации
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return {
    page,
    rowsPerPage,
    setPage,
    setRowsPerPage,
    handleChangePage,
    handleChangeRowsPerPage,
    paginatedDocuments,
    totalCount: filteredDocuments.length,
    rowsPerPageOptions: [10, 25, 50, 100],
  };
};
