import { useState } from 'react';

export interface UseProjectDialogStateReturn {
  // Основные состояния диалога
  loading: boolean;
  saving: boolean;
  hasChanges: boolean;
  isInitialized: boolean;
  error: string | null;
  tabIndex: number;
  
  // Состояния для отслеживания изменений
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setHasChanges: (hasChanges: boolean) => void;
  setIsInitialized: (isInitialized: boolean) => void;
  setError: (error: string | null) => void;
  setTabIndex: (tabIndex: number) => void;
  
  // Утилиты
  resetState: () => void;
  markAsChanged: () => void;
}

export const useProjectDialogState = (): UseProjectDialogStateReturn => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabIndex, setTabIndex] = useState(0);

  const resetState = () => {
    setLoading(false);
    setSaving(false);
    setHasChanges(false);
    setIsInitialized(false);
    setError(null);
    setTabIndex(0);
  };

  const markAsChanged = () => {
    if (isInitialized) {
      setHasChanges(true);
    }
  };

  return {
    loading,
    saving,
    hasChanges,
    isInitialized,
    error,
    tabIndex,
    setLoading,
    setSaving,
    setHasChanges,
    setIsInitialized,
    setError,
    setTabIndex,
    resetState,
    markAsChanged,
  };
};
