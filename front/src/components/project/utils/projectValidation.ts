export interface ValidationRule {
  field: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

export const PROJECT_VALIDATION_RULES: ValidationRule[] = [
  {
    field: 'name',
    required: true,
    minLength: 3,
    maxLength: 255,
  },
  {
    field: 'project_code',
    required: true,
    pattern: /^[A-Z0-9_-]+$/,
    custom: (value: string) => {
      if (value && value.length > 20) {
        return 'Код проекта не должен превышать 20 символов';
      }
      return null;
    }
  },
  {
    field: 'start_date',
    required: true,
  },
  {
    field: 'end_date',
    custom: (value: string, formData: any) => {
      if (value && formData.start_date) {
        const startDate = new Date(formData.start_date);
        const endDate = new Date(value);
        if (endDate <= startDate) {
          return 'Дата окончания должна быть позже даты начала';
        }
      }
      return null;
    }
  },
  {
    field: 'description',
    maxLength: 1000,
  }
];

export const validateProjectField = (field: string, value: any, formData?: any): string | null => {
  const rule = PROJECT_VALIDATION_RULES.find(r => r.field === field);
  if (!rule) return null;

  // Проверка обязательности
  if (rule.required && (!value || (typeof value === 'string' && value.trim().length === 0))) {
    return `${getFieldDisplayName(field)} обязательно`;
  }

  // Проверка минимальной длины
  if (rule.minLength && value && value.length < rule.minLength) {
    return `${getFieldDisplayName(field)} должно содержать минимум ${rule.minLength} символов`;
  }

  // Проверка максимальной длины
  if (rule.maxLength && value && value.length > rule.maxLength) {
    return `${getFieldDisplayName(field)} не должно превышать ${rule.maxLength} символов`;
  }

  // Проверка паттерна
  if (rule.pattern && value && !rule.pattern.test(value)) {
    return `${getFieldDisplayName(field)} содержит недопустимые символы`;
  }

  // Кастомная валидация
  if (rule.custom) {
    return rule.custom(value, formData);
  }

  return null;
};

export const validateProjectForm = (formData: any): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  let isValid = true;

  for (const rule of PROJECT_VALIDATION_RULES) {
    const error = validateProjectField(rule.field, formData[rule.field], formData);
    if (error) {
      errors[rule.field] = error;
      isValid = false;
    }
  }

  return { isValid, errors };
};

const getFieldDisplayName = (field: string): string => {
  const names: Record<string, string> = {
    name: 'Название проекта',
    project_code: 'Код проекта',
    start_date: 'Дата начала',
    end_date: 'Дата окончания',
    description: 'Описание',
  };
  return names[field] || field;
};
