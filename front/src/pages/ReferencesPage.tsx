import React, { useState, useEffect } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import {
  referencesApi
} from '../api/client';

// All interfaces defined locally to avoid import issues
interface RevisionStatus {
  id: number;
  name: string;
  name_native?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

interface RevisionDescription {
  id: number;
  code: string;
  description?: string;
  description_native?: string;
  phase?: string;
  is_active: boolean;
  created_at: string;
}

interface RevisionStep {
  id: number;
  code?: string;
  description?: string;
  description_native?: string;
  description_long?: string;
  is_active: boolean;
  created_at: string;
}

interface Originator {
  id: number;
  name: string;
  name_native?: string;
  code?: string;
  is_active: boolean;
  created_at: string;
}

interface ReviewCode {
  id: number;
  code: string;
  name: string;
  name_native?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

interface Language {
  id: number;
  name: string;
  name_native?: string;
  code?: string;
  is_active: boolean;
  created_at: string;
}

interface Department {
  id: number;
  name: string;
  name_native?: string;
  code?: string;
  company_id?: number;
  is_active: boolean;
  created_at: string;
}

interface Company {
  id: number;
  name: string;
  name_native?: string;
  code?: string;
  role?: string;
  is_active: boolean;
  created_at: string;
}

interface UserRole {
  id: number;
  name: string;
  name_native?: string;
  description?: string;
  permissions?: string;
  is_active: boolean;
  created_at: string;
}

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
      id={`reference-tabpanel-${index}`}
      aria-labelledby={`reference-tab-${index}`}
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

const ReferencesPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  // Data states
  const [revisionStatuses, setRevisionStatuses] = useState<RevisionStatus[]>([]);
  const [revisionDescriptions, setRevisionDescriptions] = useState<RevisionDescription[]>([]);
  const [revisionSteps, setRevisionSteps] = useState<RevisionStep[]>([]);
  const [originators, setOriginators] = useState<Originator[]>([]);
  const [reviewCodes, setReviewCodes] = useState<ReviewCode[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);

  const tabConfigs = [
    { label: 'Статусы ревизий', key: 'revisionStatuses', data: revisionStatuses, setData: setRevisionStatuses },
    { label: 'Описания ревизий', key: 'revisionDescriptions', data: revisionDescriptions, setData: setRevisionDescriptions },
    { label: 'Шаги ревизий', key: 'revisionSteps', data: revisionSteps, setData: setRevisionSteps },
    { label: 'Инициаторы', key: 'originators', data: originators, setData: setOriginators },
    { label: 'Коды проверки', key: 'reviewCodes', data: reviewCodes, setData: setReviewCodes },
    { label: 'Языки', key: 'languages', data: languages, setData: setLanguages },
    { label: 'Департаменты', key: 'departments', data: departments, setData: setDepartments },
    { label: 'Компании', key: 'companies', data: companies, setData: setCompanies },
    { label: 'Роли пользователей', key: 'userRoles', data: userRoles, setData: setUserRoles }
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const [
        statuses,
        descriptions,
        steps,
        originatorsData,
        codes,
        languagesData,
        departmentsData,
        companiesData,
        roles
      ] = await Promise.all([
        referencesApi.getRevisionStatuses(),
        referencesApi.getRevisionDescriptions(),
        referencesApi.getRevisionSteps(),
        referencesApi.getOriginators(),
        referencesApi.getReviewCodes(),
        referencesApi.getLanguages(),
        referencesApi.getDepartments(),
        referencesApi.getCompanies(),
        referencesApi.getUserRoles()
      ]);

      setRevisionStatuses(statuses);
      setRevisionDescriptions(descriptions);
      setRevisionSteps(steps);
      setOriginators(originatorsData);
      setReviewCodes(codes);
      setLanguages(languagesData);
      setDepartments(departmentsData);
      setCompanies(companiesData);
      setUserRoles(roles);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({});
    setDialogOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData(item);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const currentTab = tabConfigs[tabValue];
      const apiMethod = editingItem ? 'update' : 'create';
      
      // Здесь нужно будет добавить методы обновления в API
      
      setDialogOpen(false);
      loadData();
    } catch (error) {
    }
  };

  const handleDelete = async (item: any) => {
    if (window.confirm('Вы уверены, что хотите удалить этот элемент?')) {
      try {
        // Здесь нужно будет добавить методы удаления в API
        loadData();
      } catch (error) {
      }
    }
  };

  const renderTable = (data: any[], columns: string[]) => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell key={column}>{column}</TableCell>
            ))}
            <TableCell>Действия</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.id}>
              {columns.map((column) => (
                <TableCell key={column}>
                  {item[column.toLowerCase().replace(/\s+/g, '_')] || '-'}
                </TableCell>
              ))}
              <TableCell>
                <Tooltip title="Редактировать">
                  <IconButton size="small" onClick={() => handleEdit(item)}>
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Удалить">
                  <IconButton size="small" onClick={() => handleDelete(item)}>
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          Справочники
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadData}
            disabled={loading}
            sx={{ mr: 1 }}
          >
            Обновить
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAdd}
          >
            Добавить
          </Button>
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="reference tabs">
          {tabConfigs.map((config, index) => (
            <Tab key={config.key} label={config.label} />
          ))}
        </Tabs>
      </Box>

      {tabConfigs.map((config, index) => (
        <TabPanel key={config.key} value={tabValue} index={index}>
          {renderTable(config.data, ['ID', 'Название', 'Код', 'Описание', 'Активен'])}
        </TabPanel>
      ))}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingItem ? 'Редактировать' : 'Добавить'} элемент
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Название"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Код"
              value={formData.code || ''}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Описание"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              margin="normal"
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleSave} variant="contained">
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReferencesPage;
