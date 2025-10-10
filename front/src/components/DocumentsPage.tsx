import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Divider,
  List,
  ListItemButton,
  useTheme,
  useMediaQuery,
  Grid,
  Card,
  CardContent,
  CardActions,
  TablePagination,
} from '@mui/material';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  UploadFile as UploadFileIcon,
  Description as DescriptionIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { observer } from 'mobx-react-lite';
import { projectStore } from '../stores/ProjectStore';
import { documentStore } from '../stores/DocumentStore';
import { disciplineStore } from '../stores/DisciplineStore';
import { languageStore } from '../stores/LanguageStore';
import { userStore } from '../stores/UserStore';
import { settingsStore } from '../stores/SettingsStore';
import { documentRevisionStore } from '../stores/DocumentRevisionStore';
import { referencesStore } from '../stores/ReferencesStore';
import ProjectRequired from './ProjectRequired';
import ConfirmDialog from './ConfirmDialog';
import { documentsApi, type Document as ApiDocument, workflowApi } from '../api/client';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useTranslation } from 'react-i18next';
import { useRefreshStore } from '../hooks/useRefreshStore';
import { DocumentViewer, DocumentRevisionDialog, DocumentCompareDialog } from './document';
import DocumentComments from './document/DocumentComments';
import NotificationSnackbar from './NotificationSnackbar';

