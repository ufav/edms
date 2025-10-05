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
  IconButton,
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
  Card,
  CardContent,
  CardActions,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  Visibility as ViewIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { observer } from 'mobx-react-lite';
import { workflowApi, type WorkflowTemplate, type WorkflowStep } from '../api/client';
import { useTranslation } from 'react-i18next';

const WorkflowTemplatesPage = observer(() => {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WorkflowTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    discipline_id: undefined as number | undefined,
    document_type_id: undefined as number | undefined,
  });
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [activeStep, setActiveStep] = useState(0);

  // Загружаем шаблоны при монтировании
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await workflowApi.getTemplates();
      setTemplates(data);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      name: '',
      description: '',
      discipline_id: undefined,
      document_type_id: undefined,
    });
    setSteps([]);
    setActiveStep(0);
    setDialogOpen(true);
  };

  const handleEditTemplate = (template: WorkflowTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      description: template.description || '',
      discipline_id: template.discipline_id,
      document_type_id: template.document_type_id,
    });
    setSteps(template.steps || []);
    setActiveStep(0);
    setDialogOpen(true);
  };

  const handleSaveTemplate = async () => {
    try {
      if (editingTemplate) {
        // TODO: Добавить API для обновления шаблона
        alert('Обновление шаблонов пока не реализовано');
      } else {
        const template = await workflowApi.createTemplate(templateForm);
        
        // Добавляем шаги
        for (const step of steps) {
          await workflowApi.addStep(template.id, {
            step_order: step.step_order,
            step_name: step.step_name,
            approver_role: step.approver_role,
            approver_user_id: step.approver_user_id,
            is_required: step.is_required,
            escalation_hours: step.escalation_hours,
          });
        }
        
        alert('Шаблон создан успешно');
        loadTemplates();
      }
      setDialogOpen(false);
    } catch (error) {
      alert('Ошибка сохранения шаблона');
    }
  };

  const addStep = () => {
    const newStep: WorkflowStep = {
      id: 0,
      template_id: 0,
      step_order: steps.length + 1,
      step_name: '',
      approver_role: '',
      approver_user_id: undefined,
      is_required: true,
      escalation_hours: 72,
      created_at: '',
    };
    setSteps([...steps, newStep]);
  };

  const updateStep = (index: number, field: keyof WorkflowStep, value: any) => {
    const updatedSteps = [...steps];
    updatedSteps[index] = { ...updatedSteps[index], [field]: value };
    setSteps(updatedSteps);
  };

  const removeStep = (index: number) => {
    const updatedSteps = steps.filter((_, i) => i !== index);
    // Обновляем порядок шагов
    updatedSteps.forEach((step, i) => {
      step.step_order = i + 1;
    });
    setSteps(updatedSteps);
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;

    const updatedSteps = [...steps];
    [updatedSteps[index], updatedSteps[newIndex]] = [updatedSteps[newIndex], updatedSteps[index]];
    
    // Обновляем порядок
    updatedSteps.forEach((step, i) => {
      step.step_order = i + 1;
    });
    
    setSteps(updatedSteps);
  };

  const stepsContent = [
    {
      label: 'Основная информация',
      content: (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Название шаблона"
            value={templateForm.name}
            onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
            fullWidth
            required
          />
          <TextField
            label="Описание"
            value={templateForm.description}
            onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
            fullWidth
            multiline
            rows={3}
          />
          <FormControl fullWidth>
            <InputLabel>Дисциплина (опционально)</InputLabel>
            <Select
              value={templateForm.discipline_id || ''}
              onChange={(e) => setTemplateForm({ ...templateForm, discipline_id: e.target.value ? Number(e.target.value) : undefined })}
            >
              <MenuItem value="">Любая дисциплина</MenuItem>
              {/* TODO: Загрузить список дисциплин */}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Тип документа (опционально)</InputLabel>
            <Select
              value={templateForm.document_type_id || ''}
              onChange={(e) => setTemplateForm({ ...templateForm, document_type_id: e.target.value ? Number(e.target.value) : undefined })}
            >
              <MenuItem value="">Любой тип документа</MenuItem>
              {/* TODO: Загрузить список типов документов */}
            </Select>
          </FormControl>
        </Box>
      ),
    },
    {
      label: 'Шаги согласования',
      content: (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Шаги согласования</Typography>
            <Button startIcon={<AddIcon />} onClick={addStep} variant="outlined">
              Добавить шаг
            </Button>
          </Box>
          
          {steps.length === 0 ? (
            <Alert severity="info">
              Добавьте шаги согласования для создания маршрута
            </Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {steps.map((step, index) => (
                <Card key={index}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">Шаг {step.step_order}</Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Переместить вверх">
                          <IconButton 
                            size="small" 
                            onClick={() => moveStep(index, 'up')}
                            disabled={index === 0}
                          >
                            ↑
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Переместить вниз">
                          <IconButton 
                            size="small" 
                            onClick={() => moveStep(index, 'down')}
                            disabled={index === steps.length - 1}
                          >
                            ↓
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Удалить шаг">
                          <IconButton size="small" onClick={() => removeStep(index)} color="error">
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <TextField
                        label="Название шага"
                        value={step.step_name}
                        onChange={(e) => updateStep(index, 'step_name', e.target.value)}
                        fullWidth
                        required
                      />
                      
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                          label="Роль согласующего"
                          value={step.approver_role || ''}
                          onChange={(e) => updateStep(index, 'approver_role', e.target.value)}
                          sx={{ flex: 1 }}
                          placeholder="например: manager, engineer"
                        />
                        <TextField
                          label="ID пользователя"
                          type="number"
                          value={step.approver_user_id || ''}
                          onChange={(e) => updateStep(index, 'approver_user_id', e.target.value ? Number(e.target.value) : undefined)}
                          sx={{ flex: 1 }}
                          placeholder="конкретный пользователь"
                        />
                      </Box>
                      
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                          label="Часы до эскалации"
                          type="number"
                          value={step.escalation_hours}
                          onChange={(e) => updateStep(index, 'escalation_hours', Number(e.target.value))}
                          sx={{ flex: 1 }}
                          inputProps={{ min: 1, max: 168 }}
                        />
                        <FormControl sx={{ flex: 1 }}>
                          <InputLabel>Обязательность</InputLabel>
                          <Select
                            value={step.is_required}
                            onChange={(e) => updateStep(index, 'is_required', e.target.value)}
                          >
                            <MenuItem value={true}>Обязательный</MenuItem>
                            <MenuItem value={false}>Опциональный</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Шаблоны согласования</Typography>
        <Button
          startIcon={<AddIcon />}
          onClick={handleCreateTemplate}
          variant="contained"
        >
          Создать шаблон
        </Button>
      </Box>

      {loading ? (
        <Typography>Загрузка...</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Название</TableCell>
                <TableCell>Описание</TableCell>
                <TableCell>Дисциплина</TableCell>
                <TableCell>Тип документа</TableCell>
                <TableCell>Шагов</TableCell>
                <TableCell>Статус</TableCell>
                <TableCell>Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {template.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {template.description || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {template.discipline_id ? `ID: ${template.discipline_id}` : 'Любая'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {template.document_type_id ? `ID: ${template.document_type_id}` : 'Любой'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={`${template.steps?.length || 0} шагов`}
                      color="primary"
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={template.is_active ? 'Активен' : 'Неактивен'}
                      color={template.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Просмотр">
                        <IconButton size="small">
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Редактировать">
                        <IconButton size="small" onClick={() => handleEditTemplate(template)}>
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
      )}

      {/* Диалог создания/редактирования шаблона */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingTemplate ? 'Редактировать шаблон' : 'Создать шаблон согласования'}
        </DialogTitle>
        <DialogContent>
          <Stepper activeStep={activeStep} orientation="vertical">
            {stepsContent.map((step, index) => (
              <Step key={step.label}>
                <StepLabel>{step.label}</StepLabel>
                <StepContent>
                  {step.content}
                  <Box sx={{ mb: 2, mt: 2 }}>
                    <div>
                      <Button
                        variant="contained"
                        onClick={() => setActiveStep(index + 1)}
                        sx={{ mt: 1, mr: 1 }}
                        disabled={index === stepsContent.length - 1}
                      >
                        {index === stepsContent.length - 1 ? 'Завершить' : 'Продолжить'}
                      </Button>
                      <Button
                        disabled={index === 0}
                        onClick={() => setActiveStep(index - 1)}
                        sx={{ mt: 1, mr: 1 }}
                      >
                        Назад
                      </Button>
                    </div>
                  </Box>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button 
            onClick={handleSaveTemplate} 
            variant="contained"
            disabled={!templateForm.name || steps.length === 0}
          >
            {editingTemplate ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
});

export default WorkflowTemplatesPage;
