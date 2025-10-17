import { useState, useMemo } from 'react';
import { documentStore } from '../../../stores/DocumentStore';
import { projectStore } from '../../../stores/ProjectStore';
import { type Document as ApiDocument } from '../../../api/client';

export interface DocumentFilters {
  filterStatus: string;
  searchTerm: string;
  selectedDisciplineId: number | null;
}

export interface UseDocumentFiltersReturn {
  // Состояние фильтров
  filterStatus: string;
  searchTerm: string;
  selectedDisciplineId: number | null;
  
  // Сеттеры
  setFilterStatus: (status: string) => void;
  setSearchTerm: (term: string) => void;
  setSelectedDisciplineId: (id: number | null) => void;
  
  // Отфильтрованные документы
  filteredDocuments: ApiDocument[];
  
  // Сброс фильтров
  resetFilters: () => void;
}

export const useDocumentFilters = (): UseDocumentFiltersReturn => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<number | null>(null);

  // Фильтрация документов
  const filteredDocuments = useMemo(() => {
    return documentStore.documents.filter(doc => {
      // TODO: Обновить фильтр по статусу после внедрения новой системы статусов
      const statusMatch = filterStatus === 'all'; // Временно отключаем фильтр по статусу
      const selectedProjectMatch = !projectStore.hasSelectedProject || doc.project_id === projectStore.selectedProject?.id;
      const disciplineMatch = selectedDisciplineId ? doc.discipline_id === selectedDisciplineId : true;
      const searchMatch = searchTerm === '' || 
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return statusMatch && selectedProjectMatch && disciplineMatch && searchMatch;
    });
  }, [documentStore.documents, filterStatus, searchTerm, selectedDisciplineId, projectStore.selectedProject]);

  const resetFilters = () => {
    setFilterStatus('all');
    setSearchTerm('');
    setSelectedDisciplineId(null);
  };

  return {
    filterStatus,
    searchTerm,
    selectedDisciplineId,
    setFilterStatus,
    setSearchTerm,
    setSelectedDisciplineId,
    filteredDocuments,
    resetFilters,
  };
};
