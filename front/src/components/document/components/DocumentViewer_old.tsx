import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Grid,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { UploadFile as UploadFileIcon, Comment as CommentIcon, Download as DownloadIcon, Compare as CompareIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { documentRevisionStore } from '../../stores/DocumentRevisionStore';
import { languageStore } from '../../stores/LanguageStore';
import { referencesStore } from '../../stores/ReferencesStore';
import { projectStore } from '../../stores/ProjectStore';
import { userStore } from '../../stores/UserStore';
import { projectsApi, documentsApi } from '../../api/client';
import type { Document as ApiDocument } from '../../api/client';

interface DocumentViewerProps {
  open: boolean;
  document: ApiDocument | null;
  documentId?: number | null;
  isCreating?: boolean;
  onClose: () => void;
  onNewRevision: () => void;
  onCompareRevisions: (r1: string, r2: string) => void;
  onCreateDocument?: (documentData: any) => void;
  onOpenComments?: () => void;
}

const DocumentViewer: React.FC<DocumentViewerProps> = observer(({
  open,
  document,
  documentId,
  isCreating = false,
  onClose,
  onNewRevision,
  onCompareRevisions,
  onCreateDocument,
  onOpenComments,
}) => {
  const { i18n, t } = useTranslation();
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [projectDisciplines, setProjectDisciplines] = useState<any[]>([]);
  const [projectDocumentTypes, setProjectDocumentTypes] = useState<any[]>([]);
  const [loadingProjectData, setLoadingProjectData] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileMetadata, setFileMetadata] = useState<{name: string, size: number, type: string} | null>(null);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [workflowPresetSequence, setWorkflowPresetSequence] = useState<any[]>([]);
  const [documentCreator, setDocumentCreator] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documentData, setDocumentData] = useState({
    title: '',
    title_native: '',
    description: '',
    remarks: '',
    number: '',
    drs: '',
    language_id: '',
    discipline_id: '',
    document_type_id: '',
  });

  useEffect(() => {
    if (!isCreating && documentId && open) {
      setSelectedDocumentId(documentId);
      
      
      // Загружаем ревизии документа
      documentRevisionStore.loadRevisions(documentId).catch(error => {
        console.error('Ошибка загрузки ревизий:', error);
      });
      
      // Загружаем информацию о создателе документа
      if (document?.created_by) {
        loadDocumentCreator(document.created_by);
      }
    } else if (isCreating && open) {
      // Сбрасываем данные для создания нового документа
      setDocumentData({
        title: '',
        title_native: '',
        description: '',
        remarks: '',
        number: '',
        drs: '',
        language_id: '',
        discipline_id: '',
        document_type_id: '',
      });
      
      // Очищаем загруженный файл
      setUploadedFile(null);
      setFileMetadata(null);
      setIsUploadingDocument(false);
    setUploadProgress(0);
      
      // Очищаем последовательность workflow preset
      setWorkflowPresetSequence([]);
      
      // Очищаем информацию о создателе
      setDocumentCreator(null);
      
      // Очищаем ревизии из store (если есть)
      if (selectedDocumentId) {
        documentRevisionStore.clearRevisions(selectedDocumentId);
      }
      setSelectedDocumentId(null);
      
      // Загружаем дисциплины и типы документов проекта
      if (projectStore.selectedProject) {
        loadProjectData(projectStore.selectedProject.id);
      }
    }
  }, [documentId, open, isCreating]);

  // Обновляем ревизии при изменении в store (например, после добавления новой ревизии)
  useEffect(() => {
    if (!isCreating && selectedDocumentId && open) {
      // Перезагружаем ревизии, если они изменились в store
      const currentRevisions = documentRevisionStore.getRevisions(selectedDocumentId);
      if (currentRevisions && currentRevisions.length > 0) {
        // Ревизии уже загружены, компонент автоматически обновится благодаря MobX
      }
    }
  }, [documentRevisionStore.revisions, selectedDocumentId, open, isCreating]);

  // Автоматически подтягиваем DRS при выборе типа документа
  useEffect(() => {
    if (isCreating && documentData.document_type_id && projectDocumentTypes.length > 0) {
      const selectedDocType = projectDocumentTypes.find(dt => dt.id === parseInt(documentData.document_type_id));
      if (selectedDocType && selectedDocType.drs) {
        setDocumentData(prev => ({...prev, drs: selectedDocType.drs}));
      }
    }
  }, [documentData.document_type_id, projectDocumentTypes, isCreating]);

  // Загрузка дисциплин и типов документов проекта
  const loadProjectData = async (projectId: number) => {
    setLoadingProjectData(true);
    try {
      // Загружаем дисциплины проекта
      const disciplines = await projectsApi.getDisciplines(projectId);
      setProjectDisciplines(disciplines);
      
      // Загружаем sequence пресета workflow
      const sequence = await projectsApi.getWorkflowPresetSequence(projectId);
      setWorkflowPresetSequence(sequence);
      
      // Пока что оставляем типы документов пустыми, они загрузятся при выборе дисциплины
      setProjectDocumentTypes([]);
    } catch (error) {
      console.error('Ошибка загрузки данных проекта:', error);
    } finally {
      setLoadingProjectData(false);
    }
  };

  // Загрузка типов документов для выбранной дисциплины
  const loadDocumentTypes = async (projectId: number, disciplineId: number) => {
    try {
      const documentTypes = await projectsApi.getDocumentTypes(projectId, disciplineId);
      setProjectDocumentTypes(documentTypes);
    } catch (error) {
      console.error('Ошибка загрузки типов документов:', error);
    }
  };

  const loadDocumentCreator = async (userId: number) => {
    try {
      // Используем userStore для получения информации о пользователе
      const creator = userStore.users.find(user => user.id === userId);
      
      if (creator) {
        setDocumentCreator(creator);
      } else {
        // Если пользователь не найден в store, загружаем его
        await userStore.loadUsers();
        const loadedCreator = userStore.users.find(user => user.id === userId);
        setDocumentCreator(loadedCreator || null);
      }
    } catch (error) {
      console.error('Ошибка загрузки создателя документа:', error);
      setDocumentCreator(null);
    }
  };

  // Обработка загрузки файла - сохраняем только метаданные
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('handleFileUpload called', event.target.files);
    const file = event.target.files?.[0];
    if (file) {
      console.log('File selected:', file.name, file.size);
      // Сохраняем только метаданные, не загружаем файл в память
      setFileMetadata({
        name: file.name,
        size: file.size,
        type: file.type
      });
      // Сохраняем ссылку на файл для последующей отправки
      setUploadedFile(file);
    }
  };

  // Функция удаления загруженного файла
  const handleRemoveFile = () => {
    setUploadedFile(null);
    setFileMetadata(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };


  // Функция скачивания ревизии
  const handleDownloadRevision = async (revisionId: number, fileName: string) => {
    if (!documentId) return;
    
    try {
      console.log('Начинаем скачивание ревизии:', revisionId, 'для документа:', documentId);
      const blob = await documentsApi.downloadRevision(documentId, revisionId);
      console.log('Получен blob:', blob, 'тип:', typeof blob);
      
      // Создаем ссылку для скачивания (как в DocumentsPage)
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = fileName;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      
      // Очищаем URL
      URL.revokeObjectURL(url);
      console.log('Скачивание завершено');
    } catch (error) {
      console.error('Ошибка скачивания файла:', error);
      // Можно добавить уведомление об ошибке
    }
  };

  const handleClose = () => {
    // Очищаем кэш ревизий при закрытии
    if (selectedDocumentId) {
      documentRevisionStore.clearRevisions(selectedDocumentId);
    }
    // Очищаем загруженный файл
    setUploadedFile(null);
    setFileMetadata(null);
    setIsUploadingDocument(false);
    setUploadProgress(0);
    // Сбрасываем selectedDocumentId
    setSelectedDocumentId(null);
    // Очищаем последовательность workflow preset
    setWorkflowPresetSequence([]);
    // Очищаем информацию о создателе
    setDocumentCreator(null);
    // Сбрасываем данные документа
    setDocumentData({
      title: '',
      title_native: '',
      description: '',
      remarks: '',
      number: '',
      drs: '',
      language_id: '',
      discipline_id: '',
      document_type_id: '',
    });
    onClose();
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('ru-RU');
    } catch {
      return dateString;
    }
  };


  const getRevisionStatusColor = (statusId: number | null) => {
    if (!statusId) return 'default';
    
    // Определяем цвет в зависимости от статуса
    switch (statusId) {
      case 1: // Active
        return 'success'; // зеленый
      case 5: // Superseded
        return 'default'; // серый
      case 2: // Cancelled
        return 'error'; // красный
      case 4: // Rejected
        return 'error'; // красный
      case 3: // Hold
        return 'warning'; // оранжевый
      case 6: // Archieved
        return 'default'; // серый
      default:
        return 'default'; // серый по умолчанию
    }
  };

  if (!isCreating && !document) {
    return null;
  }
  
  if (isCreating && !document) {
    // В режиме создания показываем форму без таблицы ревизий
  }

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="xl" 
      fullWidth
      PaperProps={{
        sx: { height: '95vh', maxHeight: '95vh', width: '95vw', maxWidth: '95vw' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>
          {isCreating ? t('document.create_title') : `${t('document.details_title')}: ${document?.number}`}
        </span>
        {!isCreating && document?.created_at && (
          <span style={{ fontSize: '0.875rem', color: 'rgba(0, 0, 0, 0.6)' }}>
            {t('document.created')} {new Date(document.created_at).toLocaleDateString('ru-RU')}
            {documentCreator && ` ${t('document.created_by')} ${documentCreator.full_name}`}
          </span>
        )}
      </DialogTitle>
      
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Верхняя часть - информация о документе */}
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
                      onChange={(e) => setDocumentData({...documentData, number: e.target.value})}
                      sx={{ flex: 0.5 }} // Половина ширины
                      size="small"
                      variant="standard"
                    />
                    <Box sx={{ flex: 0.5 }} /> {/* Пустое место для выравнивания */}
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      id="document-number-readonly"
                      label={t('document.number')}
                      value={document?.number || `DOC-${document?.id}`}
                      sx={{ flex: 0.5 }} // Половина ширины
                      InputProps={{ readOnly: true }}
                      size="small"
                      variant="standard"
                    />
                  </Box>
                )}
                        <TextField
                          id="document-title"
                          label={t('document.title')}
                          value={isCreating ? (documentData.title || '') : (document?.title || '')}
                          onChange={isCreating ? (e) => setDocumentData({...documentData, title: e.target.value}) : undefined}
                          fullWidth
                          InputProps={{ readOnly: !isCreating }}
                          size="small"
                          variant="standard"
                        />
                        <TextField
                          id="document-title-native"
                          label={t('document.title_native')}
                          value={isCreating ? (documentData.title_native || '') : (document?.title_native || document?.description || '')}
                          onChange={isCreating ? (e) => setDocumentData({...documentData, title_native: e.target.value}) : undefined}
                          fullWidth
                          InputProps={{ readOnly: !isCreating }}
                          size="small"
                          variant="standard"
                        />
                <Box sx={{ display: 'flex', gap: 2 }}>
                  {isCreating ? (
                    <FormControl sx={{ flex: 0.25 }} size="small" variant="standard"> {/* 1/4 ширины */}
                      <InputLabel htmlFor="document-language-select">{t('document.language')}</InputLabel>
                      <Select
                        id="document-language-select"
                        value={documentData.language_id}
                        onChange={(e) => setDocumentData({...documentData, language_id: e.target.value})}
                        label={t('document.language')}
                      >
                        {languageStore.languages.map((language) => (
                          <MenuItem key={language.id} value={language.id}>
                            {language.code} - {language.name}
                          </MenuItem>
                        ))}
                      </Select>
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
                    />
                  )}
                  <Box sx={{ flex: 0.75 }} /> {/* Пустое место для выравнивания */}
                </Box>
              </Box>
            </Grid>
            
            {/* Вторая колонка: дисциплина, тип документа, DRS, примечания */}
            <Grid item xs={6}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {isCreating ? (
                  <FormControl fullWidth size="small" variant="standard">
                    <InputLabel htmlFor="document-discipline-select">{t('document.discipline')}</InputLabel>
                    <Select
                      id="document-discipline-select"
                      value={documentData.discipline_id || ''}
                      onChange={(e) => {
                        const disciplineId = e.target.value;
                        setDocumentData({...documentData, discipline_id: disciplineId, document_type_id: ''});
                        
                        // Загружаем типы документов для выбранной дисциплины
                        if (projectStore.selectedProject && disciplineId) {
                          loadDocumentTypes(projectStore.selectedProject.id, parseInt(disciplineId));
                        }
                      }}
                      label={t('document.discipline')}
                      disabled={loadingProjectData}
                    >
                      {projectDisciplines.length === 0 ? (
                        <MenuItem disabled>
                          {loadingProjectData ? t('document.loading') : t('document.no_disciplines')}
                        </MenuItem>
                      ) : (
                        projectDisciplines.map((discipline) => (
                          <MenuItem key={discipline.id} value={discipline.id}>
                            {discipline.code} - {discipline.name}
                          </MenuItem>
                        ))
                      )}
                    </Select>
                  </FormControl>
                ) : (
                  <TextField
                    id="document-discipline"
                    label={t('document.discipline')}
                    value={document?.discipline_name && document?.discipline_code 
                      ? `${document.discipline_code} - ${document.discipline_name}` 
                      : t('document.not_specified')}
                    fullWidth
                    InputProps={{ readOnly: true }}
                    size="small"
                    variant="standard"
                  />
                )}
                {isCreating ? (
                  <FormControl fullWidth size="small" variant="standard">
                    <InputLabel htmlFor="document-type-select">{t('document.document_type')}</InputLabel>
                    <Select
                      id="document-type-select"
                      value={documentData.document_type_id || ''}
                      onChange={(e) => {
                        const documentTypeId = e.target.value;
                        setDocumentData({...documentData, document_type_id: documentTypeId});
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
                  </FormControl>
                ) : (
                  <TextField
                    id="document-type"
                    label={t('document.document_type')}
                    value={document?.document_type_name && document?.document_type_code 
                      ? `${document.document_type_code} - ${document.document_type_name}` 
                      : t('document.not_specified_m')}
                    fullWidth
                    InputProps={{ readOnly: true }}
                    size="small"
                    variant="standard"
                  />
                )}
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    id="document-drs"
                    label="DRS"
                    value={isCreating ? (documentData.drs || '') : (document?.drs || t('document.not_specified_m'))}
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
                  value={isCreating ? (documentData.remarks || '') : (document?.remarks || '')}
                  onChange={isCreating ? (e) => setDocumentData({...documentData, remarks: e.target.value}) : undefined}
                  fullWidth
                  multiline
                  rows={3}
                  InputProps={{ readOnly: !isCreating }}
                  size="small"
                  variant="standard"
                />
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* Нижняя часть - таблица ревизий */}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">{t('document.revisions_history')}</Typography>
            {isCreating ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <input
                  id="document-file-upload"
                  name="document-file-upload"
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.dwg,.dxf"
                />
                <Button
                  variant="contained"
                  startIcon={<UploadFileIcon />}
                  onClick={() => {
                    fileInputRef.current?.click();
                  }}
                  disabled={!!fileMetadata}
                >
                  {t('document.upload_file')}
                </Button>
              </Box>
            ) : documentId ? (
              <Box sx={{ display: 'flex', gap: 1 }}>
                {userStore.currentUser?.role !== 'viewer' && (
                  <Button
                    variant="contained"
                    startIcon={<UploadFileIcon />}
                    onClick={onNewRevision}
                  >
                    {t('document.new_revision')}
                  </Button>
                )}
                <Button
                  variant="outlined"
                  startIcon={<CommentIcon />}
                  onClick={onOpenComments}
                >
                  {t('document.comments')}
                </Button>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {t('document.revisions_after_creation')}
              </Typography>
            )}
          </Box>
        
          {/* Таблица ревизий с прокруткой */}
          <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
            {(!isCreating && documentId && documentRevisionStore.getRevisions(documentId || 0).length > 0) || (isCreating && fileMetadata) ? (
              <TableContainer component={Paper} sx={{ maxHeight: '100%' }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('document.revision')}</TableCell>
                      <TableCell>{t('document.revision_description')}</TableCell>
                      <TableCell>{t('document.step')}</TableCell>
                      <TableCell>{t('document.status')}</TableCell>
                      <TableCell>{t('document.change_description')}</TableCell>
                      <TableCell>{t('document.date')}</TableCell>
                      <TableCell>{t('document.actions')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {isCreating && fileMetadata ? (
                      // Показываем загруженный файл в режиме создания
                      <TableRow>
                        <TableCell>
                          <Chip 
                            label={workflowPresetSequence.length > 0 && workflowPresetSequence[0].revision_description 
                              ? `${workflowPresetSequence[0].revision_description.code}01`
                              : '01'
                            } 
                            size="small" 
                          />
                        </TableCell>
                        <TableCell>
                          {workflowPresetSequence.length > 0 && workflowPresetSequence[0].revision_description 
                            ? `${workflowPresetSequence[0].revision_description.code} - ${workflowPresetSequence[0].revision_description.description}`
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {workflowPresetSequence.length > 0 && workflowPresetSequence[0].revision_step 
                            ? `${workflowPresetSequence[0].revision_step.code} - ${workflowPresetSequence[0].revision_step.description}`
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label="Active" 
                            size="small"
                            color="success"
                          />
                        </TableCell>
                        <TableCell>{t('document.first_revision')}</TableCell>
                        <TableCell>{new Date().toLocaleDateString()}</TableCell>
                        <TableCell>
                          {isUploadingDocument ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                                <CircularProgress 
                                  variant="determinate" 
                                  value={uploadProgress} 
                                  size={20}
                                />
                                <Box
                                  sx={{
                                    top: 0,
                                    left: 0,
                                    bottom: 0,
                                    right: 0,
                                    position: 'absolute',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    component="div"
                                    sx={{ fontSize: '8px', fontWeight: 'bold' }}
                                  >
                                    {`${Math.round(uploadProgress)}%`}
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>
                          ) : (
                            <IconButton 
                              size="small" 
                              onClick={handleRemoveFile}
                              title={t('document.remove_file')}
                              color="default"
                            >
                              <DeleteIcon />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    ) : (
                      // Показываем ревизии существующего документа
                      documentRevisionStore.getRevisions(documentId || 0).map((revision) => (
                        <TableRow key={revision.id}>
                          <TableCell>
                            <Chip label={referencesStore.getFullRevisionNumber(revision)} size="small" />
                          </TableCell>
                          <TableCell>
                            {referencesStore.getRevisionDescriptionLabel(revision.revision_description_id, i18n.language) || '-'}
                          </TableCell>
                          <TableCell>
                            {referencesStore.getRevisionStepLabel(revision.revision_step_id, i18n.language) || '-'}
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={referencesStore.getRevisionStatusLabel(revision.revision_status_id, i18n.language)} 
                              size="small"
                              color={getRevisionStatusColor(revision.revision_status_id || null)}
                            />
                          </TableCell>
                          <TableCell>{revision.change_description || '-'}</TableCell>
                          <TableCell>{formatDate(revision.created_at)}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <IconButton 
                                size="small" 
                                title={t('document.download')}
                                onClick={() => handleDownloadRevision(revision.id, revision.file_name || 'document')}
                              >
                                <DownloadIcon />
                              </IconButton>
                              <IconButton 
                                size="small" 
                                title={t('document.compare')}
                                onClick={() => {
                                  onCompareRevisions(
                                    referencesStore.getFullRevisionNumber(revision), 
                                    ''
                                  );
                                }}
                              >
                                <CompareIcon />
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <TableContainer component={Paper} sx={{ maxHeight: '100%' }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('document.revision')}</TableCell>
                      <TableCell>{t('document.revision_description')}</TableCell>
                      <TableCell>{t('document.step')}</TableCell>
                      <TableCell>{t('document.status')}</TableCell>
                      <TableCell>{t('document.change_description')}</TableCell>
                      <TableCell>{t('document.date')}</TableCell>
                      <TableCell>{t('document.actions')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography color="text.secondary">
                              {!isCreating && documentId ? t('document.no_revisions') : t('document.no_revisions_created')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </Box>
      </DialogContent>
      
      <DialogActions>
        {isCreating ? (
          <>
            <Button onClick={handleClose}>{t('common.cancel')}</Button>
            <Button 
              variant="contained" 
              onClick={() => {
                setIsUploadingDocument(true);
                setUploadProgress(0);
                onCreateDocument?.({
                  ...documentData,
                  uploadedFile,
                  revisionDescription: workflowPresetSequence.length > 0 ? workflowPresetSequence[0].revision_description : null,
                  revisionStep: workflowPresetSequence.length > 0 ? workflowPresetSequence[0].revision_step : null,
                  onProgress: (progress: number) => {
                    setUploadProgress(progress);
                  }
                });
              }}
              disabled={
                !documentData.title.trim() || 
                !documentData.number?.trim() || 
                !documentData.discipline_id || 
                !documentData.document_type_id || 
                !documentData.language_id || 
                !fileMetadata ||
                isUploadingDocument
              }
            >
              {isUploadingDocument ? t('document.creating') : t('document.create_document')}
            </Button>
          </>
        ) : (
          <Button onClick={handleClose}>{t('document.close')}</Button>
        )}
      </DialogActions>
    </Dialog>
  );
});

export default DocumentViewer;