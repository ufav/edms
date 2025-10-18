import { useState, useMemo } from 'react';
import { projectStore } from '../../../stores/ProjectStore';

export interface UseProjectFiltersReturn {
  filterStatus: string;
  searchTerm: string;
  setFilterStatus: (status: string) => void;
  setSearchTerm: (term: string) => void;
  filteredProjects: any[];
}

export const useProjectFilters = (): UseProjectFiltersReturn => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredProjects = useMemo(() => {
    return projectStore.projects
      .filter(project => {
        const statusMatch = filterStatus === 'all' || project.status === filterStatus;
        const searchMatch = searchTerm === '' || 
          project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          project.description.toLowerCase().includes(searchTerm.toLowerCase());
        
        return statusMatch && searchMatch;
      })
      .sort((a, b) => {
        // Сортировка по дате обновления (новые сверху)
        const dateA = new Date(a.updated_at);
        const dateB = new Date(b.updated_at);
        return dateB.getTime() - dateA.getTime();
      });
  }, [projectStore.projects, filterStatus, searchTerm]);

  return {
    filterStatus,
    searchTerm,
    setFilterStatus,
    setSearchTerm,
    filteredProjects,
  };
};
