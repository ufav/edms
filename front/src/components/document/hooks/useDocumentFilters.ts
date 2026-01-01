import { useState, useMemo, useEffect } from 'react';
import { documentStore } from '../../../stores/DocumentStore';
import { projectStore } from '../../../stores/ProjectStore';
import { type Document as ApiDocument } from '../../../api/client';

export interface DocumentFilters {
  filterStatus: string;
  searchTerm: string;
  selectedDisciplineId: number | null;
  selectedDocumentTypeId: number | null;
  selectedRevisionDescriptionId: number | null;
  selectedAreaId: number | null;
  dateRange: [Date | null, Date | null];
}

export interface UseDocumentFiltersReturn {
  // Состояние фильтров
  filterStatus: string;
  searchTerm: string;
  selectedDisciplineId: number | null;
  selectedDocumentTypeId: number | null;
  selectedRevisionDescriptionId: number | null;
  selectedAreaId: number | null;
  dateRange: [Date | null, Date | null];
  
  // Сеттеры
  setFilterStatus: (status: string) => void;
  setSearchTerm: (term: string) => void;
  setSelectedDisciplineId: (id: number | null) => void;
  setSelectedDocumentTypeId: (id: number | null) => void;
  setSelectedRevisionDescriptionId: (id: number | null) => void;
  setSelectedAreaId: (id: number | null) => void;
  setDateRange: (range: [Date | null, Date | null]) => void;
  
  // Отфильтрованные документы
  filteredDocuments: ApiDocument[];
  
  // Сброс фильтров
  resetFilters: () => void;
}

export const useDocumentFilters = (): UseDocumentFiltersReturn => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<number | null>(null);
  const [selectedDocumentTypeId, setSelectedDocumentTypeId] = useState<number | null>(null);
  const [selectedRevisionDescriptionId, setSelectedRevisionDescriptionId] = useState<number | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);

  // Фильтрация документов
  const filteredDocuments = useMemo(() => {
    return documentStore.documents.filter(doc => {
      // Фильтр по статусу - передается на backend, здесь не фильтруем
      const statusMatch = true; // Статус фильтруется на backend
      
      const selectedProjectMatch = !projectStore.hasSelectedProject || doc.project_id === projectStore.selectedProject?.id;
      const disciplineMatch = selectedDisciplineId ? doc.discipline_id === selectedDisciplineId : true;
      const documentTypeMatch = selectedDocumentTypeId ? doc.document_type_id === selectedDocumentTypeId : true;
      const revisionDescriptionMatch = selectedRevisionDescriptionId ? doc.revision_description_id === selectedRevisionDescriptionId : true;
      const areaMatch = selectedAreaId ? doc.area_id === selectedAreaId : true;
      
      // Фильтрация по датам
      const dateMatch = (() => {
        const [dateFrom, dateTo] = dateRange;
        if (!dateFrom && !dateTo) return true;
        
        const docDate = new Date(doc.created_at);
        const fromDate = dateFrom ? new Date(dateFrom.getFullYear(), dateFrom.getMonth(), dateFrom.getDate()) : null;
        const toDate = dateTo ? new Date(dateTo.getFullYear(), dateTo.getMonth(), dateTo.getDate(), 23, 59, 59) : null;
        
        if (fromDate && toDate) {
          return docDate >= fromDate && docDate <= toDate;
        } else if (fromDate) {
          return docDate >= fromDate;
        } else if (toDate) {
          return docDate <= toDate;
        }
        return true;
      })();
      
      const searchMatch = searchTerm === '' || 
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return statusMatch && selectedProjectMatch && disciplineMatch && documentTypeMatch && revisionDescriptionMatch && areaMatch && dateMatch && searchMatch;
    });
  }, [documentStore.documents, filterStatus, searchTerm, selectedDisciplineId, selectedDocumentTypeId, selectedRevisionDescriptionId, selectedAreaId, dateRange, projectStore.selectedProject]);

  // Загружаем документы с фильтром по статусу при изменении filterStatus
  useEffect(() => {
    if (projectStore.selectedProject?.id) {
      documentStore.loadDocuments(projectStore.selectedProject.id, false, filterStatus);
    }
  }, [filterStatus, projectStore.selectedProject?.id]);

  const resetFilters = () => {
    setFilterStatus('all');
    setSearchTerm('');
    setSelectedDisciplineId(null);
    setSelectedDocumentTypeId(null);
    setSelectedRevisionDescriptionId(null);
    setSelectedAreaId(null);
    setDateRange([null, null]);
  };

  return {
    filterStatus,
    searchTerm,
    selectedDisciplineId,
    selectedDocumentTypeId,
    selectedRevisionDescriptionId,
    selectedAreaId,
    dateRange,
    setFilterStatus,
    setSearchTerm,
    setSelectedDisciplineId,
    setSelectedDocumentTypeId,
    setSelectedRevisionDescriptionId,
    setSelectedAreaId,
    setDateRange,
    filteredDocuments,
    resetFilters,
  };
};
