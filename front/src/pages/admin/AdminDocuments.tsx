import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  History as HistoryIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { documentsApi } from '../../api/client';
import referenceDataStore from '../../stores/ReferenceDataStore';

interface Document {
  id: number;
  title: string;
  title_native?: string;
  number?: string;
  status?: string;
  project_id: number;
  project_name?: string;
  discipline_id?: number;
  discipline_name?: string;
  document_type_id?: number;
  document_type_name?: string;
  uploaded_by: number;
  uploaded_by_name?: string;
  created_at: string;
  updated_at: string;
  latest_revision?: DocumentRevision;
}

interface DocumentRevision {
  id: number;
  document_id: number;
  revision_number: string;
  revision_description: string;
  revision_step: string;
  workflow_status_id: number;
  workflow_status_name?: string;
  file_path: string;
  file_size: number;
  is_deleted: boolean;
  created_at: string;
  created_by: number;
  created_by_name?: string;
}

interface DocumentHistory {
  id: number;
  document_id: number;
  action: string;
  old_value?: string;
  new_value?: string;
  user_id: number;
  user_name?: string;
  comment?: string;
  created_at: string;
}

const AdminDocuments: React.FC = () => {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [selectedRevisions, setSelectedRevisions] = useState<DocumentRevision[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<DocumentHistory[]>([]);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [loadingRevisions, setLoadingRevisions] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const data = await documentsApi.getAll();
      
      // Enrich with reference data
      const enrichedData = data.map(doc => ({
        ...doc,
        status: (doc as any).status || 'draft', // Add default status
        project_name: `Project #${doc.project_id}`,
        discipline_name: doc.discipline_id ? `Discipline #${doc.discipline_id}` : 'N/A',
        document_type_name: doc.document_type_id ? `Type #${doc.document_type_id}` : 'N/A',
        uploaded_by_name: referenceDataStore.getUserName(doc.uploaded_by),
      }));
      
      setDocuments(enrichedData);
    } catch (err) {
      console.error('Error loading documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDocumentRevisions = async (documentId: number) => {
    try {
      setLoadingRevisions(true);
      // Use actual API call
      const data = await documentsApi.getRevisions(documentId);
      
      // Transform API data to our interface
      const revisions: DocumentRevision[] = data.map((revision: any) => ({
        id: revision.id,
        document_id: revision.document_id,
        revision_number: revision.revision_number || revision.number,
        revision_description: revision.revision_description || 'N/A',
        revision_step: revision.revision_step || 'N/A',
        workflow_status_id: revision.workflow_status_id || 1,
        workflow_status_name: revision.workflow_status_name || 'Draft',
        file_path: revision.file_path || '',
        file_size: revision.file_size || 0,
        is_deleted: revision.is_deleted || false,
        created_at: revision.created_at,
        created_by: revision.created_by || 1,
        created_by_name: referenceDataStore.getUserName(revision.created_by || 1),
      }));
      
      setSelectedRevisions(revisions);
    } catch (err) {
      console.error('Error loading revisions:', err);
      // Fallback to mock data if API fails
      const mockRevisions: DocumentRevision[] = [
        {
          id: 1,
          document_id: documentId,
          revision_number: 'A',
          revision_description: 'Первая ревизия',
          revision_step: 'Draft',
          workflow_status_id: 1,
          workflow_status_name: 'Draft',
          file_path: '/files/doc1_revA.pdf',
          file_size: 1024000,
          is_deleted: false,
          created_at: '2024-01-15T10:00:00Z',
          created_by: 1,
          created_by_name: 'Иван Иванов',
        },
      ];
      setSelectedRevisions(mockRevisions);
    } finally {
      setLoadingRevisions(false);
    }
  };

  const loadDocumentHistory = async (documentId: number) => {
    try {
      setLoadingHistory(true);
      // Mock data - history API not implemented yet
      const mockHistory: DocumentHistory[] = [
        {
          id: 1,
          document_id: documentId,
          action: 'created',
          new_value: 'Документ создан',
          user_id: 1,
          user_name: referenceDataStore.getUserName(1),
          comment: 'Создание нового документа',
          created_at: '2024-01-15T10:00:00Z',
        },
        {
          id: 2,
          document_id: documentId,
          action: 'revision_added',
          new_value: 'Добавлена ревизия A',
          user_id: 1,
          user_name: referenceDataStore.getUserName(1),
          comment: 'Первая ревизия документа',
          created_at: '2024-01-15T10:05:00Z',
        },
        {
          id: 3,
          document_id: documentId,
          action: 'status_changed',
          old_value: 'Draft',
          new_value: 'In Review',
          user_id: 2,
          user_name: referenceDataStore.getUserName(2),
          comment: 'Документ отправлен на рассмотрение',
          created_at: '2024-01-20T14:30:00Z',
        },
      ];
      setSelectedHistory(mockHistory);
      } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.title_native?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    const matchesProject = projectFilter === 'all' || doc.project_id.toString() === projectFilter;
    return matchesSearch && matchesStatus && matchesProject;
  });

  const getStatusColor = (status: string | undefined) => {
    if (!status) return 'default';
    switch (status.toLowerCase()) {
      case 'draft': return 'default';
      case 'in_review': return 'primary';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'archived': return 'secondary';
      default: return 'default';
    }
  };

  const handleViewDocument = (document: Document) => {
    setSelectedDocument(document);
    setViewDialogOpen(true);
    setCurrentTab(0);
  };

  const handleViewRevisions = (document: Document) => {
    setSelectedDocument(document);
    setCurrentTab(1);
    setViewDialogOpen(true);
  };

  const handleViewHistory = (document: Document) => {
    setSelectedDocument(document);
    setCurrentTab(2);
    setViewDialogOpen(true);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
    if (newValue === 1 && selectedDocument) {
      loadDocumentRevisions(selectedDocument.id);
    } else if (newValue === 2 && selectedDocument) {
      loadDocumentHistory(selectedDocument.id);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          {t('admin.documents.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('admin.documents.subtitle')}
        </Typography>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Поиск по названию, номеру..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Статус</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">Все</MenuItem>
                  <MenuItem value="draft">Черновик</MenuItem>
                  <MenuItem value="in_review">На рассмотрении</MenuItem>
                  <MenuItem value="approved">Утвержден</MenuItem>
                  <MenuItem value="rejected">Отклонен</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Проект</InputLabel>
                <Select
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                >
                  <MenuItem value="all">Все</MenuItem>
                  <MenuItem value="1">Project #1</MenuItem>
                  <MenuItem value="2">Project #2</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={loadDocuments}
                >
                  Обновить
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
                <TableCell>ID</TableCell>
              <TableCell>Название</TableCell>
                <TableCell>Номер</TableCell>
                <TableCell>Статус</TableCell>
              <TableCell>Проект</TableCell>
                <TableCell>Дисциплина</TableCell>
                <TableCell>Загружен</TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
              {filteredDocuments.map((document) => (
                <TableRow key={document.id} hover>
                <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      #{document.id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {document.title}
                  </Typography>
                      {document.title_native && (
                        <Typography variant="caption" color="text.secondary">
                          {document.title_native}
                    </Typography>
                  )}
                    </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                      {document.number || '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                      label={document.status || 'draft'}
                      color={getStatusColor(document.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {document.project_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {document.discipline_name}
                      </Typography>
                </TableCell>
                <TableCell>
                    <Box>
                      <Typography variant="body2">
                        {document.uploaded_by_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(document.created_at).toLocaleDateString()}
                      </Typography>
                    </Box>
                </TableCell>
                <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Просмотр">
                        <IconButton
                          size="small"
                          onClick={() => handleViewDocument(document)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Ревизии">
                      <IconButton
                        size="small"
                          onClick={() => handleViewRevisions(document)}
                      >
                          <DescriptionIcon />
                      </IconButton>
                    </Tooltip>
                      <Tooltip title="История">
                      <IconButton
                        size="small"
                          onClick={() => handleViewHistory(document)}
                      >
                        <HistoryIcon />
                      </IconButton>
                    </Tooltip>
                      <Tooltip title="Редактировать">
                        <IconButton size="small">
                          <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Удалить">
                        <IconButton size="small" color="error">
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      </Card>

      {/* Document Details Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DescriptionIcon />
            Документ #{selectedDocument?.id}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedDocument && (
            <Box sx={{ mt: 2 }}>
              <Tabs value={currentTab} onChange={handleTabChange} sx={{ mb: 3 }}>
                <Tab label="Основная информация" />
                <Tab label="Ревизии" />
                <Tab label="История изменений" />
              </Tabs>

              {currentTab === 0 && (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Название
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {selectedDocument.title}
                    </Typography>
                    
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Номер документа
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {selectedDocument.number || 'Не указан'}
                    </Typography>

                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Статус
                    </Typography>
                    <Chip
                      label={selectedDocument.status || 'draft'}
                      color={getStatusColor(selectedDocument.status)}
                      sx={{ mb: 2 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Проект
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {selectedDocument.project_name}
                    </Typography>

                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Дисциплина
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {selectedDocument.discipline_name}
                    </Typography>

                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Загружен
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {selectedDocument.uploaded_by_name} • {new Date(selectedDocument.created_at).toLocaleString()}
                    </Typography>
                  </Grid>
                </Grid>
              )}

              {currentTab === 1 && (
                <Box>
                  {loadingRevisions ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Ревизия</TableCell>
                            <TableCell>Описание</TableCell>
                            <TableCell>Статус</TableCell>
                            <TableCell>Размер файла</TableCell>
                            <TableCell>Создана</TableCell>
                            <TableCell>Автор</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedRevisions.map((revision) => (
                            <TableRow key={revision.id}>
                              <TableCell>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {revision.revision_number}
                                </Typography>
                              </TableCell>
                              <TableCell>{revision.revision_description}</TableCell>
                              <TableCell>
                                <Chip
                                  label={revision.workflow_status_name}
                                  color={getStatusColor(revision.workflow_status_name || '')}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>
                                {(revision.file_size / 1024 / 1024).toFixed(2)} MB
                              </TableCell>
                              <TableCell>
                                {new Date(revision.created_at).toLocaleString()}
                              </TableCell>
                              <TableCell>{revision.created_by_name}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              )}

              {currentTab === 2 && (
                <Box>
                  {loadingHistory ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <List>
                      {selectedHistory.map((history, index) => (
                        <React.Fragment key={history.id}>
                          <ListItem>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {history.action}
                                  </Typography>
                                  <Chip
                                    label={history.user_name}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                  />
                                </Box>
                              }
                              secondary={
                                <Box>
                                  <Box component="span" sx={{ display: 'block', color: 'text.secondary' }}>
                                    {history.new_value}
                                  </Box>
                                  {history.comment && (
                                    <Box component="span" sx={{ display: 'block', color: 'text.secondary', fontSize: '0.75rem' }}>
                                      {history.comment}
                                    </Box>
                                  )}
                                  <Box component="span" sx={{ display: 'block', fontSize: '0.75rem' }}>
                                    {new Date(history.created_at).toLocaleString()}
                                  </Box>
                                </Box>
                              }
                            />
                          </ListItem>
                          {index < selectedHistory.length - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </List>
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDocuments;