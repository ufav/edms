import { useState } from 'react';

export interface ValidationError {
  field: string;
  message: string;
}

export interface UseProjectValidationReturn {
  errors: ValidationError[];
  setErrors: (errors: ValidationError[]) => void;
  addError: (field: string, message: string) => void;
  removeError: (field: string) => void;
  clearErrors: () => void;
  hasErrors: boolean;
  getFieldError: (field: string) => string | null;
  validateField: (field: string, value: any) => boolean;
  validateForm: (formData: any) => boolean;
}

export const useProjectValidation = (): UseProjectValidationReturn => {
  const [errors, setErrors] = useState<ValidationError[]>([]);

  const addError = (field: string, message: string) => {
    setErrors(prev => {
      const existing = prev.find(error => error.field === field);
      if (existing) {
        return prev.map(error => 
          error.field === field ? { ...error, message } : error
        );
      }
      return [...prev, { field, message }];
    });
  };

  const removeError = (field: string) => {
    setErrors(prev => prev.filter(error => error.field !== field));
  };

  const clearErrors = () => {
    setErrors([]);
  };

  const hasErrors = errors.length > 0;

  const getFieldError = (field: string): string | null => {
    const error = errors.find(error => error.field === field);
    return error ? error.message : null;
  };

  const validateField = (field: string, value: any): boolean => {
    // Базовые правила валидации
    switch (field) {
      case 'name':
        if (!value || value.trim().length === 0) {
          addError(field, 'Название проекта обязательно');
          return false;
        }
        if (value.trim().length < 3) {
          addError(field, 'Название проекта должно содержать минимум 3 символа');
          return false;
        }
        removeError(field);
        return true;
      
      case 'project_code':
        if (!value || value.trim().length === 0) {
          addError(field, 'Код проекта обязателен');
          return false;
        }
        if (!/^[A-Z0-9_-]+$/.test(value.trim())) {
          addError(field, 'Код проекта может содержать только заглавные буквы, цифры, дефисы и подчеркивания');
          return false;
        }
        removeError(field);
        return true;
      
      case 'start_date':
        if (!value) {
          addError(field, 'Дата начала обязательна');
          return false;
        }
        removeError(field);
        return true;
      
      default:
        removeError(field);
        return true;
    }
  };

  const validateForm = (formData: any): boolean => {
    clearErrors();
    
    const requiredFields = ['name', 'project_code', 'start_date'];
    let isValid = true;
    
    for (const field of requiredFields) {
      if (!validateField(field, formData[field])) {
        isValid = false;
      }
    }
    
    return isValid;
  };

  return {
    errors,
    setErrors,
    addError,
    removeError,
    clearErrors,
    hasErrors,
    getFieldError,
    validateField,
    validateForm,
  };
};
