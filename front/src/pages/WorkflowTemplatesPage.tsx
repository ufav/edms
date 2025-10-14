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
  useTheme,
  useMediaQuery,
  Pagination,
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
import AppPagination from '../components/AppPagination';

const WorkflowTemplatesPage = observer(() => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
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
    <Box sx={{ 
      width: '100%', 
      minWidth: 0, 
      pt: 3, // padding только сверху
      px: 3, // padding только по бокам
      pb: 0, // убираем padding снизу
      height: !isMobile ? 'calc(100vh - 117px)' : '100vh', // Всегда вычитаем высоту пагинации для десктопа
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden', // Убираем прокрутку страницы
    }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'flex-start' : 'center', 
        mb: 3,
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 2 : 0
      }}>
        <Typography variant={isMobile ? "h5" : "h4"}>Шаблоны согласования</Typography>
        <Button
          startIcon={<AddIcon />}
          onClick={handleCreateTemplate}
          variant="contained"
          sx={{ width: isMobile ? '100%' : 'auto' }}
        >
          Создать шаблон
        </Button>
      </Box>

      {/* Контейнер таблицы */}
      <Box sx={{ flex: 1, minHeight: 0 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <Typography>Загрузка...</Typography>
          </Box>
        ) : templates.length === 0 ? (
          <TableContainer component={Paper} sx={{ 
            boxShadow: 2, 
            width: '100%', 
            minWidth: '100%', 
            flex: 1,
            minHeight: 0,
            height: '100%',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            borderRadius: 0,
          }}>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="text.secondary">
                {t('workflows.no_templates')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('workflows.no_templates_hint')}
              </Typography>
            </Box>
          </TableContainer>
        ) : (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%',
            minHeight: 0,
            marginBottom: 0,
            paddingBottom: 0
          }}>
            {/* Заголовок таблицы - зафиксирован */}
            <Box sx={{ 
              borderBottom: '1px solid #f0f0f0',
              backgroundColor: '#f5f5f5',
              boxShadow: 2,
            }}>
              <Table sx={{ tableLayout: 'fixed', width: '100%', minWidth: '100%' }}>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5', '& .MuiTableCell-root': { padding: '8px 16px' } }}>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      fontSize: '0.875rem',
                      whiteSpace: 'nowrap',
                      width: '20%',
                      minWidth: '200px'
                    }}>Название</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      fontSize: '0.875rem',
                      whiteSpace: 'nowrap',
                      width: '20%',
                      minWidth: '200px'
                    }}>Описание</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      fontSize: '0.875rem',
                      whiteSpace: 'nowrap',
                      width: '12%',
                      minWidth: '120px'
                    }}>Дисциплина</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      fontSize: '0.875rem',
                      whiteSpace: 'nowrap',
                      width: '12%',
                      minWidth: '120px'
                    }}>Тип документа</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      fontSize: '0.875rem',
                      whiteSpace: 'nowrap',
                      width: '10%',
                      minWidth: '100px'
                    }}>Шагов</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      fontSize: '0.875rem',
                      whiteSpace: 'nowrap',
                      width: '10%',
                      minWidth: '100px'
                    }}>Статус</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      fontSize: '0.875rem',
                      whiteSpace: 'nowrap',
                      width: '16%',
                      minWidth: '160px'
                    }}>Действия</TableCell>
                  </TableRow>
                </TableHead>
              </Table>
            </Box>
            
            {/* Тело таблицы - скроллируемое */}
            <TableContainer component={Paper} sx={{ 
              flex: 1,
              minHeight: 0,
              maxHeight: 'calc(48px + 13 * 48px)', // Ограничиваем высоту 13 строками (заголовок + 13 строк)
              overflow: 'auto',
              borderRadius: 0,
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                background: '#f1f1f1',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb': {
                background: '#c1c1c1',
                borderRadius: '4px',
                '&:hover': {
                  background: '#a8a8a8',
                },
              },
            }}>
              <Table sx={{ tableLayout: 'fixed', width: '100%', minWidth: '100%' }}>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow 
                      key={template.id} 
                      sx={{ 
                        '& .MuiTableCell-root': { padding: '8px 16px' },
                        '&:hover': {
                          backgroundColor: '#f5f5f5',
                        },
                      }}
                    >
                      <TableCell sx={{ 
                        fontSize: '0.875rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        width: '20%',
                        minWidth: '200px'
                      }}>
                        <Typography variant="body2" sx={{ 
                          fontWeight: 'bold',
                          fontSize: '0.875rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {template.name}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ 
                        fontSize: '0.875rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        width: '20%',
                        minWidth: '200px'
                      }}>
                        <Typography variant="body2" sx={{ 
                          fontSize: '0.875rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {template.description || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ 
                        fontSize: '0.875rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        width: '12%',
                        minWidth: '120px'
                      }}>
                        <Typography variant="body2" sx={{ 
                          fontSize: '0.875rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {template.discipline_id ? `ID: ${template.discipline_id}` : 'Любая'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ 
                        fontSize: '0.875rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        width: '12%',
                        minWidth: '120px'
                      }}>
                        <Typography variant="body2" sx={{ 
                          fontSize: '0.875rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {template.document_type_id ? `ID: ${template.document_type_id}` : 'Любой'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ 
                        fontSize: '0.875rem',
                        width: '10%',
                        minWidth: '100px'
                      }}>
                        <Chip 
                          label={`${template.steps?.length || 0} шагов`}
                          color="primary"
                          size="small"
                          sx={{ fontSize: '0.75rem', height: '24px' }}
                        />
                      </TableCell>
                      <TableCell sx={{ 
                        fontSize: '0.875rem',
                        width: '10%',
                        minWidth: '100px'
                      }}>
                        <Chip 
                          label={template.is_active ? 'Активен' : 'Неактивен'}
                          color={template.is_active ? 'success' : 'default'}
                          size="small"
                          sx={{ fontSize: '0.75rem', height: '24px' }}
                        />
                      </TableCell>
                      <TableCell sx={{ 
                        fontSize: '0.875rem',
                        width: '16%',
                        minWidth: '160px'
                      }}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Просмотр">
                            <IconButton size="small" sx={{ padding: '4px' }}>
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Редактировать">
                            <IconButton size="small" onClick={() => handleEditTemplate(template)} sx={{ padding: '4px' }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Удалить">
                            <IconButton size="small" color="error" sx={{ padding: '4px' }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Box>

      {!loading && (
        <AppPagination
          count={templates.length}
          page={1}
          onPageChange={() => {}}
          simple
          rowsPerPage={25}
          insetLeft={isMobile ? 0 : 240}
          align="right"
        />
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
