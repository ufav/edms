import { useState } from 'react';

export interface UseProjectTabsReturn {
  tabIndex: number;
  setTabIndex: (index: number) => void;
  handleTabChange: (event: React.SyntheticEvent, newValue: number) => void;
  resetTabs: () => void;
}

export const useProjectTabs = (): UseProjectTabsReturn => {
  const [tabIndex, setTabIndex] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  const resetTabs = () => {
    setTabIndex(0);
  };

  return {
    tabIndex,
    setTabIndex,
    handleTabChange,
    resetTabs,
  };
};
