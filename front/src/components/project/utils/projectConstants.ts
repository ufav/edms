export const PROJECT_STATUSES = {
  ACTIVE: 'active',
  PLANNING: 'planning',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const PROJECT_STATUS_LABELS = {
  [PROJECT_STATUSES.ACTIVE]: 'Активный',
  [PROJECT_STATUSES.PLANNING]: 'Планирование',
  [PROJECT_STATUSES.COMPLETED]: 'Завершен',
  [PROJECT_STATUSES.CANCELLED]: 'Отменен',
} as const;

export const PROJECT_TABS = {
  MAIN: 0,
  DISCIPLINES_TYPES: 1,
  REVISIONS: 2,
  WORKFLOW: 3,
  PARTICIPANTS: 4,
  USERS: 5,
  SUMMARY: 6,
} as const;

export const PROJECT_TAB_LABELS = {
  [PROJECT_TABS.MAIN]: 'Основная информация',
  [PROJECT_TABS.DISCIPLINES_TYPES]: 'Дисциплины и типы',
  [PROJECT_TABS.REVISIONS]: 'Ревизии',
  [PROJECT_TABS.WORKFLOW]: 'Workflow',
  [PROJECT_TABS.PARTICIPANTS]: 'Участники',
  [PROJECT_TABS.USERS]: 'Пользователи',
  [PROJECT_TABS.SUMMARY]: 'Сводка',
} as const;

export const PROJECT_DEFAULT_VALUES = {
  name: '',
  project_code: '',
  description: '',
  start_date: null,
  end_date: null,
  status: PROJECT_STATUSES.PLANNING,
} as const;

export const PROJECT_VALIDATION_MESSAGES = {
  REQUIRED_FIELD: 'Поле обязательно для заполнения',
  MIN_LENGTH: 'Минимальная длина: {min} символов',
  MAX_LENGTH: 'Максимальная длина: {max} символов',
  INVALID_PATTERN: 'Недопустимый формат',
  DATE_RANGE_ERROR: 'Дата окончания должна быть позже даты начала',
  CODE_EXISTS: 'Код проекта уже существует',
} as const;

export const PROJECT_FILE_TYPES = {
  EXCEL: '.xlsx',
  CSV: '.csv',
} as const;

export const PROJECT_IMPORT_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_ROWS: 1000,
} as const;
