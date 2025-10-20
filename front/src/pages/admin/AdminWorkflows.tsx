import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
  CircularProgress,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

interface WorkflowTemplate {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  steps: WorkflowStep[];
  created_at: string;
  updated_at: string;
}

interface WorkflowStep {
  id: number;
  name: string;
  description: string;
  step_order: number;
  approver_user_id: number;
  is_required: boolean;
}

const AdminWorkflows: React.FC = () => {
  const { t } = useTranslation();
  const [workflows, setWorkflows] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowTemplate | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Mock data for demonstration
  const mockWorkflows: WorkflowTemplate[] = [
    {
      id: 1,
      name: 'Стандартное утверждение',
      description: 'Базовый процесс утверждения документов',
      is_active: true,
      steps: [
        {
          id: 1,
          name: 'Техническая проверка',
          description: 'Проверка технических требований',
          step_order: 1,
          approver_user_id: 1,
          is_required: true,
        },
        {
          id: 2,
          name: 'Утверждение руководителя',
          description: 'Финальное утверждение руководителем',
          step_order: 2,
          approver_user_id: 2,
          is_required: true,
        },
      ],
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
    },
    {
      id: 2,
      name: 'Сложное утверждение',
      description: 'Многоэтапный процесс для критических документов',
      is_active: true,
      steps: [
        {
          id: 3,
          name: 'Предварительная проверка',
          description: 'Первичная проверка документа',
          step_order: 1,
          approver_user_id: 3,
          is_required: true,
        },
        {
          id: 4,
          name: 'Экспертная оценка',
          description: 'Оценка экспертом предметной области',
          step_order: 2,
          approver_user_id: 4,
          is_required: true,
        },
        {
          id: 5,
          name: 'Юридическая проверка',
          description: 'Проверка соответствия нормативным требованиям',
          step_order: 3,
          approver_user_id: 5,
          is_required: false,
        },
        {
          id: 6,
          name: 'Финальное утверждение',
          description: 'Утверждение генеральным директором',
          step_order: 4,
          approver_user_id: 6,
          is_required: true,
        },
      ],
      created_at: '2024-01-20T14:30:00Z',
      updated_at: '2024-01-20T14:30:00Z',
    },
  ];

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setWorkflows(mockWorkflows);
    } catch (err) {
      setError('Ошибка загрузки workflow шаблонов');
      console.error('Error loading workflows:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkflows();
  }, []);

  const handleViewWorkflow = (workflow: WorkflowTemplate) => {
    setSelectedWorkflow(workflow);
    setViewDialogOpen(true);
  };

  const handleToggleActive = (workflowId: number) => {
    setWorkflows(prev => prev.map(w => 
      w.id === workflowId ? { ...w, is_active: !w.is_active } : w
    ));
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
          {t('admin.workflows.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('admin.workflows.subtitle')}
        </Typography>
      </Box>

      {/* Actions */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          {t('admin.workflows.create_template')}
        </Button>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadWorkflows}
        >
          {t('admin.refresh')}
        </Button>
      </Box>

      {/* Workflow Cards */}
      <Grid container spacing={3}>
        {workflows.map((workflow) => (
          <Grid item xs={12} md={6} lg={4} key={workflow.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 3,
                },
              }}
            >
              <CardContent sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {workflow.name}
                  </Typography>
                  <Chip
                    label={workflow.is_active ? 'Активен' : 'Неактивен'}
                    color={workflow.is_active ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {workflow.description}
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Этапов: {workflow.steps.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Создан: {new Date(workflow.created_at).toLocaleDateString()}
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Tooltip title={t('admin.view')}>
                    <IconButton
                      size="small"
                      onClick={() => handleViewWorkflow(workflow)}
                    >
                      <ViewIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('admin.edit')}>
                    <IconButton size="small">
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={workflow.is_active ? 'Деактивировать' : 'Активировать'}>
                    <IconButton
                      size="small"
                      onClick={() => handleToggleActive(workflow.id)}
                    >
                      {workflow.is_active ? <PauseIcon /> : <PlayIcon />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('admin.delete')}>
                    <IconButton size="small" color="error">
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* View Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedWorkflow?.name}
        </DialogTitle>
        <DialogContent>
          {selectedWorkflow && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1" sx={{ mb: 3 }}>
                {selectedWorkflow.description}
              </Typography>

              <Typography variant="h6" sx={{ mb: 2 }}>
                Этапы workflow
              </Typography>

              <Stepper orientation="vertical">
                {selectedWorkflow.steps.map((step, index) => (
                  <Step key={step.id} active>
                    <StepLabel>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1">
                          {step.name}
                        </Typography>
                        {step.is_required && (
                          <Chip label="Обязательный" size="small" color="primary" />
                        )}
                      </Box>
                    </StepLabel>
                    <StepContent>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {step.description}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Ответственный: Пользователь #{step.approver_user_id}
                      </Typography>
                    </StepContent>
                  </Step>
                ))}
              </Stepper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>
            {t('admin.close')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {t('admin.workflows.create_template')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label={t('admin.workflows.name')}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label={t('admin.workflows.description')}
              multiline
              rows={3}
              sx={{ mb: 2 }}
            />
            <Alert severity="info" sx={{ mb: 2 }}>
              После создания шаблона вы сможете добавить этапы workflow
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>
            {t('admin.cancel')}
          </Button>
          <Button variant="contained">
            {t('admin.create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminWorkflows;
