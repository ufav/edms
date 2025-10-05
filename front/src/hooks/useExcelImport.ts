import { useState } from 'react';
import * as XLSX from 'xlsx';

export const useExcelImport = () => {
  const [importWarnings, setImportWarnings] = useState<string[]>([]);

  const setWarnings = (warnings: string[]) => {
    setImportWarnings(warnings);
  };

  const processExcelFile = async (
    file: File,
    disciplines: any[],
    documentTypes: any[],
    onImportSuccess: (data: any) => void
  ) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      // Наборы для отслеживания
      const processedRows = new Set<string>();
      const missingDisciplines: string[] = [];
      const missingDocumentTypes: string[] = [];
      const mismatchedNames: string[] = [];
      let processedCount = 0;
      let matchedCount = 0;

      // Карта для быстрого поиска дисциплин по коду
      const codeToDiscipline: Record<string, any> = {};
      disciplines.forEach(d => { 
        codeToDiscipline[(d.code || '').trim().toUpperCase()] = d; 
      });

      // Карта для быстрого поиска типов документов по коду + название
      const codeNameToDocumentType: Record<string, any> = {};
      documentTypes.forEach(dt => {
        const cleanName = (dt.name_en || dt.name || '').trim().replace(/\s+/g, ' ').toLowerCase();
        const key = `${(dt.code || '').trim().toUpperCase()}__${cleanName}`;
        codeNameToDocumentType[key] = dt;
      });

      // Обработка строк Excel
      for (const row of rows) {
        const dCodeRaw = row['discipline_code'];
        const tCodeRaw = row['document_type_code'];
        const tNameRaw = row['document_type_name'];
        const drsRaw = row['drs'];
        
        if (dCodeRaw === undefined && tCodeRaw === undefined && tNameRaw === undefined && drsRaw === undefined) {
          continue;
        }
        
        const dCode = String(dCodeRaw || '').trim().toUpperCase();
        const tCode = String(tCodeRaw || '').trim().toUpperCase();
        const tName = String(tNameRaw || '').trim();
        const drs = String(drsRaw || '').trim();
        
        if (!dCode || !tCode || !tName) {
          continue;
        }

        const rowKey = `${dCode}__${tCode}__${tName.toLowerCase()}__${drs.toLowerCase()}`;
        if (processedRows.has(rowKey)) {
          continue;
        }
        processedRows.add(rowKey);
        processedCount++;

        const discipline = codeToDiscipline[dCode];
        if (!discipline) {
          if (!missingDisciplines.includes(dCode)) {
            missingDisciplines.push(dCode);
          }
          continue;
        }

        const cleanExcelName = tName.trim().replace(/\s+/g, ' ').toLowerCase();
        const searchKey = `${tCode}__${cleanExcelName}`;
        const documentType = codeNameToDocumentType[searchKey];
        
        if (!documentType) {
          const typesWithSameCode = documentTypes.filter(dt =>
            (dt.code || '').trim().toUpperCase() === tCode
          );
          
          if (typesWithSameCode.length === 0) {
            if (!missingDocumentTypes.includes(tCode)) {
              missingDocumentTypes.push(tCode);
            }
          } else {
            const mismatchInfo = `${tCode} (${tName}) - в БД: ${typesWithSameCode.map(dt => dt.name_en || dt.name).join(', ')}`;
            if (!mismatchedNames.includes(mismatchInfo)) {
              mismatchedNames.push(mismatchInfo);
            }
          }
          continue;
        }

        matchedCount++;
        onImportSuccess({
          discipline,
          documentType,
          drs: drs || undefined
        });
      }

      // Формирование предупреждений
      const warnings: string[] = [];
      
      if (missingDisciplines.length > 0) {
        warnings.push(`Не найдены дисциплины по кодам: ${missingDisciplines.join(', ')}`);
      }
      
      if (missingDocumentTypes.length > 0) {
        warnings.push(`Не найдены типы документов по кодам: ${missingDocumentTypes.join(', ')}`);
      }
      
      if (mismatchedNames.length > 0) {
        warnings.push(`Несовпадение названий: ${mismatchedNames.join('; ')}`);
      }

      setImportWarnings(warnings);

      console.log(`Обработано строк: ${processedCount}, найдено совпадений: ${matchedCount}`);
      
      return {
        processedCount,
        matchedCount,
        warnings
      };
    } catch (error) {
      console.error('Ошибка при обработке Excel файла:', error);
      setImportWarnings(['Ошибка при чтении Excel файла']);
      throw error;
    }
  };

  const clearWarnings = () => {
    setImportWarnings([]);
  };

  return {
    importWarnings,
    setWarnings,
    processExcelFile,
    clearWarnings
  };
};
