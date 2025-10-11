import React from 'react';
import {
  Box,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { languageStore } from '../../../stores/LanguageStore';
import { disciplineStore } from '../../../stores/DisciplineStore';
import { referencesStore } from '../../../stores/ReferencesStore';
import { projectStore } from '../../../stores/ProjectStore';

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

interface DocumentFormProps {
  document: any;
  documentData: DocumentData;
  setDocumentData: (updates: Partial<DocumentData>) => void;
  validationErrors: {[key: string]: boolean};
  isCreating: boolean;
  isEditing: boolean;
  projectDocumentTypes: any[];
  loadingProjectData: boolean;
  loadDocumentTypes: (projectId: number, disciplineId: number) => void;
}

const DocumentForm: React.FC<DocumentFormProps> = ({
  document,
  documentData,
  setDocumentData,
  validationErrors,
  isCreating,
  isEditing,
  projectDocumentTypes,
  loadingProjectData,
  loadDocumentTypes,
}) => {
  const { t } = useTranslation();

  // Если документ не загружен и не создается, не рендерим форму
  if (!isCreating && !document) {
    return null;
  }

  return (
    <Box sx={{ flexShrink: 0, mb: 3, mt: 2 }}>
      <Grid container spacing={3}>
        {/* Первая колонка: номер с датой, титл, титл натив, язык */}
        <Grid item xs={6}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Номер документа */}
            {isCreating ? (
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  id="document-number"
                  label={t('document.number')}
                  value={documentData.number || ''}
                  onChange={(e) => setDocumentData({number: e.target.value})}
                  sx={{ flex: 0.5 }} // Половина ширины
                  size="small"
                  variant="standard"
                  error={validationErrors.number}
                  helperText={validationErrors.number ? t('document.number_required') : ''}
                />
                <Box sx={{ flex: 0.5 }} /> {/* Пустое место для выравнивания */}
              </Box>
            ) : (
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  id="document-number-readonly"
                  label={t('document.number')}
                  value={isEditing ? (documentData.number || '') : (document?.number || `DOC-${document?.id}`)}
                  onChange={isEditing ? (e) => setDocumentData({number: e.target.value}) : undefined}
                  sx={{ flex: 0.5 }} // Половина ширины
                  InputProps={{ readOnly: !isEditing }}
                  size="small"
                  variant="standard"
                  error={validationErrors.number}
                  helperText={validationErrors.number ? t('document.number_required') : ''}
                />
              </Box>
            )}
            <TextField
              id="document-title"
              label={t('document.title')}
              value={documentData.title || ''}
              onChange={(isCreating || isEditing) ? (e) => setDocumentData({title: e.target.value}) : undefined}
              fullWidth
              InputProps={{ readOnly: !isCreating && !isEditing }}
              size="small"
              variant="standard"
              error={validationErrors.title}
              helperText={validationErrors.title ? t('document.title_required') : ''}
            />
            <TextField
              id="document-title-native"
              label={t('document.title_native')}
              value={documentData.title_native || ''}
              onChange={(isCreating || isEditing) ? (e) => setDocumentData({title_native: e.target.value}) : undefined}
              fullWidth
              InputProps={{ readOnly: !isCreating && !isEditing }}
              size="small"
              variant="standard"
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              {(isCreating || isEditing) ? (
                <FormControl sx={{ flex: 0.25 }} size="small" variant="standard" error={validationErrors.language_id}> {/* 1/4 ширины */}
                  <InputLabel htmlFor="document-language-select">{t('document.language')}</InputLabel>
                  <Select
                    id="document-language-select"
                    value={isCreating ? documentData.language_id : (documentData.language_id || '')}
                        onChange={(e) => setDocumentData({language_id: e.target.value})}
                    label={t('document.language')}
                  >
                    {languageStore.languages.map((language) => (
                      <MenuItem key={language.id} value={language.id}>
                        {language.code} - {language.name}
                      </MenuItem>
                    ))}
                  </Select>
                  {validationErrors.language_id && (
                    <Typography variant="caption" color="error" sx={{ fontSize: '0.75rem', mt: 0.5 }}>
                      {t('document.language_required')}
                    </Typography>
                  )}
                </FormControl>
              ) : (
                <TextField
                  id="document-language"
                  label={t('document.language')}
                  value={(() => {
                    const language = languageStore.languages.find(l => l.id === document?.language_id);
                    return language ? language.code : 'ru';
                  })()}
                  sx={{ flex: 0.25 }} // 1/4 ширины
                  InputProps={{ readOnly: true }}
                  size="small"
                  variant="standard"
                  error={validationErrors.language_id}
                  helperText={validationErrors.language_id ? t('document.language_required') : ''}
                />
              )}
              <Box sx={{ flex: 0.75 }} /> {/* Пустое место для выравнивания */}
            </Box>
          </Box>
        </Grid>
        
        {/* Вторая колонка: дисциплина, тип документа, DRS, примечания */}
        <Grid item xs={6}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {(isCreating || isEditing) ? (
              <FormControl fullWidth size="small" variant="standard" error={validationErrors.discipline_id}>
                <InputLabel htmlFor="document-discipline-select">{t('document.discipline')}</InputLabel>
                <Select
                  id="document-discipline-select"
                  value={isCreating ? (documentData.discipline_id || '') : (documentData.discipline_id || '')}
                  onChange={(e) => {
                    const disciplineId = e.target.value;
                        setDocumentData({discipline_id: disciplineId, document_type_id: '', drs: ''});
                    
                    // Загружаем типы документов для выбранной дисциплины
                    const projectId = document?.project_id || projectStore.selectedProject?.id;
                    if (projectId && disciplineId) {
                      loadDocumentTypes(projectId, parseInt(disciplineId));
                    }
                  }}
                  label={t('document.discipline')}
                  disabled={loadingProjectData}
                >
                  {(() => {
                    return disciplineStore.disciplines.length === 0 ? (
                      <MenuItem disabled>
                        {loadingProjectData ? t('document.loading') : t('document.no_disciplines')}
                      </MenuItem>
                    ) : (
                      disciplineStore.disciplines.map((discipline) => (
                        <MenuItem key={discipline.id} value={discipline.id}>
                          {discipline.code} - {discipline.name}
                        </MenuItem>
                      ))
                    );
                  })()}
                </Select>
                {validationErrors.discipline_id && (
                  <Typography variant="caption" color="error" sx={{ fontSize: '0.75rem', mt: 0.5 }}>
                    {t('document.discipline_required')}
                  </Typography>
                )}
              </FormControl>
            ) : (
              <TextField
                id="document-discipline"
                label={t('document.discipline')}
                value={(() => {
                  if (isCreating) {
                    const discipline = disciplineStore.disciplines.find(d => d.id === document?.discipline_id);
                    return discipline ? `${discipline.code} - ${discipline.name}` : t('document.not_specified');
                  } else {
                    // В режиме просмотра используем данные из документа
                    return document?.discipline_name && document?.discipline_code 
                      ? `${document.discipline_code} - ${document.discipline_name}` 
                      : t('document.not_specified');
                  }
                })()}
                fullWidth
                InputProps={{ readOnly: true }}
                size="small"
                variant="standard"
                error={validationErrors.discipline_id}
                helperText={validationErrors.discipline_id ? t('document.discipline_required') : ''}
              />
            )}
            {(isCreating || isEditing) ? (
              <FormControl fullWidth size="small" variant="standard" error={validationErrors.document_type_id}>
                <InputLabel htmlFor="document-type-select">{t('document.document_type')}</InputLabel>
                <Select
                  id="document-type-select"
                  value={isCreating ? (documentData.document_type_id || '') : (documentData.document_type_id || '')}
                  onChange={(e) => {
                    const documentTypeId = e.target.value;
                        setDocumentData({document_type_id: documentTypeId});
                    // DRS автоматически подтянется через useEffect
                  }}
                  label={t('document.document_type')}
                  disabled={!documentData.discipline_id}
                >
                  {projectDocumentTypes.length === 0 ? (
                    <MenuItem disabled>
                      {documentData.discipline_id ? t('document.loading') : t('document.select_discipline_first')}
                    </MenuItem>
                  ) : (
                    projectDocumentTypes.map((docType) => (
                      <MenuItem key={docType.id} value={docType.id}>
                        {docType.code} - {docType.name}
                      </MenuItem>
                    ))
                  )}
                </Select>
                {validationErrors.document_type_id && (
                  <Typography variant="caption" color="error" sx={{ fontSize: '0.75rem', mt: 0.5 }}>
                    {t('document.document_type_required')}
                  </Typography>
                )}
              </FormControl>
            ) : (
              <TextField
                id="document-type"
                label={t('document.document_type')}
                value={(() => {
                  const documentType = referencesStore.getDocumentType(document?.document_type_id);
                  return documentType ? `${documentType.code} - ${documentType.name}` : t('document.not_specified_m');
                })()}
                fullWidth
                InputProps={{ readOnly: true }}
                size="small"
                variant="standard"
                error={validationErrors.document_type_id}
                helperText={validationErrors.document_type_id ? t('document.document_type_required') : ''}
              />
            )}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                id="document-drs"
                label="DRS"
                value={documentData.drs || ''}
                sx={{ flex: 0.5 }} // Половина ширины
                InputProps={{ readOnly: true }}
                size="small"
                variant="standard"
              />
              <Box sx={{ flex: 0.5 }} /> {/* Пустое место для выравнивания */}
            </Box>
            <TextField
              id="document-remarks"
              label={t('document.remarks')}
              value={documentData.remarks || ''}
              onChange={(isCreating || isEditing) ? (e) => setDocumentData({remarks: e.target.value}) : undefined}
              fullWidth
              multiline
              rows={3}
              InputProps={{ readOnly: !isCreating && !isEditing }}
              size="small"
              variant="standard"
            />
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DocumentForm;
