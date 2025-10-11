import { useState, useEffect } from 'react';

interface ValidationErrors {
  [key: string]: boolean;
}

interface DocumentData {
  title: string;
  title_native: string;
  description: string;
  remarks: string;
  number: string;
  drs: string;
  language_id: string;
  discipline_id: string;
  document_type_id: string;
}

interface UseDocumentValidationProps {
  documentData: DocumentData;
  fileMetadata: { name: string; size: number; type: string } | null;
  isCreating: boolean;
  isEditing: boolean;
}

export const useDocumentValidation = ({
  documentData,
  fileMetadata,
  isCreating,
  isEditing
}: UseDocumentValidationProps) => {
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  // Функция валидации обязательных полей для редактирования
  const validateDocumentData = () => {
    const errors: ValidationErrors = {};
    
    if (!documentData.title?.trim()) {
      errors.title = true;
    }
    if (!documentData.number?.trim()) {
      errors.number = true;
    }
    if (!documentData.discipline_id) {
      errors.discipline_id = true;
    }
    if (!documentData.document_type_id) {
      errors.document_type_id = true;
    }
    if (!documentData.language_id) {
      errors.language_id = true;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Функция валидации обязательных полей для создания документа
  const validateCreateDocumentData = () => {
    const errors: ValidationErrors = {};
    
    if (!documentData.title?.trim()) {
      errors.title = true;
    }
    if (!documentData.number?.trim()) {
      errors.number = true;
    }
    if (!documentData.discipline_id) {
      errors.discipline_id = true;
    }
    if (!documentData.document_type_id) {
      errors.document_type_id = true;
    }
    if (!documentData.language_id) {
      errors.language_id = true;
    }
    if (!fileMetadata) {
      errors.file = true;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Очищаем ошибки валидации при изменении полей
  useEffect(() => {
    if (Object.keys(validationErrors).length > 0) {
      setValidationErrors({});
    }
  }, [documentData.title, documentData.number, documentData.discipline_id, documentData.document_type_id, documentData.language_id, fileMetadata]);

  // Функция для проверки валидации в зависимости от режима
  const validate = () => {
    if (isCreating) {
      return validateCreateDocumentData();
    } else if (isEditing) {
      return validateDocumentData();
    }
    return true;
  };

  // Функция для очистки ошибок валидации
  const clearValidationErrors = () => {
    setValidationErrors({});
  };

  // Функция для установки ошибки валидации для конкретного поля
  const setFieldError = (field: string, hasError: boolean) => {
    setValidationErrors(prev => ({
      ...prev,
      [field]: hasError
    }));
  };

  return {
    // Состояние
    validationErrors,
    
    // Функции
    validate,
    validateDocumentData,
    validateCreateDocumentData,
    clearValidationErrors,
    setFieldError,
  };
};
