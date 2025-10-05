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
} from '@mui/material';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  CloudUpload as CloudUploadIcon,
  Settings as SettingsIcon,
  UploadFile as UploadFileIcon,
  Description as DescriptionIcon,
  Delete as DeleteIcon,
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
import { useTranslation } from 'react-i18next';
import { useRefreshStore } from '../hooks/useRefreshStore';

const DocumentsPage: React.FC = observer(() => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { refreshDocuments } = useRefreshStore();
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
  const [newRevisionFile, setNewRevisionFile] = useState<File | null>(null);
  const [changeDescription, setChangeDescription] = useState('');
  const [fileError, setFileError] = useState<string>('');
  const [documentDetailsOpen, setDocumentDetailsOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<ApiDocument | null>(null);
  const [selectedRevisions, setSelectedRevisions] = useState<{r1: string, r2: string}>({r1: '', r2: ''});
  const [comparison, setComparison] = useState<any>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [selectedDocumentForWorkflow, setSelectedDocumentForWorkflow] = useState<ApiDocument | null>(null);
  const [workflowTemplates, setWorkflowTemplates] = useState<any[]>([]);
  const [workflowStatus, setWorkflowStatus] = useState<any>(null);
  
  // Загружаем документы и дисциплины при изменении проекта
  useEffect(() => {
    if (projectStore.hasSelectedProject && projectStore.selectedProject) {
      const projectId = projectStore.selectedProject.id;
      
      // Загружаем документы (store сам проверит, нужно ли загружать)
      documentStore.loadDocuments(projectId);
      
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
        setVisibleCols(settings.column_visibility);
      }
      if (settings.sidebar_enabled !== undefined) {
        setShowSidebar(settings.sidebar_enabled);
      }
    };
    
    loadSettings();
  }, []);

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
        console.log('Настройки сохранены');
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
      alert('Ошибка импорта документов по путям');
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

  const handleUpload = () => {
    // TODO: Реализовать загрузку документа
  };


  // Новый обработчик для объединенной модалки
  const handleShowDocumentDetails = async (documentId: number) => {
    const document = documentStore.documents.find((d: ApiDocument) => d.id === documentId);
    if (document) {
      setSelectedDocument(document);
      setSelectedDocumentId(documentId);
      try {
        await documentRevisionStore.loadRevisions(documentId);
        setDocumentDetailsOpen(true);
      } catch (error) {
        alert('Ошибка загрузки ревизий');
      }
    }
  };

  const handleDownload = async (documentId: number) => {
    try {
      // Получаем информацию о документе
      const doc = documentStore.documents.find((d: ApiDocument) => d.id === documentId);
      if (!doc) {
        alert('Документ не найден');
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
      alert('Ошибка при скачивании документа');
    }
  };

  const handleStartWorkflow = async (documentId: number) => {
    try {
      const document = documentStore.documents.find((d: ApiDocument) => d.id === documentId);
      if (!document) return;

      setSelectedDocumentForWorkflow(document);
      
      // Загружаем доступные шаблоны
      const templates = await workflowApi.getTemplates(document.discipline_id, document.document_type_id);
      setWorkflowTemplates(templates);
      
      setWorkflowOpen(true);
    } catch (error) {
      alert('Ошибка загрузки шаблонов согласования');
    }
  };

  const handleStartWorkflowWithTemplate = async (templateId: number) => {
    if (!selectedDocumentForWorkflow) return;

    try {
      await workflowApi.startWorkflow(selectedDocumentForWorkflow.id, templateId);
      alert('Маршрут согласования запущен');
      setWorkflowOpen(false);
      
      // Обновляем статус документа
      documentStore.loadDocuments(projectStore.selectedProject!.id);
    } catch (error) {
      alert('Ошибка запуска маршрута согласования');
    }
  };

  const handleViewWorkflowStatus = async (documentId: number) => {
    try {
      const status = await workflowApi.getWorkflowStatus(documentId);
      setWorkflowStatus(status);
      setWorkflowOpen(true);
    } catch (error) {
      // Если workflow не найден (404) — показываем диалог запуска с выбором шаблона
      const err: any = error as any;
      if (err?.response?.status === 404) {
        const document = documentStore.documents.find((d: ApiDocument) => d.id === documentId);
        if (document) {
          setSelectedDocumentForWorkflow(document);
          try {
            const templates = await workflowApi.getTemplates(document.discipline_id, document.document_type_id);
            setWorkflowTemplates(templates);
          } catch (e) {
          }
          setWorkflowStatus(null);
          setWorkflowOpen(true);
          return;
        }
      }
      alert('Ошибка загрузки статуса согласования');
    }
  };

  // Обработчики для работы с ревизиями

  const handleCreateRevision = async () => {
    if (!selectedDocumentId || !newRevisionFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', newRevisionFile);
      if (changeDescription) {
        formData.append('change_description', changeDescription);
      }

      await documentsApi.createRevision(selectedDocumentId, formData);
      
      // Обновляем список ревизий
      await documentRevisionStore.loadRevisions(selectedDocumentId);
      
      // Обновляем список документов
      if (projectStore.selectedProject) {
        documentStore.loadDocuments(projectStore.selectedProject.id);
      }
      
      setNewRevisionOpen(false);
      setNewRevisionFile(null);
      setChangeDescription('');
      setFileError('');
      
      alert('Новая ревизия создана');
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Ошибка создания ревизии';
      
      if (errorMessage.includes('Неподдерживаемый тип файла')) {
        alert(`Ошибка: ${errorMessage}\n\nПоддерживаемые типы файлов: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, JPG, JPEG, PNG, GIF`);
      } else {
        alert(`Ошибка: ${errorMessage}`);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleNewRevisionFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setNewRevisionFile(file);
    setFileError('');
    
    if (file) {
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
      const allowedTypes = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'jpg', 'jpeg', 'png', 'gif'];
      
      if (!allowedTypes.includes(fileExtension)) {
        setFileError(`Тип файла .${fileExtension} не поддерживается`);
        setNewRevisionFile(null);
      }
    }
  };

  const handleCompareRevisions = async () => {
    if (!selectedDocumentId || !selectedRevisions.r1 || !selectedRevisions.r2) return;

    try {
      const result = await documentsApi.compareRevisions(selectedDocumentId, selectedRevisions.r1, selectedRevisions.r2);
      setComparison(result);
      setCompareOpen(true);
    } catch (error) {
      alert('Ошибка сравнения ревизий');
    }
  };

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

  const getRevisionStatusColor = (statusId?: number): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    const status = referencesStore.getRevisionStatus(statusId);
    const statusName = status?.name || '';
    
    // Маппинг статусов на цвета
    const colorMap: { [key: string]: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' } = {
      'Active': 'success',
      'Cancelled': 'error',
      'Hold': 'warning',
      'Rejected': 'error',
      'Superseded': 'info',
      'Archieved': 'default'
    };
    return colorMap[statusName] || 'default';
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
      alert('Ошибка удаления документа');
    } finally {
      setDeleting(false);
    }
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
          <Box sx={{ display: 'flex', gap: 1, width: isMobile ? '100%' : 'auto' }}>
            <Button
              variant="contained"
              startIcon={<CloudUploadIcon />}
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
              alignSelf: isMobile ? 'stretch' : 'stretch',
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
                <Grid container spacing={2} sx={{ p: 2 }}>
                  {filteredDocuments.map((document) => (
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
                          <Tooltip title="Детали документа">
                            <IconButton size="small" onClick={() => handleShowDocumentDetails(document.id)}>
                              <DescriptionIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t('common.download')}>
                            <IconButton size="small" onClick={() => handleDownload(document.id)}>
                              <DownloadIcon />
                            </IconButton>
                          </Tooltip>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          ) : (
            // Десктопная версия - таблица
            <TableContainer component={Paper} sx={{ boxShadow: 2, border: '1px solid #e0e0e0', flex: 1 }}>
              {documentStore.isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : documentStore.error ? (
                <Alert severity="error" sx={{ m: 2 }}>
                  {documentStore.error}
                </Alert>
              ) : (
            <Table sx={{ tableLayout: 'fixed', width: '100%', minWidth: '100%' }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    {visibleCols.number && (<TableCell sx={{ width: '8%', fontWeight: 'bold' }}>{t('documents.columns.number')}</TableCell>)}
                    {visibleCols.title && (<TableCell sx={{ width: '18%', fontWeight: 'bold' }}>{t('documents.columns.title')}</TableCell>)}
                  {visibleCols.file && (<TableCell sx={{ width: '15%', fontWeight: 'bold' }}>{t('documents.columns.file')}</TableCell>)}
                  {visibleCols.size && (<TableCell sx={{ width: '8%', fontWeight: 'bold' }}>{t('documents.columns.size')}</TableCell>)}
                  {visibleCols.revision && (<TableCell sx={{ width: '8%', fontWeight: 'bold' }}>{t('documents.columns.revision')}</TableCell>)}
                  {visibleCols.status && (<TableCell sx={{ width: '10%', fontWeight: 'bold' }}>{t('documents.columns.status')}</TableCell>)}
                  {visibleCols.language && (<TableCell sx={{ width: '8%', fontWeight: 'bold' }}>{t('documents.columns.language')}</TableCell>)}
                  {visibleCols.drs && (<TableCell sx={{ width: '10%', fontWeight: 'bold' }}>DRS</TableCell>)}
                  {visibleCols.date && (<TableCell sx={{ width: '12%', fontWeight: 'bold' }}>{t('documents.columns.date')}</TableCell>)}
                  {visibleCols.actions && (<TableCell sx={{ width: '15%', fontWeight: 'bold' }}>{t('common.actions')}</TableCell>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredDocuments.map((document) => {
                  return (
                  <TableRow key={document.id} hover>
                    {visibleCols.number && (<TableCell>
                      <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {document.number || 'DOC-' + document.id}
                      </Typography>
                    </TableCell>)}
                    {visibleCols.title && (<TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {document.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {document.description}
                        </Typography>
                      </Box>
                    </TableCell>)}
                    {visibleCols.file && (<TableCell>
                      <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {document.file_name}
                      </Typography>
                    </TableCell>)}
                    {visibleCols.size && (<TableCell>
                      <Typography variant="body2">
                        {formatFileSize(document.file_size)}
                      </Typography>
                    </TableCell>)}
                    {visibleCols.revision && (<TableCell>
                      <Typography variant="body2">
                        {documentStore.getFullRevisionNumber(document, referencesStore)}
                      </Typography>
                    </TableCell>)}
                    {visibleCols.status && (<TableCell>
                      <Chip
                        label={documentStore.getDocumentStatusLabel(document, referencesStore, i18n.language)}
                        color={documentStore.getDocumentStatusColor(document, referencesStore) as any}
                        size="small"
                      />
                    </TableCell>)}
                    {visibleCols.language && (<TableCell>
                      <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {(() => {
                          const language = languageStore.languages.find(l => l.id === document.language_id);
                          return language ? language.code : 'ru';
                        })()}
                      </Typography>
                    </TableCell>)}
                    {visibleCols.drs && (<TableCell>
                      <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {document.drs || '-'}
                      </Typography>
                    </TableCell>)}
                    {visibleCols.date && (<TableCell>
                      <Typography variant="body2">
                        {formatDate(document.created_at)}
                      </Typography>
                    </TableCell>)}
                    {visibleCols.actions && (<TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Детали документа">
                          <IconButton size="small" onClick={() => handleShowDocumentDetails(document.id)}>
                            <DescriptionIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Скачать">
                          <IconButton size="small" onClick={() => handleDownload(document.id)}>
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                        {/* TODO: Обновить проверки статуса после внедрения новой системы статусов */}
                        {/* {document.status === DocumentStatus.DRAFT && (
                          <Tooltip title="Запустить согласование">
                            <IconButton size="small" onClick={() => handleStartWorkflow(document.id)}>
                              <CloudUploadIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        {(document.status === DocumentStatus.IN_REVIEW || document.status === DocumentStatus.APPROVED) && (
                          <Tooltip title="Статус согласования">
                            <IconButton size="small" onClick={() => handleViewWorkflowStatus(document.id)}>
                              <SettingsIcon />
                            </IconButton>
                          </Tooltip>
                        )} */}
                        {(document.is_deleted === 0 || document.is_deleted === undefined) && (
                          <Tooltip title={`Удалить (is_deleted: ${document.is_deleted}, user: ${userStore.currentUser?.role})`}>
                            <IconButton size="small" onClick={() => handleSoftDelete(document)}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                        )}
                      </Box>
                    </TableCell>)}
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
              )}
            </TableContainer>
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
              <FormControlLabel control={<Checkbox checked={visibleCols.title} onChange={(e)=>setVisibleCols(v=>{const newV={...v,title:e.target.checked}; saveSettings(newV); return newV;})} />} label={t('documents.columns.title')} />
              <FormControlLabel control={<Checkbox checked={visibleCols.number} onChange={(e)=>setVisibleCols(v=>{const newV={...v,number:e.target.checked}; saveSettings(newV); return newV;})} />} label={t('documents.columns.number')} />
              <FormControlLabel control={<Checkbox checked={visibleCols.file} onChange={(e)=>setVisibleCols(v=>{const newV={...v,file:e.target.checked}; saveSettings(newV); return newV;})} />} label={t('documents.columns.file')} />
              <FormControlLabel control={<Checkbox checked={visibleCols.size} onChange={(e)=>setVisibleCols(v=>{const newV={...v,size:e.target.checked}; saveSettings(newV); return newV;})} />} label={t('documents.columns.size')} />
              <FormControlLabel control={<Checkbox checked={visibleCols.revision} onChange={(e)=>setVisibleCols(v=>{const newV={...v,revision:e.target.checked}; saveSettings(newV); return newV;})} />} label={t('documents.columns.revision')} />
              <FormControlLabel control={<Checkbox checked={visibleCols.status} onChange={(e)=>setVisibleCols(v=>{const newV={...v,status:e.target.checked}; saveSettings(newV); return newV;})} />} label={t('documents.columns.status')} />
              <FormControlLabel control={<Checkbox checked={visibleCols.language} onChange={(e)=>setVisibleCols(v=>{const newV={...v,language:e.target.checked}; saveSettings(newV); return newV;})} />} label={t('documents.columns.language')} />
              <FormControlLabel control={<Checkbox checked={visibleCols.drs} onChange={(e)=>setVisibleCols(v=>{const newV={...v,drs:e.target.checked}; saveSettings(newV); return newV;})} />} label="DRS" />
              <FormControlLabel control={<Checkbox checked={visibleCols.date} onChange={(e)=>setVisibleCols(v=>{const newV={...v,date:e.target.checked}; saveSettings(newV); return newV;})} />} label={t('documents.columns.date')} />
              <FormControlLabel control={<Checkbox checked={visibleCols.actions} onChange={(e)=>setVisibleCols(v=>{const newV={...v,actions:e.target.checked}; saveSettings(newV); return newV;})} />} label={t('common.actions')} />
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

        {/* Объединенная модалка деталей документа и ревизий */}
        <Dialog 
          open={documentDetailsOpen} 
          onClose={() => {
            setDocumentDetailsOpen(false);
            setSelectedDocument(null);
            // Очищаем кэш ревизий при закрытии модалки
            if (selectedDocumentId) {
              documentRevisionStore.clearRevisions(selectedDocumentId);
            }
          }} 
          maxWidth="lg" 
          fullWidth
          PaperProps={{
            sx: { height: '90vh', maxHeight: '90vh' }
          }}
        >
          <DialogTitle>
            {selectedDocument ? `Детали документа: ${selectedDocument.title}` : 'Детали документа'}
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {selectedDocument && (
              <>
                {/* Верхняя часть - информация о документе */}
                <Box sx={{ flexShrink: 0, mb: 3 }}>
                  <Typography variant="h6" gutterBottom>Информация о документе</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        label="Название"
                        value={selectedDocument.title}
                        fullWidth
                        InputProps={{ readOnly: true }}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={3}>
                      <TextField
                        label="Номер"
                        value={selectedDocument.number || `DOC-${selectedDocument.id}`}
                        fullWidth
                        InputProps={{ readOnly: true }}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={3}>
                      <TextField
                        label="Язык"
                        value={(() => {
                          const language = languageStore.languages.find(l => l.id === selectedDocument.language_id);
                          return language ? language.code : 'ru';
                        })()}
                        fullWidth
                        InputProps={{ readOnly: true }}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="Описание"
                        value={selectedDocument.description}
                        fullWidth
                        multiline
                        rows={2}
                        InputProps={{ readOnly: true }}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <TextField
                        label="Размер файла"
                        value={formatFileSize(selectedDocument.file_size)}
                        fullWidth
                        InputProps={{ readOnly: true }}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <TextField
                        label="Статус"
                        value={documentStore.getDocumentStatusLabel(selectedDocument, referencesStore, i18n.language)}
                        fullWidth
                        InputProps={{ readOnly: true }}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <TextField
                        label="Дата создания"
                        value={formatDate(selectedDocument.created_at)}
                        fullWidth
                        InputProps={{ readOnly: true }}
                        size="small"
                      />
                    </Grid>
                  </Grid>
                </Box>

                {/* Нижняя часть - таблица ревизий */}
                <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">История ревизий</Typography>
                    <Button
                      variant="contained"
                      startIcon={<UploadFileIcon />}
                      onClick={() => setNewRevisionOpen(true)}
                    >
                      Новая ревизия
                    </Button>
                  </Box>
                  
                  {/* Таблица ревизий с прокруткой */}
                  <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                    {documentRevisionStore.getRevisions(selectedDocumentId || 0).length === 0 ? (
                      <Typography color="text.secondary">Ревизии не найдены</Typography>
                    ) : (
                      <TableContainer component={Paper} sx={{ maxHeight: '100%' }}>
                        <Table stickyHeader size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Ревизия</TableCell>
                              <TableCell>Статус</TableCell>
                              <TableCell>Шаг</TableCell>
                              <TableCell>Файл</TableCell>
                              <TableCell>Размер</TableCell>
                              <TableCell>Описание изменений</TableCell>
                              <TableCell>Дата</TableCell>
                              <TableCell>Действия</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {documentRevisionStore.getRevisions(selectedDocumentId || 0).map((revision) => (
                              <TableRow key={revision.id}>
                                <TableCell>
                                  <Chip label={referencesStore.getFullRevisionNumber(revision)} size="small" />
                                </TableCell>
                                <TableCell>
                                  <Chip 
                                    label={referencesStore.getRevisionStatusLabel(revision.revision_status_id, i18n.language)} 
                                    size="small"
                                    color={getRevisionStatusColor(revision.revision_status_id)}
                                  />
                                </TableCell>
                                <TableCell>
                                  {referencesStore.getRevisionStepLabel(revision.revision_step_id, i18n.language) || '-'}
                                </TableCell>
                                <TableCell>{revision.file_name}</TableCell>
                                <TableCell>{formatFileSize(revision.file_size)}</TableCell>
                                <TableCell>{revision.change_description || '-'}</TableCell>
                                <TableCell>{formatDate(revision.created_at)}</TableCell>
                                <TableCell>
                                  <Button
                                    size="small"
                                    onClick={() => {
                                      setSelectedRevisions({r1: referencesStore.getFullRevisionNumber(revision), r2: ''});
                                      setCompareOpen(true);
                                    }}
                                  >
                                    Сравнить
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Box>
                </Box>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDocumentDetailsOpen(false)}>Закрыть</Button>
          </DialogActions>
        </Dialog>

        {/* Диалог создания новой ревизии */}
        <Dialog open={newRevisionOpen} onClose={() => setNewRevisionOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{t('documents.revisions.create')}</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField
                label="Описание изменений"
                multiline
                rows={3}
                value={changeDescription}
                onChange={(e) => setChangeDescription(e.target.value)}
                placeholder={t('documents.revisions.description_placeholder')}
              />
              
                <input
                  type="file"
                onChange={handleNewRevisionFileSelect}
                  style={{ display: 'none' }}
                id="new-revision-input"
                />
              <label htmlFor="new-revision-input">
                  <Button
                    variant="outlined"
                    component="span"
                  startIcon={<CloudUploadIcon />}
                    sx={{ width: '100%' }}
                  >
                  Выбрать файл
                  </Button>
                </label>
              
              {newRevisionFile && (
                    <Typography variant="body2" color="text.secondary">
                  Выбран файл: {newRevisionFile.name}
                    </Typography>
              )}
              
              {fileError && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {fileError}
                </Alert>
              )}
              
              <Alert severity="info" sx={{ mt: 1 }}>
                <Typography variant="body2">
                  <strong>Поддерживаемые типы файлов:</strong>
                </Typography>
                <Typography variant="body2">
                  PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, JPG, JPEG, PNG, GIF
                </Typography>
              </Alert>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setNewRevisionOpen(false);
              setFileError('');
            }}>Отмена</Button>
            <Button
                onClick={handleCreateRevision}
              variant="contained"
              disabled={!newRevisionFile || uploading}
              startIcon={uploading ? <CircularProgress size={20} /> : <UploadFileIcon />}
            >
              {uploading ? 'Создание...' : t('documents.revisions.create')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Диалог сравнения ревизий */}
        <Dialog open={compareOpen} onClose={() => setCompareOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>{t('documents.revisions.compare')}</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              {!comparison ? (
                <>
                  <Typography variant="h6" gutterBottom>{t('documents.revisions.select_for_compare')}</Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <FormControl sx={{ flex: 1 }}>
                      <InputLabel>{t('documents.revisions.select_first')}</InputLabel>
                      <Select
                        value={selectedRevisions.r1}
                        onChange={(e) => setSelectedRevisions({...selectedRevisions, r1: e.target.value})}
                        label={t('documents.revisions.select_first')}
                      >
                        {documentRevisionStore.getRevisions(selectedDocumentId || 0).map((revision) => (
                          <MenuItem key={revision.id} value={referencesStore.getFullRevisionNumber(revision)}>
                            {t('documents.columns.revision')} {referencesStore.getFullRevisionNumber(revision)} - {revision.file_name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl sx={{ flex: 1 }}>
                      <InputLabel>{t('documents.revisions.select_second')}</InputLabel>
                      <Select
                        value={selectedRevisions.r2}
                        onChange={(e) => setSelectedRevisions({...selectedRevisions, r2: e.target.value})}
                        label={t('documents.revisions.select_second')}
                      >
                        {documentRevisionStore.getRevisions(selectedDocumentId || 0).map((revision) => (
                          <MenuItem key={revision.id} value={referencesStore.getFullRevisionNumber(revision)}>
                            {t('documents.columns.revision')} {referencesStore.getFullRevisionNumber(revision)} - {revision.file_name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                </>
              ) : (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">{t('documents.revisions.result')}</Typography>
                    <Chip
                      label={comparison.equal ? 'Файлы идентичны' : 'Файлы различаются'}
                      color={comparison.equal ? 'success' : 'warning'}
                    />
                  </Box>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" gutterBottom>{t('documents.columns.revision')} {comparison.from.revision}</Typography>
                          <Typography variant="body2">Файл: {comparison.from.file_name}</Typography>
                          <Typography variant="body2">Размер: {formatFileSize(comparison.from.file_size)}</Typography>
                          <Typography variant="body2">MD5: {comparison.from.md5 || 'Не вычислен'}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" gutterBottom>{t('documents.columns.revision')} {comparison.to.revision}</Typography>
                          <Typography variant="body2">Файл: {comparison.to.file_name}</Typography>
                          <Typography variant="body2">Размер: {formatFileSize(comparison.to.file_size)}</Typography>
                          <Typography variant="body2">MD5: {comparison.to.md5 || 'Не вычислен'}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                  
                  {comparison.size_diff !== 0 && (
                    <Alert severity="info">
                      Разница в размере: {comparison.size_diff > 0 ? '+' : ''}{comparison.size_diff} байт
                    </Alert>
                  )}
                </>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            {!comparison ? (
              <>
                <Button onClick={() => setCompareOpen(false)}>Отмена</Button>
                <Button 
                  onClick={handleCompareRevisions} 
                  variant="contained"
                  disabled={!selectedRevisions.r1 || !selectedRevisions.r2}
                >
                  Сравнить
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => {
                  setComparison(null);
                  setSelectedRevisions({r1: '', r2: ''});
                }}>Новое сравнение</Button>
                <Button onClick={() => setCompareOpen(false)}>Закрыть</Button>
              </>
            )}
          </DialogActions>
        </Dialog>


        {/* Диалог workflow */}
        <Dialog open={workflowOpen} onClose={() => setWorkflowOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            {workflowStatus ? 'Статус согласования' : 'Запуск согласования'}
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
                  Текущий шаг: {workflowStatus.current_step || 'Завершено'}
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
          title="Удалить документ?"
          content="Вы уверены, что хотите удалить этот документ? Это действие нельзя отменить."
          confirmText="Удалить"
          cancelText="Отмена"
          onConfirm={handleConfirmDelete}
          onClose={() => {
            setDeleteDialogOpen(false);
            setDocumentToDelete(null);
          }}
          loading={deleting}
        />
      </Box>
    </ProjectRequired>
  );
});

export default DocumentsPage;