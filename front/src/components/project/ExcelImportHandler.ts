import * as XLSX from 'xlsx';
import type { Discipline, DocumentType } from '../../api/client';

export interface ExcelImportResult {
  success: boolean;
  warnings: string[];
  error?: string;
  disciplinesToAdd: number[];
  documentTypesToAdd: { disciplineId: number; documentTypeId: number; drs?: string }[];
}

export interface ExcelImportData {
  disciplines: Discipline[];
  documentTypes: DocumentType[];
}

export const handleExcelImport = async (
  file: File,
  data: ExcelImportData,
  t: (key: string, options?: any) => string
): Promise<ExcelImportResult> => {
  try {
    const fileData = await file.arrayBuffer();
    const workbook = XLSX.read(fileData, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    // Проверяем наличие обязательных колонок
    if (rows.length === 0) {
      return {
        success: false,
        warnings: [],
        error: t('createProject.messages.import_error')
      };
    }

    const firstRow = rows[0];
    const availableColumns = Object.keys(firstRow);
    
    // Более гибкая проверка колонок - ищем похожие названия
    const findColumn = (requiredName: string, availableCols: string[]) => {
      const exact = availableCols.find(col => col.toLowerCase() === requiredName.toLowerCase());
      if (exact) return exact;
      
      // Ищем с подчеркиваниями
      const withUnderscores = availableCols.find(col => 
        col.toLowerCase().replace(/[_\s-]/g, '') === requiredName.toLowerCase().replace(/[_\s-]/g, '')
      );
      if (withUnderscores) return withUnderscores;
      
      // Ищем частичные совпадения
      const partial = availableCols.find(col => 
        col.toLowerCase().includes(requiredName.toLowerCase()) || 
        requiredName.toLowerCase().includes(col.toLowerCase())
      );
      return partial;
    };

    const disciplineCodeCol = findColumn('discipline_code', availableColumns);
    const documentTypeCodeCol = findColumn('document_type_code', availableColumns);
    const documentTypeNameCol = findColumn('document_type_name', availableColumns);
    
    const missingColumns = [];
    if (!disciplineCodeCol) missingColumns.push('discipline_code');
    if (!documentTypeCodeCol) missingColumns.push('document_type_code');
    if (!documentTypeNameCol) missingColumns.push('document_type_name');
    
    if (missingColumns.length > 0) {
      return {
        success: false,
        warnings: [],
        error: t('createProject.messages.import_error_missing_columns', { columns: missingColumns.join(', ') })
      };
    }

    // Наборы для отслеживания
    const processedRows = new Set<string>();
    const missingDisciplines: string[] = [];
    const missingDocumentTypes: string[] = [];
    const mismatchedNames: string[] = [];
    const disciplinesToAdd: number[] = [];
    const documentTypesToAdd: { disciplineId: number; documentTypeId: number; drs?: string }[] = [];
    let processedCount = 0;
    let matchedCount = 0;

    // Карта для быстрого поиска дисциплин по коду
    const codeToDiscipline: Record<string, Discipline> = {};
    data.disciplines.forEach((d: Discipline) => { 
      codeToDiscipline[(d.code || '').trim().toUpperCase()] = d; 
    });

    // Карта для быстрого поиска типов документов по коду + название
    // Ключ: "code__name", Значение: DocumentType
    const codeNameToDocumentType: Record<string, DocumentType> = {};
    data.documentTypes.forEach((dt: DocumentType) => { 
      // Убираем переносы строк и лишние пробелы
      const cleanName = (dt.name_en || dt.name || '').trim().replace(/\s+/g, ' ').toLowerCase();
      const key = `${(dt.code || '').trim().toUpperCase()}__${cleanName}`;
      codeNameToDocumentType[key] = dt;
    });

    let processedRowsCount = 0;
    
    for (const row of rows) {
      const dCodeRaw = disciplineCodeCol ? row[disciplineCodeCol] : undefined;
      const tCodeRaw = documentTypeCodeCol ? row[documentTypeCodeCol] : undefined;
      const tNameRaw = documentTypeNameCol ? row[documentTypeNameCol] : undefined;
      const drsRaw = row['drs'];
      
      if (dCodeRaw === undefined && tCodeRaw === undefined && tNameRaw === undefined) {
        continue;
      }
      
      processedRowsCount++;
      
      const dCode = String(dCodeRaw || '').trim().toUpperCase();
      const tCode = String(tCodeRaw || '').trim().toUpperCase();
      const tName = String(tNameRaw || '').trim();
      const drs = String(drsRaw || '').trim();
      
      
      if (!dCode || !tCode || !tName) {
        continue;
      }

      // Проверяем, не обрабатывали ли мы уже эту комбинацию
      const rowKey = `${dCode}__${tCode}__${tName}__${drs}`;
      if (processedRows.has(rowKey)) {
        continue;
      }
      processedRows.add(rowKey);

      // Ищем дисциплину по коду
      const discipline = codeToDiscipline[dCode];
      if (!discipline) {
        if (!missingDisciplines.includes(dCode)) {
          missingDisciplines.push(dCode);
        }
        continue;
      }

      // Ищем тип документа по коду + название
      // Очищаем название от переносов строк и лишних пробелов
      const cleanExcelName = tName.trim().replace(/\s+/g, ' ').toLowerCase();
      const searchKey = `${tCode}__${cleanExcelName}`;
      const documentType = codeNameToDocumentType[searchKey];
      
      if (!documentType) {
        // Тип документа не найден по коду + название
        // Проверим, есть ли типы с таким кодом, но другими названиями
        const typesWithSameCode = data.documentTypes.filter((dt: DocumentType) => 
          (dt.code || '').trim().toUpperCase() === tCode
        );
        
        if (typesWithSameCode.length === 0) {
          // Тип документа с таким кодом вообще не найден
          if (!missingDocumentTypes.includes(tCode)) {
            missingDocumentTypes.push(tCode);
          }
        } else {
          // Есть типы с таким кодом, но названия не совпадают
          const mismatchInfo = `${tCode} (${tName}) - в БД: ${typesWithSameCode.map((dt: DocumentType) => dt.name_en || dt.name).join(', ')}`;
          if (!mismatchedNames.includes(mismatchInfo)) {
            mismatchedNames.push(mismatchInfo);
          }
        }
        continue;
      }

      // Все совпадает - добавляем в списки для добавления
      matchedCount++;
      
      // Добавляем дисциплину, если её еще нет
      if (!disciplinesToAdd.includes(discipline.id)) {
        disciplinesToAdd.push(discipline.id);
      }
      
      // Добавляем связь дисциплина-тип документа
      documentTypesToAdd.push({
        disciplineId: discipline.id,
        documentTypeId: documentType.id,
        drs: drs || undefined
      });
    }

    // Формируем предупреждения
    const warnings: string[] = [];
    if (missingDisciplines.length > 0) {
      warnings.push(`Не найдены дисциплины: ${missingDisciplines.join(', ')}`);
    }
    if (missingDocumentTypes.length > 0) {
      warnings.push(`Не найдены типы документов: ${missingDocumentTypes.join(', ')}`);
    }
    if (mismatchedNames.length > 0) {
      warnings.push(`Несовпадения названий: ${mismatchedNames.join(', ')}`);
    }

    return {
      success: true,
      warnings,
      error: undefined,
      disciplinesToAdd,
      documentTypesToAdd
    };

  } catch (e: any) {
    return {
      success: false,
      warnings: [],
      error: t('createProject.messages.import_error')
    };
  }
};
