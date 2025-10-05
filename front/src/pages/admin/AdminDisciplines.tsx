import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  CircularProgress,
  Alert,
  Tooltip,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Category as CategoryIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { disciplinesApi, documentTypesApi, type Discipline as ApiDiscipline, type DocumentType as ApiDocumentType } from '../../api/client';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const AdminDisciplines: React.FC = () => {
  const [disciplines, setDisciplines] = useState<ApiDiscipline[]>([]);
  const [documentTypes, setDocumentTypes] = useState<ApiDocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [tabValue, setTabValue] = useState(0);
  
  // Диалоги для дисциплин
  const [disciplineDialogOpen, setDisciplineDialogOpen] = useState(false);
  const [editingDiscipline, setEditingDiscipline] = useState<ApiDiscipline | null>(null);
  const [disciplineFormData, setDisciplineFormData] = useState({
    name: '',
    description: '',
    is_active: true,
  });

  // Диалоги для типов документов
  const [documentTypeDialogOpen, setDocumentTypeDialogOpen] = useState(false);
  const [editingDocumentType, setEditingDocumentType] = useState<ApiDocumentType | null>(null);
  const [documentTypeFormData, setDocumentTypeFormData] = useState({
    name: '',
    description: '',
    discipline_id: undefined as number | undefined,
    is_active: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [disciplinesList, documentTypesList] = await Promise.all([
        disciplinesApi.getAll(),
        documentTypesApi.getAll(),
      ]);
      setDisciplines(disciplinesList);
      setDocumentTypes(documentTypesList);
    } catch (err) {
      setError('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  // Обработчики для дисциплин
  const handleCreateDiscipline = () => {
    setEditingDiscipline(null);
    setDisciplineFormData({
      name: '',
      description: '',
      is_active: true,
    });
    setDisciplineDialogOpen(true);
  };

  const handleEditDiscipline = (discipline: ApiDiscipline) => {
    setEditingDiscipline(discipline);
    setDisciplineFormData({
      name: discipline.name,
      description: discipline.description || '',
      is_active: discipline.is_active,
    });
    setDisciplineDialogOpen(true);
  };

  const handleSaveDiscipline = async () => {
    try {
      if (editingDiscipline) {
        await disciplinesApi.update(editingDiscipline.id, disciplineFormData);
      } else {
        await disciplinesApi.create(disciplineFormData);
      }
      
      setDisciplineDialogOpen(false);
      loadData();
    } catch (err) {
      setError('Ошибка сохранения дисциплины');
    }
  };

  const handleDeleteDiscipline = async (disciplineId: number) => {
    if (window.confirm('Вы уверены, что хотите удалить эту дисциплину?')) {
      try {
        await disciplinesApi.delete(disciplineId);
        loadData();
      } catch (err) {
        setError('Ошибка удаления дисциплины');
      }
    }
  };

  // Обработчики для типов документов
  const handleCreateDocumentType = () => {
    setEditingDocumentType(null);
    setDocumentTypeFormData({
      name: '',
      description: '',
      discipline_id: undefined,
      is_active: true,
    });
    setDocumentTypeDialogOpen(true);
  };

  const handleEditDocumentType = (documentType: ApiDocumentType) => {
    setEditingDocumentType(documentType);
    setDocumentTypeFormData({
      name: documentType.name,
      description: documentType.description || '',
      discipline_id: documentType.discipline_id || undefined,
      is_active: documentType.is_active,
    });
    setDocumentTypeDialogOpen(true);
  };

  const handleSaveDocumentType = async () => {
    try {
      if (editingDocumentType) {
        await documentTypesApi.update(editingDocumentType.id, documentTypeFormData);
      } else {
        await documentTypesApi.create(documentTypeFormData);
      }
      
      setDocumentTypeDialogOpen(false);
      loadData();
    } catch (err) {
      setError('Ошибка сохранения типа документа');
    }
  };

  const handleDeleteDocumentType = async (documentTypeId: number) => {
    if (window.confirm('Вы уверены, что хотите удалить этот тип документа?')) {
      try {
        await documentTypesApi.delete(documentTypeId);
        loadData();
      } catch (err) {
        setError('Ошибка удаления типа документа');
      }
    }
  };

  const getDocumentTypesForDiscipline = (disciplineId: number) => {
    return documentTypes.filter(dt => dt.discipline_id === disciplineId);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Управление дисциплинами и типами документов</Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Дисциплины" icon={<CategoryIcon />} />
          <Tab label="Типы документов" icon={<DescriptionIcon />} />
        </Tabs>
      </Box>

      {/* Вкладка дисциплин */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Дисциплины</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateDiscipline}
          >
            Добавить дисциплину
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Название</TableCell>
                <TableCell>Описание</TableCell>
                <TableCell>Статус</TableCell>
                <TableCell>Типы документов</TableCell>
                <TableCell>Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {disciplines.map((discipline) => (
                <TableRow key={discipline.id}>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {discipline.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {discipline.description || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={discipline.is_active ? 'Активна' : 'Неактивна'}
                      color={discipline.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {getDocumentTypesForDiscipline(discipline.id).length} типов
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Редактировать">
                        <IconButton
                          size="small"
                          onClick={() => handleEditDiscipline(discipline)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Удалить">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteDiscipline(discipline.id)}
                        >
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
      </TabPanel>

      {/* Вкладка типов документов */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Типы документов</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateDocumentType}
          >
            Добавить тип документа
          </Button>
        </Box>

        {disciplines.map((discipline) => {
          const disciplineDocumentTypes = getDocumentTypesForDiscipline(discipline.id);
          if (disciplineDocumentTypes.length === 0) return null;

          return (
            <Accordion key={discipline.id} sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">
                  {discipline.name} ({disciplineDocumentTypes.length} типов)
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  {disciplineDocumentTypes.map((documentType) => (
                    <ListItem key={documentType.id}>
                      <ListItemText
                        primary={documentType.name}
                        secondary={documentType.description || '—'}
                      />
                      <ListItemSecondaryAction>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Chip
                            label={documentType.is_active ? 'Активен' : 'Неактивен'}
                            color={documentType.is_active ? 'success' : 'default'}
                            size="small"
                          />
                          <Tooltip title="Редактировать">
                            <IconButton
                              size="small"
                              onClick={() => handleEditDocumentType(documentType)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Удалить">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteDocumentType(documentType.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </TabPanel>

      {/* Диалог создания/редактирования дисциплины */}
      <Dialog open={disciplineDialogOpen} onClose={() => setDisciplineDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingDiscipline ? 'Редактировать дисциплину' : 'Создать дисциплину'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Название дисциплины"
              value={disciplineFormData.name}
              onChange={(e) => setDisciplineFormData({ ...disciplineFormData, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Описание"
              value={disciplineFormData.description}
              onChange={(e) => setDisciplineFormData({ ...disciplineFormData, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={disciplineFormData.is_active}
                  onChange={(e) => setDisciplineFormData({ ...disciplineFormData, is_active: e.target.checked })}
                />
              }
              label="Активная дисциплина"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDisciplineDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleSaveDiscipline} variant="contained">
            {editingDiscipline ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог создания/редактирования типа документа */}
      <Dialog open={documentTypeDialogOpen} onClose={() => setDocumentTypeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingDocumentType ? 'Редактировать тип документа' : 'Создать тип документа'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Название типа документа"
              value={documentTypeFormData.name}
              onChange={(e) => setDocumentTypeFormData({ ...documentTypeFormData, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Описание"
              value={documentTypeFormData.description}
              onChange={(e) => setDocumentTypeFormData({ ...documentTypeFormData, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
            <TextField
              select
              label="Дисциплина"
              value={documentTypeFormData.discipline_id || ''}
              onChange={(e) => setDocumentTypeFormData({ ...documentTypeFormData, discipline_id: e.target.value ? Number(e.target.value) : undefined })}
              fullWidth
              required
            >
              <MenuItem value="">Выберите дисциплину</MenuItem>
              {disciplines.map((discipline) => (
                <MenuItem key={discipline.id} value={discipline.id}>
                  {discipline.name}
                </MenuItem>
              ))}
            </TextField>
            <FormControlLabel
              control={
                <Switch
                  checked={documentTypeFormData.is_active}
                  onChange={(e) => setDocumentTypeFormData({ ...documentTypeFormData, is_active: e.target.checked })}
                />
              }
              label="Активный тип документа"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDocumentTypeDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleSaveDocumentType} variant="contained">
            {editingDocumentType ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDisciplines;
