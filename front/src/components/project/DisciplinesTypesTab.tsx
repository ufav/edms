import React from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  Alert,
  Card,
  CardContent,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { 
  Description as ExcelIcon
} from '@mui/icons-material';

interface DisciplinesTypesTabProps {
  disciplines: any[];
  documentTypes: any[];
  selectedDisciplines: number[];
  disciplineDocumentTypes: { [key: number]: { documentTypeId: number, drs?: string }[] };
  importWarnings: string[];
  onDisciplineToggle: (disciplineId: number) => void;
  onDocumentTypeToggle: (disciplineId: number, documentTypeId: number) => void;
  onImportExcel: (file: File) => void;
  onClearWarnings: () => void;
  getDisciplineDescription?: (d: any) => string;
}

const DisciplinesTypesTab: React.FC<DisciplinesTypesTabProps> = ({
  disciplines,
  documentTypes,
  selectedDisciplines,
  disciplineDocumentTypes,
  importWarnings,
  onDisciplineToggle,
  onDocumentTypeToggle,
  onImportExcel,
  onClearWarnings,
  getDisciplineDescription
}) => {
  const { t, i18n } = useTranslation();
  
  const getDisciplineName = (d: any) => (i18n.language === 'en' && d.name_en) ? d.name_en : d.name;
  const getDocTypeName = (dt: any) => (i18n.language === 'en' && dt.name_en) ? dt.name_en : dt.name;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Button
          variant="outlined"
          component="label"
          size="small"
          sx={{ minWidth: 200, height: 32, lineHeight: 1.5 }}
          startIcon={<ExcelIcon sx={{ color: 'green' }} />}
        >
          {t('createProject.buttons.import_excel')}
          <input
            id="disciplines-excel-import"
            name="disciplines-excel-import"
            hidden
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onImportExcel(file);
              }
            }}
          />
        </Button>
        {importWarnings.length > 0 && (
          <Button
            variant="outlined"
            size="small"
            onClick={onClearWarnings}
            sx={{ minWidth: 150, height: 32, lineHeight: 1.5 }}
          >
            {t('createProject.buttons.clear_warnings')}
          </Button>
        )}
      </Box>
      {importWarnings.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {importWarnings.map((w, i) => (
            <Box key={i}>{w}</Box>
          ))}
        </Alert>
      )}
      <Alert severity="info" sx={{ mb: 2 }}>
        {t('createProject.messages.excel_import_hint')}
      </Alert>
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          pr: 1,
          border: '2px dashed transparent',
          borderRadius: 1,
          p: 1,
        }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('createProject.messages.select_disciplines_instructions')}
        </Typography>

        {disciplines.length === 0 ? (
          <Typography>{t('createProject.messages.loading_disciplines')}</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {disciplines.map((discipline) => (
              <Card key={discipline.id} variant="outlined">
                <CardContent>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectedDisciplines.includes(discipline.id)}
                        onChange={() => onDisciplineToggle(discipline.id)}
                      />
                    }
                    label={
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1">
                          {discipline.code} - {getDisciplineName(discipline)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {getDisciplineDescription ? getDisciplineDescription(discipline) : discipline.description}
                        </Typography>
                      </Box>
                    }
                  />

                  {selectedDisciplines.includes(discipline.id) && (
                    <Box sx={{ mt: 2, ml: { xs: 0, sm: 4 } }}>
                      <Typography variant="subtitle2" gutterBottom>
                        {t('createProject.types_for_discipline', { name: getDisciplineName(discipline) })}
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {documentTypes.map((docType) => (
                          <Chip
                            key={docType.id}
                            label={`${docType.code} - ${getDocTypeName(docType)}`}
                            variant={
                              (disciplineDocumentTypes[discipline.id] || []).some(item => item.documentTypeId === docType.id)
                                ? 'filled'
                                : 'outlined'
                            }
                            color={
                              (disciplineDocumentTypes[discipline.id] || []).some(item => item.documentTypeId === docType.id)
                                ? 'primary'
                                : 'default'
                            }
                            onClick={() => onDocumentTypeToggle(discipline.id, docType.id)}
                            clickable
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

      </Box>
    </Box>
  );
};

export default DisciplinesTypesTab;