import { useState } from 'react';

export interface ProjectFormData {
  name: string;
  project_code: string;
  description: string;
  status: string;
  start_date: Date | null;
  end_date: Date | null;
  budget: number | null;
  client_name: string;
  client_contact: string;
  client_email: string;
  client_phone: string;
  location: string;
  notes: string;
}

const initialFormData: ProjectFormData = {
  name: '',
  project_code: '',
  description: '',
  status: 'PLANNING',
  start_date: null,
  end_date: null,
  budget: null,
  client_name: '',
  client_contact: '',
  client_email: '',
  client_phone: '',
  location: '',
  notes: '',
};

export const useProjectForm = () => {
  const [formData, setFormData] = useState<ProjectFormData>(initialFormData);

  const resetForm = () => {
    setFormData(initialFormData);
  };

  const updateFormData = (updates: Partial<ProjectFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  return {
    formData,
    setFormData,
    resetForm,
    updateFormData,
  };
};
