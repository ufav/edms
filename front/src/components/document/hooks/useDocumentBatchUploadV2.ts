import { useState } from 'react';
import * as XLSX from 'xlsx';
import { documentsApi, projectsApi } from '../../../api/client';
import { documentStore } from '../../../stores/DocumentStore';
import { projectStore } from '../../../stores/ProjectStore';
import { disciplineStore } from '../../../stores/DisciplineStore';
import { languageStore } from '../../../stores/LanguageStore';
import { projectDialogStore } from '../../../stores/ProjectDialogStore';

export interface UseDocumentBatchUploadV2Props {
  t: (key: string) => string;
  onClose: () => void;
  onDocumentsUpdated?: () => Promise<void>; // Функция для обновления списка документов
}

export interface DocumentRow {
  document_id: string;
  title: string;
  secondary_title?: string; // Необязательное поле
  discipline_code: string;
  document_type_code: string;
  file_path: string;
  language_code: string;
  description?: string;
  remarks?: string;
  drs?: string;
  author?: string;
  creation_date?: string;
  revision?: string;
  sheet_number?: string;
  total_sheets?: string;
  scale?: string;
  format?: string;
  confidentiality?: string;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface UseDocumentBatchUploadV2Return {
  // Состояния
  metadataFile: File | null;
  uploading: boolean;
  validating: boolean;
  validationErrors: ValidationError[];
  documents: DocumentRow[];
  selectedDirectoryName?: string;
  
  // Уведомления
  notification: {
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  };
  
  // Сеттеры
  setMetadataFile: (file: File | null) => void;
  setUploading: (uploading: boolean) => void;
  
  // Обработчики
  handleMetadataFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleSelectDirectory: () => Promise<void>;
  handleValidateAndUpload: () => Promise<void>;
  handleClose: () => void;
  handleCloseBatchNotification: () => void;
  
  // Валидация
  canUpload: boolean;
}

export const useDocumentBatchUploadV2 = ({ 
  t, 
  onClose,
  onDocumentsUpdated
}: UseDocumentBatchUploadV2Props): UseDocumentBatchUploadV2Return => {
  const [metadataFile, setMetadataFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [directoryHandle, setDirectoryHandle] = useState<any | null>(null);
  const [selectedDirectoryName, setSelectedDirectoryName] = useState<string | undefined>(undefined);

  // Состояние уведомлений
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info' as 'success' | 'error' | 'warning' | 'info'
  });

  // Функция для показа уведомлений
  const showNotification = (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };

  // Обработчик закрытия уведомления
  const handleCloseBatchNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  // Маппинг возможных названий колонок
  const columnMappings = {
    document_id: ['id', 'number', 'document number', 'Document Number', 'Document ID*', 'Document ID'],
    title: ['title', 'Title*'],
    secondary_title: ['secondary title', 'Secondary Title', 'Secondary_Title', 'secondary_title'],
    discipline_code: ['discipline', 'Discipline*', 'discipline_code'],
    document_type_code: ['document_type', 'type', 'Document_Type', 'Document Type*', 'document_type_code'],
    file_path: ['file_path', 'path', 'File Path*', 'file_path'],
    language_code: ['language', 'Content Language', 'Content Language*']
  };

  // Функция для поиска колонки по возможным названиям
  const findColumn = (headers: string[], possibleNames: string[]): string | null => {
    for (const header of headers) {
      const trimmedHeader = header.trim();
      if (possibleNames.some(name => 
        trimmedHeader.toLowerCase() === name.toLowerCase() ||
        trimmedHeader.toLowerCase().replace(/\s+/g, '') === name.toLowerCase().replace(/\s+/g, '')
      )) {
        return header;
      }
    }
    return null;
  };

    // Функция для поиска строки заголовков
    const findTableStart = (rows: any[]): { headerRowIndex: number; headers: string[] } | null => {
      const requiredFields = ['document_id', 'title', 'discipline_code', 'document_type_code', 'file_path', 'language_code'];
      
      for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
        const row = rows[rowIdx];
        const rowCells = Object.values(row).map(cell => String(cell || '').trim());
        
        let foundHeaders = 0;
        const foundFieldNames: string[] = [];
        
        // Проверяем каждую ячейку в строке на точное совпадение
        for (const cellValue of rowCells) {
          if (!cellValue) continue;
          
          const cellLower = cellValue.toLowerCase();
          
          // Проверяем точное совпадение с каждым полем
          for (const field of requiredFields) {
            const possibleNames = columnMappings[field as keyof typeof columnMappings];
            const found = possibleNames.some(name => {
              const nameLower = name.toLowerCase();
              return cellLower === nameLower || 
                     cellLower.includes(nameLower) || 
                     nameLower.includes(cellLower);
            });
            
            if (found) {
              foundHeaders++;
              foundFieldNames.push(`${field} (${cellValue})`);
              break;
            }
          }
        }
        
        // Если найдены ВСЕ заголовки - это начало таблицы
        if (foundHeaders >= requiredFields.length) {
          // Возвращаем реальные значения ячеек как заголовки
          return { headerRowIndex: rowIdx, headers: rowCells };
        }
      }
      
      return null;
    };

  // Функция для парсинга Excel файла
  const parseExcelFile = async (file: File): Promise<DocumentRow[]> => {
    try {
      let fileData: ArrayBuffer;
      
      try {
        // Пробуем прочитать файл как ArrayBuffer
        fileData = await file.arrayBuffer();
      } catch (arrayBufferError) {
        // Пробуем альтернативный способ через FileReader
        try {
          fileData = await new Promise<ArrayBuffer>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              if (reader.result instanceof ArrayBuffer) {
                resolve(reader.result);
              } else {
                reject(new Error('FileReader вернул не ArrayBuffer'));
              }
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(file);
          });
        } catch (fileReaderError) {
          throw new Error(`Не удалось прочитать файл. Возможные причины: файл заблокирован другим процессом, нет прав доступа, или файл поврежден. Ошибка: ${fileReaderError instanceof Error ? fileReaderError.message : 'Неизвестная ошибка'}`);
        }
      }
      
      // Проверяем, что файл не пустой
      if (fileData.byteLength === 0) {
        throw new Error('Файл пустой или не содержит данных');
      }
      
      // Пробуем прочитать Excel файл
      let workbook: XLSX.WorkBook;
      try {
        workbook = XLSX.read(fileData, { type: 'array' });
      } catch (xlsxError) {
        throw new Error(`Ошибка парсинга Excel файла. Убедитесь, что файл является корректным Excel файлом (.xlsx, .xls). Ошибка: ${xlsxError instanceof Error ? xlsxError.message : 'Неизвестная ошибка'}`);
      }
      
      // Получаем первый лист
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        throw new Error('Excel файл не содержит листов');
      }
      
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) {
        throw new Error(`Не удалось получить лист "${sheetName}"`);
      }
      
        // Конвертируем в JSON массив с правильными заголовками
        let rows: any[];
        let headers: string[] = []; // Объявляем headers здесь
        try {
          // Получаем данные как массив массивов
          const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
          const data: any[][] = [];
          
          // Читаем все данные как массив массивов
          for (let rowIdx = range.s.r; rowIdx <= range.e.r; rowIdx++) {
            const row: any[] = [];
            for (let colIdx = range.s.c; colIdx <= range.e.c; colIdx++) {
              const cellAddress = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
              const cell = sheet[cellAddress];
              row.push(cell ? cell.v : '');
            }
            data.push(row);
          }
          
          // Ищем строку заголовков
          const headerResult = findTableStart(data);
          if (!headerResult) {
            throw new Error('Не найдена строка с заголовками. Проверьте, что файл содержит все обязательные колонки.');
          }

          const { headerRowIndex, headers: foundHeaders } = headerResult;
          headers = foundHeaders; // Присваиваем найденные заголовки
          
          // Преобразуем в объекты с правильными заголовками
          rows = [];
          
          for (let i = headerRowIndex + 1; i < data.length; i++) {
            const row: any = {};
            for (let j = 0; j < headers.length; j++) {
              row[headers[j]] = data[i][j];
            }
            rows.push(row);
          }
          
        } catch (jsonError) {
          throw new Error(`Ошибка конвертации данных Excel файла. Ошибка: ${jsonError instanceof Error ? jsonError.message : 'Неизвестная ошибка'}`);
        }
        
        if (rows.length === 0) {
          throw new Error('Excel файл не содержит данных');
        }

        // Используем заголовки из найденной строки
      
      // Находим индексы нужных колонок
      const documentIdCol = findColumn(headers, columnMappings.document_id);
      const titleCol = findColumn(headers, columnMappings.title);
      const secondaryTitleCol = findColumn(headers, columnMappings.secondary_title); // Необязательное поле
      const disciplineCol = findColumn(headers, columnMappings.discipline_code);
      const documentTypeCol = findColumn(headers, columnMappings.document_type_code);
      const filePathCol = findColumn(headers, columnMappings.file_path);
      const languageCol = findColumn(headers, columnMappings.language_code);


      if (!documentIdCol || !titleCol || !disciplineCol || !documentTypeCol || !filePathCol || !languageCol) {
        const missingCols = [];
        if (!documentIdCol) missingCols.push('Document ID');
        if (!titleCol) missingCols.push('Title');
        if (!disciplineCol) missingCols.push('Discipline');
        if (!documentTypeCol) missingCols.push('Document Type');
        if (!filePathCol) missingCols.push('File Path');
        if (!languageCol) missingCols.push('Language');
        
        throw new Error(`Не найдены обязательные колонки: ${missingCols.join(', ')}. Доступные колонки: ${headers.join(', ')}`);
      }

        // Парсим данные (теперь rows уже содержат только данные, без заголовков)
        const documents: DocumentRow[] = [];
        
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          documents.push({
            document_id: String(row[documentIdCol] || '').trim(),
            title: String(row[titleCol] || '').trim(),
            secondary_title: secondaryTitleCol ? String(row[secondaryTitleCol] || '').trim() : undefined,
            discipline_code: String(row[disciplineCol] || '').trim(),
            document_type_code: String(row[documentTypeCol] || '').trim(),
            file_path: String(row[filePathCol] || '').trim(),
            language_code: String(row[languageCol] || '').trim(),
            description: String(row['Secondary Title'] || '').trim(),
            remarks: String(row['Comments'] || '').trim(),
            drs: String(row['DRS Code'] || '').trim(),
            author: String(row['Supplier Package Number'] || '').trim(),
            creation_date: String(row['Revision Date'] || '').trim(),
            revision: String(row['Revision'] || '').trim(),
            sheet_number: String(row['PO Number'] || '').trim(),
            total_sheets: String(row['Superseded By'] || '').trim(),
            scale: String(row['Step'] || '').trim(),
            format: String(row['Alternate Document ID'] || '').trim(),
            confidentiality: String(row['Contractor Document ID'] || '').trim(),
          });
        }

      return documents;
      
    } catch (error) {
      
      // Более детальная обработка ошибок
      if (error instanceof Error) {
        if (error.name === 'NotReadableError') {
          throw new Error('Файл заблокирован другим процессом или нет прав доступа. Закройте файл в Excel и попробуйте снова.');
        } else if (error.message.includes('permission')) {
          throw new Error('Нет прав доступа к файлу. Проверьте права доступа к файлу.');
        } else if (error.message.includes('locked')) {
          throw new Error('Файл заблокирован. Закройте файл в Excel и попробуйте снова.');
        } else {
          throw new Error(`Ошибка парсинга файла: ${error.message}`);
        }
      } else {
        throw new Error('Неизвестная ошибка при парсинге файла');
      }
    }
  };

  // Функция валидации данных
  const validateDocuments = async (docs: DocumentRow[]): Promise<ValidationError[]> => {
    const errors: ValidationError[] = [];
    
    if (!projectStore.selectedProject) {
      errors.push({
        row: 0,
        field: 'project',
        message: 'Проект не выбран'
      });
      return errors;
    }

    // Загружаем справочные данные
    await disciplineStore.loadDisciplines(projectStore.selectedProject.id);
    await languageStore.loadLanguages();
    
    // Получаем дисциплины и языки из store
    const disciplines = disciplineStore.disciplines || [];
    const allLanguages = languageStore.languages || [];
    
    // Проверяем кэш типов документов проекта в ProjectDialogStore
    let projectData = projectDialogStore.projectDataCache[projectStore.selectedProject.id];
    
    // Если данных нет в кэше, загружаем их
    if (!projectData) {
      projectData = await projectDialogStore.loadProjectData(projectStore.selectedProject.id);
    }
    
    // Используем закэшированные типы документов
    const disciplineDocumentTypes = new Map<number, any[]>();
    for (const [disciplineId, types] of Object.entries(projectData.documentTypes)) {
      disciplineDocumentTypes.set(parseInt(disciplineId), types);
    }

    docs.forEach((doc, index) => {
      const row = index + 2; // Excel строки начинаются с 2

      // Валидация document_id
      if (!doc.document_id || doc.document_id.trim().length === 0) {
        errors.push({
          row,
          field: 'document_id',
          message: 'Document ID обязателен'
        });
      } else if (doc.document_id.trim().length > 255) {
        errors.push({
          row,
          field: 'document_id',
          message: 'Document ID слишком длинный (максимум 255 символов)'
        });
      }

      // Валидация title
      if (!doc.title || doc.title.trim().length === 0) {
        errors.push({
          row,
          field: 'title',
          message: 'Title обязателен'
        });
      } else if (doc.title.trim().length > 255) {
        errors.push({
          row,
          field: 'title',
          message: 'Title слишком длинный (максимум 255 символов)'
        });
      }

      // Валидация discipline_code
      if (!doc.discipline_code || doc.discipline_code.trim().length === 0) {
        errors.push({
          row,
          field: 'discipline_code',
          message: 'Discipline обязателен'
        });
      } else {
        const discipline = disciplines.find(d => d.code === doc.discipline_code.trim());
        if (!discipline) {
          errors.push({
            row,
            field: 'discipline_code',
            message: t('documents.validation_discipline_not_found')
              .replace('{code}', doc.discipline_code)
          });
        }
      }

      // Валидация document_type_code
      if (!doc.document_type_code || doc.document_type_code.trim().length === 0) {
        errors.push({
          row,
          field: 'document_type_code',
          message: 'Document Type обязателен'
        });
      } else {
        const discipline = disciplines.find(d => d.code === doc.discipline_code?.trim());
        if (discipline) {
          const types = disciplineDocumentTypes.get(discipline.id) || [];
          const docType = types.find(t => t.code === doc.document_type_code.trim());
          if (!docType) {
            errors.push({
              row,
              field: 'document_type_code',
              message: t('documents.validation_document_type_not_found')
              .replace('{code}', doc.document_type_code)
              .replace('{discipline}', doc.discipline_code)
            });
          }
        }
      }

      // Валидация file_path
      if (!doc.file_path || doc.file_path.trim().length === 0) {
        errors.push({
          row,
          field: 'file_path',
          message: 'File Path обязателен'
        });
      }

      // Валидация language_code
      if (!doc.language_code || doc.language_code.trim().length === 0) {
        errors.push({
          row,
          field: 'language_code',
          message: 'Language обязателен'
        });
      } else {
        const language = allLanguages.find(l => l.code === doc.language_code.trim());
        if (!language) {
          errors.push({
            row,
            field: 'language_code',
            message: t('documents.validation_language_not_found')
              .replace('{code}', doc.language_code)
          });
        }
      }
    });

    return errors;
  };

  // Обработчик выбора файла метаданных
  const handleMetadataFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setMetadataFile(file);
    setValidationErrors([]);
    setDocuments([]);
  };

  // Выбор директории (File System Access API)
  const handleSelectDirectory = async () => {
    try {
      // @ts-ignore
      const dir = await (window as any).showDirectoryPicker?.();
      if (!dir) return;
      setDirectoryHandle(dir);
      // Пытаемся получить человекочитаемое имя
      // @ts-ignore
      setSelectedDirectoryName(dir.name || 'selected-folder');
    } catch (e) {
      // Игнорируем отмену
    }
  };

  // Получить файл по относительному пути из выбранной директории
  const getFileFromDirectory = async (relPath: string): Promise<File | null> => {
    if (!directoryHandle) return null;
    const cleaned = relPath.replace(/^[\\/]+/, '');
    const parts = cleaned.split(/\\|\//).filter(Boolean);
    if (parts.length === 0) return null;
    try {
      let current: any = directoryHandle;
      for (let i = 0; i < parts.length - 1; i++) {
        const segment = parts[i];
        // @ts-ignore
        current = await current.getDirectoryHandle(segment, { create: false });
      }
      const fileName = parts[parts.length - 1];
      // @ts-ignore
      const fileHandle = await current.getFileHandle(fileName, { create: false });
      // @ts-ignore
      const file = await fileHandle.getFile();
      return file as File;
    } catch (e) {
      return null;
    }
  };

  // Рекурсивно прочитать все файлы из директории
  const getAllFilesFromDirectory = async (dirHandle: any, files: File[] = []): Promise<File[]> => {
    try {
      // @ts-ignore
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
          try {
            // @ts-ignore
            const file = await entry.getFile();
            files.push(file);
          } catch (e) {
            console.warn('Не удалось прочитать файл:', entry.name, e);
          }
        } else if (entry.kind === 'directory') {
          // Рекурсивно читаем подпапки
          await getAllFilesFromDirectory(entry, files);
        }
      }
    } catch (e) {
      console.error('Ошибка при чтении директории:', e);
    }
    return files;
  };

  // Обработчик валидации и загрузки
  const handleValidateAndUpload = async () => {
    if (!metadataFile || !projectStore.selectedProject) {
      return;
    }

    setValidating(true);
    setValidationErrors([]);

    try {
      // Проверяем тип файла
      const fileExtension = metadataFile.name.toLowerCase().split('.').pop();
      if (!['csv', 'tsv', 'txt', 'xlsx', 'xls'].includes(fileExtension || '')) {
        throw new Error('Неподдерживаемый тип файла. Поддерживаются: CSV, TSV, TXT, XLSX, XLS');
      }


      // Парсим Excel файл
      const parsedDocs = await parseExcelFile(metadataFile);
      setDocuments(parsedDocs);


      // Валидируем данные
      const errors = await validateDocuments(parsedDocs);
      setValidationErrors(errors);

      if (errors.length > 0) {
        // Показываем ошибки валидации
        showNotification(t('documents.validation_errors_count').replace('{count}', errors.length.toString()), 'warning');
        return;
      }

      // Если валидация прошла успешно, используем API для импорта по путям
      setUploading(true);
      
      try {
        // Используем API import-by-paths для создания документов по путям файлов
        const formData = new FormData();
        formData.append('metadata_file', metadataFile);
        formData.append('project_id', projectStore.selectedProject.id.toString());
        
        // Если выбрана директория, читаем ВСЕ файлы из папки и отправляем их
        // Бэкенд сам сопоставит файлы по номеру документа (имя файла без расширения = Document ID)
        if (directoryHandle) {
          const allFiles = await getAllFilesFromDirectory(directoryHandle);
          
          // Отправляем все файлы из папки
          for (const file of allFiles) {
            formData.append('files', file, file.name);
          }
        }

        const response = await documentsApi.importByPaths(formData);
        
        
        // Показываем ошибки импорта если они есть
        if (response.errors && response.errors.length > 0) {
          showNotification(t('documents.import_completed_with_errors')
            .replace('{imported}', response.total_imported.toString())
            .replace('{errors}', response.errors.length.toString()), 'warning');
        } else {
          showNotification(t('documents.import_success')
            .replace('{count}', (response.total_imported || parsedDocs.length).toString()), 'success');
        }
        
        // Обновляем список документов
        if (onDocumentsUpdated) {
          await onDocumentsUpdated();
        } else {
          // Fallback на старый метод
          documentStore.loadDocuments(projectStore.selectedProject.id, true, 'all');
        }
        
        // Закрываем диалог и очищаем состояние
        handleClose();
        
      } catch (error: any) {
        
        // Детальная информация об ошибке
        if (error.response?.data) {
        }
        
        // Если API import-by-paths недоступен, показываем соответствующее сообщение
        if (error.response?.status === 501) {
          showNotification(t('documents.import_api_unavailable'), 'warning');
        } else if (error.response?.status === 400) {
          // Показываем детали ошибки 400
          const errorMessage = error.response?.data?.detail || 'Ошибка валидации данных';
          showNotification(t('documents.validation_error')
            .replace('{message}', errorMessage), 'error');
        } else {
          showNotification(t('documents.import_error'), 'error');
        }
      } finally {
        setUploading(false);
      }
      
    } catch (error) {
      showNotification(t('documents.import_error'), 'error');
    } finally {
      setValidating(false);
      setUploading(false);
    }
  };

  // Обработчик закрытия диалога
  const handleClose = () => {
    setMetadataFile(null);
    setUploading(false);
    setValidating(false);
    setValidationErrors([]);
    setDocuments([]);
    setNotification({
      open: false,
      message: '',
      severity: 'info'
    });
    onClose();
  };

  // Валидация возможности загрузки
  const canUpload = Boolean(metadataFile && projectStore.selectedProject && !uploading && !validating);

  return {
    // Состояния
    metadataFile,
    uploading,
    validating,
    validationErrors,
    documents,
    selectedDirectoryName,
    
    // Уведомления
    notification,
    
    // Сеттеры
    setMetadataFile,
    setUploading,
    
    // Обработчики
    handleMetadataFileSelect,
    handleSelectDirectory,
    handleValidateAndUpload,
    handleClose,
    handleCloseBatchNotification,
    
    // Валидация
    canUpload,
  };
};