const DocumentsPage: React.FC = observer(() => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { refreshDocuments } = useRefreshStore();
  const { isViewer } = useCurrentUser();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [visibleCols, setVisibleCols] = useState({
    title: true,
    number: true,
    file: true,
    size: true,
    revision: true,
    status: true,
    language: true,
    drs: false,
    date: true,
    actions: true,
  });
  // Убираем локальные состояния, используем store
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<number | null>(null);
  const [batchUploadOpen, setBatchUploadOpen] = useState(false);
  const [metadataFile, setMetadataFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  
  // Состояние для работы с ревизиями
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  
  // Состояние для диалога подтверждения удаления
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<ApiDocument | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [newRevisionOpen, setNewRevisionOpen] = useState(false);
  const [documentDetailsOpen, setDocumentDetailsOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<ApiDocument | null>(null);
  const [isCreatingDocument, setIsCreatingDocument] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [selectedDocumentForWorkflow, setSelectedDocumentForWorkflow] = useState<ApiDocument | null>(null);
  const [workflowTemplates] = useState<any[]>([]);
  const [workflowStatus, setWorkflowStatus] = useState<any>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  
  // Состояние для уведомлений
  const [successNotification, setSuccessNotification] = useState<{
    open: boolean;
    message: string;
  }>({ open: false, message: '' });

  // Состояние для пагинации
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  
  // Загружаем документы и дисциплины при изменении проекта
  useEffect(() => {
    if (projectStore.hasSelectedProject && projectStore.selectedProject) {
      const projectId = projectStore.selectedProject.id;
      
      // Загружаем документы (принудительно перезагружаем для получения обновленных данных)
      documentStore.reloadDocuments(projectId);
      
      // Загружаем дисциплины проекта для боковой панели
      disciplineStore.loadDisciplines(projectId);
    } else {
      disciplineStore.clearDisciplines();
    }
  }, [projectStore.selectedProject]);

  // Загружаем языки
  useEffect(() => {
    languageStore.loadLanguages();
  }, []);

  // Загружаем информацию о пользователе
  useEffect(() => {
    userStore.loadCurrentUser();
  }, []);

  // Загружаем справочные данные
  useEffect(() => {
    referencesStore.loadAll();
  }, []);

  // Загружаем настройки пользователя
  useEffect(() => {
    const loadSettings = async () => {
      // Сначала проверяем, есть ли уже загруженные настройки
      let settings = settingsStore.getSettings('documents');
      
      // Если настроек нет, загружаем их
      if (!settings || Object.keys(settings).length === 0) {
        settings = await settingsStore.loadSettings('documents');
      }
      
      if (settings.column_visibility) {
        setVisibleCols(prev => ({
          ...prev,
          ...settings.column_visibility
        }));
      }
      if (settings.sidebar_enabled !== undefined) {
        setShowSidebar(settings.sidebar_enabled);
      }
    };
    
    loadSettings();
  }, [userStore.currentUser?.id]); // Перезагружаем настройки при смене пользователя

  // Сохраняем настройки при изменении
  const saveSettings = async (newVisibleCols?: typeof visibleCols, newShowSidebar?: boolean) => {
    try {
      const settingsToSave: Record<string, any> = {};
      if (newVisibleCols) {
        settingsToSave.column_visibility = newVisibleCols;
      }
      if (newShowSidebar !== undefined) {
        settingsToSave.sidebar_enabled = newShowSidebar;
      }
      
      // Сохраняем настройки через settingsStore
      const success = await settingsStore.saveSettings('documents', settingsToSave);
      
      if (success) {
        // Можно добавить уведомление об успешном сохранении
      }
    } catch (error) {
      console.error('Ошибка сохранения настроек:', error);
    }
  };

  // Обработчики для массовой загрузки
  // Удалили выбор самих файлов — остаётся только Excel с путями

  const handleMetadataFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setMetadataFile(file);
  };

  const handleBatchUpload = async () => {
    if (!metadataFile || !projectStore.selectedProject) {
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('metadata_file', metadataFile);
      formData.append('project_id', projectStore.selectedProject.id.toString());

      const result = await documentsApi.importByPaths(formData);
        
        // Обновляем список документов
        documentStore.loadDocuments(projectStore.selectedProject.id);
        
        // Закрываем диалог и очищаем состояние
        setBatchUploadOpen(false);
        setMetadataFile(null);
        
        // Показываем результат
        alert(`Импортировано документов: ${result.total_imported} из ${result.total_rows}`);
        if (result.errors && result.errors.length > 0) {
      }
    } catch (error) {
      alert(t('documents.import_error'));
    } finally {
      setUploading(false);
    }
  };

  // Фильтрация документов
  const filteredDocuments = documentStore.documents.filter(doc => {
    // TODO: Обновить фильтр по статусу после внедрения новой системы статусов
    const statusMatch = filterStatus === 'all'; // Временно отключаем фильтр по статусу
    const selectedProjectMatch = !projectStore.hasSelectedProject || doc.project_id === projectStore.selectedProject?.id;
    const disciplineMatch = selectedDisciplineId ? doc.discipline_id === selectedDisciplineId : true;
    const searchMatch = searchTerm === '' || 
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    return statusMatch && selectedProjectMatch && disciplineMatch && searchMatch;
  });

  // Пагинация документов
  const paginatedDocuments = filteredDocuments.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Обработчики пагинации
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Сброс страницы при изменении фильтров
  useEffect(() => {
    setPage(0);
  }, [filterStatus, searchTerm, selectedDisciplineId]);

  const handleUpload = () => {
    setIsCreatingDocument(true);
    setSelectedDocument(null);
    setDocumentDetailsOpen(true);
  };

  const handleCreateDocument = async (documentData: any) => {
    try {
      console.log('Creating document:', documentData);
      
      // Создаем FormData для отправки файла и данных
      const formData = new FormData();
      
      // Добавляем файл
      if (documentData.uploadedFile) {
        formData.append('file', documentData.uploadedFile);
      }
      
      // Добавляем данные документа
      formData.append('title', documentData.title);
      formData.append('title_native', documentData.title_native || '');
      formData.append('remarks', documentData.remarks || '');
      formData.append('number', documentData.number || '');
      formData.append('drs', documentData.drs || '');
      formData.append('project_id', projectStore.selectedProject?.id?.toString() || '');
      formData.append('discipline_id', documentData.discipline_id || '');
      formData.append('document_type_id', documentData.document_type_id || '');
      formData.append('language_id', documentData.language_id || '1');
      
      // Добавляем данные ревизии
      if (documentData.revisionDescription?.id) {
        formData.append('revision_description_id', documentData.revisionDescription.id.toString());
      }
      if (documentData.revisionStep?.id) {
        formData.append('revision_step_id', documentData.revisionStep.id.toString());
      }
      
      // Отправляем запрос с отслеживанием прогресса
      const result = await (documentsApi.createWithRevision as any)(formData, {
        onUploadProgress: (progressEvent: any) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            documentData.onProgress?.(progress);
          }
        }
      });
      console.log('Document created successfully:', result);
      
      // Закрываем диалог и обновляем список документов
      setDocumentDetailsOpen(false);
      setIsCreatingDocument(false);
      refreshDocuments();
      
      // Показываем сообщение об успехе
      setSuccessNotification({
        open: true,
        message: t('documents.create_success')
      });
      
    } catch (error) {
      console.error('Error creating document:', error);
      alert(t('documents.create_error'));
    } finally {
      // Сбрасываем состояние загрузки в любом случае
      setIsCreatingDocument(false);
    }
  };


  // Новый обработчик для объединенной модалки
  const handleShowDocumentDetails = async (documentId: number) => {
    setIsCreatingDocument(false); // Сбрасываем флаг создания
    const document = documentStore.documents.find((d: ApiDocument) => d.id === documentId);
    if (document) {
      setSelectedDocument(document);
      setSelectedDocumentId(documentId);
      try {
        await documentRevisionStore.loadRevisions(documentId);
        setDocumentDetailsOpen(true);
      } catch (error) {
        alert(t('documents.load_revisions_error'));
      }
    }
  };

  const handleDownload = async (documentId: number) => {
    try {
      // Получаем информацию о документе
      const doc = documentStore.documents.find((d: ApiDocument) => d.id === documentId);
      if (!doc) {
        alert(t('documents.not_found'));
        return;
      }

      // Скачиваем файл
      const blob = await documentsApi.download(documentId);
      
      // Создаем ссылку для скачивания
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = doc.file_name || `document_${documentId}`;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      
      // Очищаем URL
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(t('documents.download_error'));
    }
  };


  const handleStartWorkflowWithTemplate = async (templateId: number) => {
    if (!selectedDocumentForWorkflow) return;

    try {
      await workflowApi.startWorkflow(selectedDocumentForWorkflow.id, templateId);
      alert(t('documents.workflow_started'));
      setWorkflowOpen(false);
      
      // Обновляем статус документа
      documentStore.loadDocuments(projectStore.selectedProject!.id);
    } catch (error) {
      alert(t('documents.workflow_error'));
    }
  };


  // Обработчики для работы с ревизиями

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  };


  const handleSoftDelete = (document: ApiDocument) => {
    setDocumentToDelete(document);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!documentToDelete) return;

    setDeleting(true);
    try {
      await documentsApi.softDelete(documentToDelete.id);
      
      // Обновляем список документов в store
      await refreshDocuments();
      
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    } catch (error) {
      alert(t('documents.delete_error'));
    } finally {
      setDeleting(false);
    }
  };

  const handleCloseNotification = () => {
    setSuccessNotification({ open: false, message: '' });
  };

  return (
    <ProjectRequired>
      <Box sx={{ width: '100%', p: 3 }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: isMobile ? 'flex-start' : 'center', 
          mb: 3,
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 2 : 0
        }}>
          <Typography variant={isMobile ? "h5" : "h4"} component="h1">
            {t('menu.documents')} {projectStore.selectedProject && `- ${projectStore.selectedProject.name}`}
          </Typography>
          {!isViewer && (
          <Box sx={{ display: 'flex', gap: 1, width: isMobile ? '100%' : 'auto' }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleUpload}
              sx={{ backgroundColor: '#1976d2', flex: isMobile ? 1 : 'none' }}
            >
              {t('documents.upload')}
            </Button>
            <Button
              variant="outlined"
              startIcon={<UploadFileIcon />}
              onClick={() => setBatchUploadOpen(true)}
              sx={{ flex: isMobile ? 1 : 'none' }}
            >
              {t('documents.import_by_paths') || 'Импорт по путям (Excel)'}
            </Button>
          </Box>
          )}
        </Box>

        {/* Фильтры и поиск */}
        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          alignItems: 'center', 
          flexWrap: 'wrap',
          flexDirection: isMobile ? 'column' : 'row',
          mb: 3
        }}>
          <TextField
            placeholder={t('documents.search_placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: isMobile ? '100%' : 300 }}
          />
          
          <FormControl sx={{ minWidth: isMobile ? '100%' : 150 }}>
            <InputLabel>{t('common.status')}</InputLabel>
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              label={t('common.status')}
            >
              <MenuItem value="all">{t('filter.all')}</MenuItem>
              <MenuItem value="draft">{t('docStatus.draft')}</MenuItem>
              <MenuItem value="review">{t('docStatus.review')}</MenuItem>
              <MenuItem value="approved">{t('docStatus.approved')}</MenuItem>
              <MenuItem value="rejected">{t('docStatus.rejected')}</MenuItem>
            </Select>
          </FormControl>


          <Tooltip title={t('documents.settings') || 'Настройки'}>
            <IconButton onClick={() => setSettingsOpen(true)}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Контент с опциональной боковой панелью */}
        <Box sx={{ 
          display: 'flex', 
          gap: 2,
          flexDirection: isMobile ? 'column' : 'row'
        }}>
          {showSidebar && (
            <Paper sx={{ 
              width: isMobile ? '100%' : 260, 
              p: 1.5, 
              height: isMobile ? 'auto' : '100%', 
              maxHeight: isMobile ? 300 : 'none',
              overflow: isMobile ? 'auto' : 'visible'
            }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('documents.project')}</Typography>
              <Divider sx={{ mb: 1 }} />
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>{t('createProject.section.disciplines')}</Typography>
              <List dense>
                <ListItemButton selected={selectedDisciplineId === null} onClick={() => setSelectedDisciplineId(null)}>
                  {t('filter.all')}
                </ListItemButton>
                {disciplineStore.disciplines.map((d) => (
                  <ListItemButton key={d.id} selected={selectedDisciplineId === d.id} onClick={() => setSelectedDisciplineId(d.id)}>
                    {d.code} - {(d.name_en && i18n.language === 'en') ? d.name_en : d.name}
                  </ListItemButton>
                ))}
              </List>
            </Paper>
          )}

          {isMobile ? (
            // Мобильная версия - карточки
            <Box sx={{ flex: 1 }}>
              {documentStore.isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : documentStore.error ? (
                <Alert severity="error" sx={{ m: 2 }}>
                  {documentStore.error}
                </Alert>
              ) : filteredDocuments.length === 0 ? (
                <Alert severity="info" sx={{ m: 2 }}>
                  {t('documents.no_documents')}
                </Alert>
              ) : (
                <>
                  <Grid container spacing={2} sx={{ p: 2 }}>
                    {paginatedDocuments.map((document) => (
                      <Grid item xs={12} key={document.id}>
                        <Card sx={{ boxShadow: 2, border: '1px solid #e0e0e0' }}>
                          <CardContent>
                            <Typography variant="h6" component="h3" sx={{ mb: 1, fontWeight: 'bold' }}>
                              {document.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              {document.description}
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                              <Chip 
                                label={document.file_name || 'N/A'} 
                                size="small" 
                                variant="outlined" 
                              />
                              <Chip 
                                label={formatFileSize(document.file_size || 0)} 
                                size="small" 
                                variant="outlined" 
                              />
                              <Chip 
                                label={documentStore.getFullRevisionNumber(document, referencesStore)} 
                                size="small" 
                                variant="outlined" 
                              />
                              <Chip 
                                label={documentStore.getDocumentStatusLabel(document, referencesStore, i18n.language)} 
                                size="small" 
                                color={documentStore.getDocumentStatusColor(document, referencesStore) as any} 
                              />
                              <Chip 
                                label={formatDate(document.created_at)} 
                                size="small" 
                                variant="outlined" 
                              />
                            </Box>
                          </CardContent>
                          <CardActions sx={{ justifyContent: 'flex-end', gap: 1 }}>
                            <Tooltip title={t('documents.details')}>
                              <IconButton size="small" onClick={() => handleShowDocumentDetails(document.id)}>
                                <DescriptionIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={t('common.download_latest')}>
                              <IconButton size="small" onClick={() => handleDownload(document.id)}>
                                <DownloadIcon />
                              </IconButton>
                            </Tooltip>
                            {(document.is_deleted === 0 || document.is_deleted === undefined) && (
                              <Tooltip title={t('common.delete')}>
                                <IconButton size="small" onClick={() => handleSoftDelete(document)}>
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                          </CardActions>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                  
                  {!documentStore.isLoading && filteredDocuments.length > 0 && (
                    <Box sx={{ p: 2 }}>
                      <TablePagination
                        rowsPerPageOptions={[10, 25, 50]}
                        component="div"
                        count={filteredDocuments.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        labelRowsPerPage={t('common.rows_per_page') || 'Строк на странице:'}
                        labelDisplayedRows={({ from, to, count }) => {
                          const ofText = t('common.of') || 'из';
                          const moreThanText = t('common.more_than') || 'больше чем';
                          const countText = count !== -1 ? count.toString() : `${moreThanText} ${to}`;
                          return `${from}-${to} ${ofText} ${countText}`;
                        }}
                        sx={{
                          '& .MuiTablePagination-toolbar': {
                            paddingLeft: 0,
                            paddingRight: 0,
                            flexWrap: 'wrap',
                          },
                          '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                            fontSize: '0.875rem',
                          },
                        }}
                      />
                    </Box>
                  )}
                </>
              )}
            </Box>
          ) : (
            // Десктопная версия - таблица
            <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <TableContainer component={Paper} sx={{ boxShadow: 2, border: '1px solid #e0e0e0', flex: 1 }}>
                {documentStore.isLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : documentStore.error ? (
                  <Alert severity="error" sx={{ m: 2 }}>
                    {documentStore.error}
                  </Alert>
                ) : filteredDocuments.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="h6" color="text.secondary">
                      Документы не найдены
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Попробуйте изменить фильтры или загрузить новые документы
                    </Typography>
                  </Box>
                ) : (
                  <Table sx={{ tableLayout: 'fixed', width: '100%', minWidth: '100%' }}>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f5f5f5', '& .MuiTableCell-root': { padding: '8px 16px' } }}>
                        {visibleCols.number && (<TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>{t('documents.columns.number')}</TableCell>)}
                        {visibleCols.title && (<TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>{t('documents.columns.title')}</TableCell>)}
                        {visibleCols.file && (<TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>{t('documents.columns.file')}</TableCell>)}
                        {visibleCols.size && (<TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>{t('documents.columns.size')}</TableCell>)}
                        {visibleCols.revision && (<TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>{t('documents.columns.revision')}</TableCell>)}
                        {visibleCols.status && (<TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>{t('documents.columns.status')}</TableCell>)}
                        {visibleCols.language && (<TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>{t('documents.columns.language')}</TableCell>)}
                        {visibleCols.drs && (<TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>DRS</TableCell>)}
                        {visibleCols.date && (<TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>{t('documents.columns.date')}</TableCell>)}
                        {visibleCols.actions && (<TableCell sx={{ width: '160px', minWidth: '160px', fontWeight: 'bold', fontSize: '0.875rem' }}>{t('common.actions')}</TableCell>)}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedDocuments.map((document) => (
                        <TableRow key={document.id} hover sx={{ '& .MuiTableCell-root': { padding: '8px 16px' } }}>
                          {visibleCols.number && (<TableCell>
                            <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                              {document.number || 'DOC-' + document.id}
                            </Typography>
                          </TableCell>)}
                          {visibleCols.title && (<TableCell>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                                {document.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                                {document.description}
                              </Typography>
                            </Box>
                          </TableCell>)}
                          {visibleCols.file && (<TableCell>
                            <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                              {document.file_name}
                            </Typography>
                          </TableCell>)}
                          {visibleCols.size && (<TableCell>
                            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                              {formatFileSize(document.file_size)}
                            </Typography>
                          </TableCell>)}
                          {visibleCols.revision && (<TableCell>
                            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                              {documentStore.getFullRevisionNumber(document, referencesStore)}
                            </Typography>
                          </TableCell>)}
                          {visibleCols.status && (<TableCell>
                            <Chip
                              label={documentStore.getDocumentStatusLabel(document, referencesStore, i18n.language)}
                              color={documentStore.getDocumentStatusColor(document, referencesStore) as any}
                              size="small"
                              sx={{ fontSize: '0.75rem', height: '24px' }}
                            />
                          </TableCell>)}
                          {visibleCols.language && (<TableCell>
                            <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                              {(() => {
                                const language = languageStore.languages.find(l => l.id === document.language_id);
                                return language ? language.code : 'ru';
                              })()}
                            </Typography>
                          </TableCell>)}
                          {visibleCols.drs && (<TableCell>
                            <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                              {document.drs || '-'}
                            </Typography>
                          </TableCell>)}
                          {visibleCols.date && (<TableCell>
                            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                              {formatDate(document.created_at)}
                            </Typography>
                          </TableCell>)}
                          {visibleCols.actions && (<TableCell sx={{ width: '160px', minWidth: '160px' }}>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Tooltip title={t('documents.details')}>
                                <IconButton size="small" onClick={() => handleShowDocumentDetails(document.id)} sx={{ padding: '4px' }}>
                                  <DescriptionIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={t('common.download_latest')}>
                                <IconButton size="small" onClick={() => handleDownload(document.id)} sx={{ padding: '4px' }}>
                                  <DownloadIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              {(document.is_deleted === 0 || document.is_deleted === undefined) && (
                                <Tooltip title={t('common.delete')}>
                                  <IconButton size="small" onClick={() => handleSoftDelete(document)} sx={{ padding: '4px' }}>
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          </TableCell>)}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TableContainer>
              
              {!isMobile && !documentStore.isLoading && filteredDocuments.length > 0 && (
                <TablePagination
                  rowsPerPageOptions={[10, 25, 50, 100]}
                  component="div"
                  count={filteredDocuments.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  labelRowsPerPage={t('common.rows_per_page') || 'Строк на странице:'}
                  labelDisplayedRows={({ from, to, count }) => {
                    const ofText = t('common.of') || 'из';
                    const moreThanText = t('common.more_than') || 'больше чем';
                    const countText = count !== -1 ? count.toString() : `${moreThanText} ${to}`;
                    return `${from}-${to} ${ofText} ${countText}`;
                  }}
                  sx={{
                    '& .MuiTablePagination-toolbar': {
                      paddingLeft: 2,
                      paddingRight: 2,
                    },
                    '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                      fontSize: '0.875rem',
                    },
                  }}
                />
              )}
            </Box>
          )}
        </Box>

        {!isMobile && !documentStore.isLoading && filteredDocuments.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary">
              Документы не найдены
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Попробуйте изменить фильтры или загрузить новые документы
            </Typography>
          </Box>
        )}

        {/* Диалог настроек таблицы */}
        <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{t('documents.settings') || 'Настройки таблицы'}</DialogTitle>
          <DialogContent>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('documents.columns.title')}</Typography>
            <FormGroup>
              <FormControlLabel control={<Checkbox checked={visibleCols.title ?? true} onChange={(e)=>setVisibleCols(v=>{const newV={...v,title:e.target.checked}; saveSettings(newV); return newV;})} />} label={t('documents.columns.title')} />
              <FormControlLabel control={<Checkbox checked={visibleCols.number ?? true} onChange={(e)=>setVisibleCols(v=>{const newV={...v,number:e.target.checked}; saveSettings(newV); return newV;})} />} label={t('documents.columns.number')} />
              <FormControlLabel control={<Checkbox checked={visibleCols.file ?? true} onChange={(e)=>setVisibleCols(v=>{const newV={...v,file:e.target.checked}; saveSettings(newV); return newV;})} />} label={t('documents.columns.file')} />
              <FormControlLabel control={<Checkbox checked={visibleCols.size ?? true} onChange={(e)=>setVisibleCols(v=>{const newV={...v,size:e.target.checked}; saveSettings(newV); return newV;})} />} label={t('documents.columns.size')} />
              <FormControlLabel control={<Checkbox checked={visibleCols.revision ?? true} onChange={(e)=>setVisibleCols(v=>{const newV={...v,revision:e.target.checked}; saveSettings(newV); return newV;})} />} label={t('documents.columns.revision')} />
              <FormControlLabel control={<Checkbox checked={visibleCols.status ?? true} onChange={(e)=>setVisibleCols(v=>{const newV={...v,status:e.target.checked}; saveSettings(newV); return newV;})} />} label={t('documents.columns.status')} />
              <FormControlLabel control={<Checkbox checked={visibleCols.language ?? true} onChange={(e)=>setVisibleCols(v=>{const newV={...v,language:e.target.checked}; saveSettings(newV); return newV;})} />} label={t('documents.columns.language')} />
              <FormControlLabel control={<Checkbox checked={visibleCols.drs ?? false} onChange={(e)=>setVisibleCols(v=>{const newV={...v,drs:e.target.checked}; saveSettings(newV); return newV;})} />} label="DRS" />
              <FormControlLabel control={<Checkbox checked={visibleCols.date ?? true} onChange={(e)=>setVisibleCols(v=>{const newV={...v,date:e.target.checked}; saveSettings(newV); return newV;})} />} label={t('documents.columns.date')} />
              <FormControlLabel control={<Checkbox checked={visibleCols.actions ?? true} onChange={(e)=>setVisibleCols(v=>{const newV={...v,actions:e.target.checked}; saveSettings(newV); return newV;})} />} label={t('common.actions')} />
            </FormGroup>
            <Divider sx={{ my: 2 }} />
            <FormControlLabel control={<Checkbox checked={showSidebar} onChange={(e)=>{setShowSidebar(e.target.checked); saveSettings(undefined, e.target.checked);}} />} label={t('documents.sidebar_toggle') || 'Боковая панель дисциплин'} />
          </DialogContent>
          <DialogActions>
            <Button onClick={()=>setSettingsOpen(false)}>{t('common.cancel')}</Button>
          </DialogActions>
        </Dialog>

        {/* Диалог массовой загрузки */}
        <Dialog 
          open={batchUploadOpen} 
          onClose={() => setBatchUploadOpen(false)}
          maxWidth="md"
          fullWidth
          fullScreen={isMobile}
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <UploadFileIcon />
              {t('documents.import_by_paths') || 'Импорт по путям'}
            </Box>
          </DialogTitle>
          <DialogContent sx={{ minHeight: 400 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
              {/* Выбор файла метаданных */}
              <Box>
                <Typography variant="h6" gutterBottom>
                  {t('documents.metadata_file') || 'Файл метаданных (Excel)'}
                </Typography>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleMetadataFileSelect}
                  style={{ display: 'none' }}
                  id="metadata-input"
                  name="metadata-input"
                />
                <label htmlFor="metadata-input">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<DescriptionIcon />}
                    sx={{ width: '100%' }}
                  >
                    {t('documents.choose_metadata') || 'Выбрать Excel'}
                  </Button>
                </label>
                {metadataFile && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {(t('documents.selected_metadata') || 'Выбран файл метаданных') + ': '} {metadataFile.name}
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Информация о формате Excel */}
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>{t('documents.excel_format_info') || 'Формат Excel'}</strong>
                      </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {(t('documents.excel_required_columns') || 'Обязательные колонки') + ': '} file_path, title
                      </Typography>
                <Typography variant="body2">
                  {(t('documents.excel_optional_columns') || 'Необязательные колонки') + ': '} description, discipline_code, document_type_code, document_code, language, author, creation_date, revision, sheet_number, total_sheets, scale, format, confidentiality
                </Typography>
              </Alert>
                  </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setBatchUploadOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleBatchUpload}
              variant="contained"
              disabled={!metadataFile || uploading}
              startIcon={uploading ? <CircularProgress size={20} /> : <UploadFileIcon />}
            >
              {uploading ? (t('documents.uploading') || 'Импорт...') : (t('documents.import') || 'Импортировать')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Новые компоненты для работы с документами */}
        <DocumentViewer
          open={documentDetailsOpen}
          document={selectedDocument}
          documentId={selectedDocumentId}
          isCreating={isCreatingDocument}
          onClose={() => {
            setDocumentDetailsOpen(false);
            setSelectedDocument(null);
            setIsCreatingDocument(false);
            // Очищаем кэш ревизий при закрытии модалки
            if (selectedDocumentId) {
              documentRevisionStore.clearRevisions(selectedDocumentId);
            }
          }}
          onNewRevision={() => setNewRevisionOpen(true)}
          onCompareRevisions={() => {
            setCompareOpen(true);
          }}
          onCreateDocument={handleCreateDocument}
          onOpenComments={() => setCommentsOpen(true)}
        />

        {/* Диалог создания новой ревизии */}
        <DocumentRevisionDialog
          open={newRevisionOpen}
          documentId={selectedDocumentId}
          onClose={() => {
            setNewRevisionOpen(false);
          }}
          onSuccess={() => {
            // Обновляем список ревизий после успешного создания
            if (selectedDocumentId) {
              documentRevisionStore.reloadRevisions(selectedDocumentId);
            }
            refreshDocuments();
          }}
        />

        {/* Диалог сравнения ревизий */}
        <DocumentCompareDialog
          open={compareOpen}
          documentId={selectedDocumentId}
          onClose={() => {
            setCompareOpen(false);
          }}
        />


        {/* Диалог workflow */}
        <Dialog open={workflowOpen} onClose={() => setWorkflowOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            {workflowStatus ? t('documents.workflow_status') : t('documents.start_workflow')}
          </DialogTitle>
          <DialogContent>
            {workflowStatus ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6">Прогресс согласования</Typography>
                  <Chip
                    label={`${workflowStatus.progress_percentage}%`}
                    color={workflowStatus.progress_percentage === 100 ? 'success' : 'primary'}
                  />
                </Box>
                
                <Typography variant="body2" color="text.secondary">
                  {t('documents.current_step')}: {workflowStatus.current_step || t('documents.completed')}
                </Typography>
                
                <Typography variant="body2" color="text.secondary">
                  Статус: {workflowStatus.status}
                </Typography>
                
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h6" gutterBottom>История согласований</Typography>
                  {workflowStatus.approvals.map((approval: any) => (
                    <Card key={approval.id} sx={{ mb: 1 }}>
                      <CardContent sx={{ py: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" fontWeight="bold">
                            {approval.step_name}
                          </Typography>
                          <Chip
                            label={approval.status}
                            color={approval.status === 'approved' ? 'success' : approval.status === 'rejected' ? 'error' : 'default'}
                            size="small"
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          Согласующий: {approval.approver_name}
                        </Typography>
                        {approval.comments && (
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            Комментарий: {approval.comments}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          {new Date(approval.created_at).toLocaleString('ru-RU')}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Выберите шаблон согласования для документа: {selectedDocumentForWorkflow?.title}
                </Typography>
                
                {workflowTemplates.length === 0 ? (
                  <Alert severity="info">
                    Нет доступных шаблонов согласования для данного типа документа
                  </Alert>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {workflowTemplates.map((template) => (
                      <Card key={template.id} sx={{ cursor: 'pointer' }} onClick={() => handleStartWorkflowWithTemplate(template.id)}>
                        <CardContent>
                          <Typography variant="h6">{template.name}</Typography>
                          {template.description && (
                            <Typography variant="body2" color="text.secondary">
                              {template.description}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary">
                            Шагов: {template.steps?.length || 0}
                          </Typography>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setWorkflowOpen(false);
              setWorkflowStatus(null);
              setSelectedDocumentForWorkflow(null);
            }}>
              Закрыть
            </Button>
          </DialogActions>
        </Dialog>

        {/* Диалог подтверждения удаления */}
        <ConfirmDialog
          open={deleteDialogOpen}
          title={t('documents.delete_confirm_title')}
          content={t('documents.delete_confirm_content')}
          confirmText={t('documents.delete_confirm')}
          cancelText={t('documents.cancel')}
          onConfirm={handleConfirmDelete}
          onClose={() => {
            setDeleteDialogOpen(false);
            setDocumentToDelete(null);
          }}
          loading={deleting}
        />

        {/* Компонент комментариев */}
        <DocumentComments
          open={commentsOpen}
          documentId={selectedDocumentId}
          onClose={() => setCommentsOpen(false)}
        />

        {/* Уведомление об успешном создании документа */}
        <NotificationSnackbar
          open={successNotification.open}
          message={successNotification.message}
          severity="success"
          onClose={handleCloseNotification}
        />
      </Box>
    </ProjectRequired>
  );
});

export default DocumentsPage;