import { useState } from 'react';

export interface ProjectFormData {
  name: string;
  project_code: string;
  description: string;
  status: string;
  start_date: Date | null;
  end_date: Date | null;
  budget: string;
}

export const useProjectForm = () => {
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    project_code: '',
    description: '',
    status: 'planning',
    start_date: null,
    end_date: null,
    budget: ''
  });

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      project_code: '',
      description: '',
      status: 'planning',
      start_date: null,
      end_date: null,
      budget: ''
    });
  };

  return {
    formData,
    setFormData,
    updateFormData,
    resetForm
  };
};
