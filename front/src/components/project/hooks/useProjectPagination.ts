import { useState, useEffect, useMemo } from 'react';
import { type Project } from '../../../api/client';

export interface UseProjectPaginationProps {
  filteredProjects: Project[];
  dependencies?: any[]; // Зависимости для сброса страницы при изменении фильтров
}

export interface UseProjectPaginationReturn {
  // Состояние пагинации
  page: number;
  rowsPerPage: number;
  
  // Сеттеры
  setPage: (page: number) => void;
  setRowsPerPage: (rowsPerPage: number) => void;
  
  // Обработчики
  handleChangePage: (_event: unknown, newPage: number) => void;
  handleChangeRowsPerPage: (event: React.ChangeEvent<HTMLInputElement>) => void;
  
  // Пагинированные проекты
  paginatedProjects: Project[];
  
  // Общее количество проектов
  totalCount: number;
  
  // Опции для строк на странице
  rowsPerPageOptions: number[];
}

export const useProjectPagination = ({ 
  filteredProjects, 
  dependencies = [] 
}: UseProjectPaginationProps): UseProjectPaginationReturn => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(13);

  // Сброс страницы при изменении фильтров
  useEffect(() => {
    setPage(0);
  }, dependencies);

  // Пагинация проектов
  const paginatedProjects = useMemo(() => {
    return filteredProjects.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );
  }, [filteredProjects, page, rowsPerPage]);

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
    paginatedProjects,
    totalCount: filteredProjects.length,
    rowsPerPageOptions: [10, 13, 25, 50, 100],
  };
};
