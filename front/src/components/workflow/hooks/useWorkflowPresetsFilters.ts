import { useState, useMemo } from 'react';
import { workflowStore } from '../../../stores/WorkflowStore';

export interface UseWorkflowPresetsFiltersReturn {
  filterType: string;
  searchTerm: string;
  setFilterType: (type: string) => void;
  setSearchTerm: (term: string) => void;
  filteredPresets: any[];
}

export const useWorkflowPresetsFilters = (): UseWorkflowPresetsFiltersReturn => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredPresets = useMemo(() => {
    return workflowStore.presets
      .filter(preset => {
        const typeMatch = filterType === 'all' || 
          (filterType === 'global' && preset.is_global) ||
          (filterType === 'project' && !preset.is_global);
        
        const searchMatch = searchTerm === '' || 
          preset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (preset.description && preset.description.toLowerCase().includes(searchTerm.toLowerCase()));
        
        return typeMatch && searchMatch;
      })
      .sort((a, b) => {
        // Сортировка по дате создания (новые сверху)
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        return dateB.getTime() - dateA.getTime();
      });
  }, [workflowStore.presets, filterType, searchTerm]);

  return {
    filterType,
    searchTerm,
    setFilterType,
    setSearchTerm,
    filteredPresets,
  };
};
