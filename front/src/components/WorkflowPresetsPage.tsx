import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Card,
  Tooltip,
  Tabs,
  Tab,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Autocomplete,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { observer } from 'mobx-react-lite';
import { workflowStore, type WorkflowPreset } from '../stores/WorkflowStore';
import ConfirmDialog from './ConfirmDialog';
import AppPagination from './AppPagination';
import WorkflowPresetsTableSkeleton from './workflow/WorkflowPresetsTableSkeleton';
import NotificationSnackbar from './NotificationSnackbar';
import { WorkflowPresetsFilters } from './workflow/WorkflowPresetsFilters';
import { useWorkflowPresetsFilters } from './workflow/hooks/useWorkflowPresetsFilters';
import WorkflowPresetDialog from './workflow/components/WorkflowPresetDialog';

const WorkflowPresetsPage: React.FC = observer(() => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Фильтры
  const {
    filterType,
    searchTerm,
    setFilterType,
    setSearchTerm,
    filteredPresets,
  } = useWorkflowPresetsFilters();
  
  // Dialog states
  const [createEditDialogOpen, setCreateEditDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null); // Режим не меняется при закрытии
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<WorkflowPreset | null>(null);
  const [tabIndex, setTabIndex] = useState(0);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_global: false
  });
  
  // Workflow data
  const [workflowSequences, setWorkflowSequences] = useState<any[]>([]);
  const [workflowRules, setWorkflowRules] = useState<any[]>([]);
  const [newSequence, setNewSequence] = useState({
    revision_description_id: null as number | null,
    revision_step_id: null as number | null,
    is_final: false,
    requires_transmittal: false,
    due_days: null as number | null
  });
  const [newRule, setNewRule] = useState({
    current_revision_description_id: null as number | null,
    current_revision_step_id: null as number | null,
    operator: 'equals' as 'equals' | 'not_equals',
    review_code_ids: [] as number[],
    next_revision_description_id: null as number | null,
    next_revision_step_id: null as number | null
  });

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  // Очищаем режим диалога только после полного закрытия диалога
  useEffect(() => {
    if (!createEditDialogOpen) {
      // Небольшая задержка, чтобы диалог успел закрыться (анимация)
      const timer = setTimeout(() => {
        setDialogMode(null);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [createEditDialogOpen]);

  const loadData = async () => {
    try {
      // Load data in parallel, store manages caching itself
      await Promise.all([
        workflowStore.loadPresets(),
        workflowStore.loadReferences()
      ]);
    } catch (err: any) {
      console.error(t('workflows.errors.load_data'), err);
    }
  };

  // Dialog handlers
  const handleCreateOpen = () => {
    setTabIndex(0);
    setDialogMode('create');
    setCreateEditDialogOpen(true);
  };

  const handleEditOpen = (preset: WorkflowPreset) => {
    setSelectedPreset(preset);
    setTabIndex(0);
    setDialogMode('edit');
    setCreateEditDialogOpen(true);
  };

  const handleViewOpen = (preset: WorkflowPreset) => {
    setSelectedPreset(preset);
    setViewDialogOpen(true);
  };

  const handleDeleteOpen = (preset: WorkflowPreset) => {
    setSelectedPreset(preset);
    setDeleteDialogOpen(true);
  };

  const handleCloseDialogs = () => {
    setCreateEditDialogOpen(false);
    setViewDialogOpen(false);
    setDeleteDialogOpen(false);
    setSelectedPreset(null);
    setTabIndex(0);
  };

  // CRUD operations
  const onCreatePreset = async (payload: any) => {
    await workflowStore.createPreset(payload);
    await workflowStore.loadPresets(true);
    setSuccessMessage(t('workflows.messages.preset_created'));
  };

  const onUpdatePreset = async (payload: any) => {
    if (!selectedPreset) return;
    await workflowStore.updatePreset(selectedPreset.id, payload);
    await workflowStore.loadPresets(true);
    setSuccessMessage(t('workflows.messages.preset_updated'));
  };

  const handleDelete = async () => {
    if (!selectedPreset) return;
    
    try {
      await workflowStore.deletePreset(selectedPreset.id);
      // Принудительно обновляем список пресетов для отображения изменений
      await workflowStore.loadPresets(true);
      setSuccessMessage(t('workflows.messages.preset_deleted'));
      handleCloseDialogs();
    } catch (err: any) {
      console.error(t('workflows.errors.delete_preset'), err);
    }
  };

  // Workflow sequence handlers
  const addSequence = () => {
    if (!newSequence.revision_description_id || !newSequence.revision_step_id) return;
    
    const sequence = {
      id: Date.now(),
      revision_description_id: newSequence.revision_description_id,
      revision_step_id: newSequence.revision_step_id,
      is_final: newSequence.is_final,
      requires_transmittal: newSequence.requires_transmittal,
      due_days: newSequence.due_days,
      revision_description: workflowStore.revisionDescriptions.find(rd => rd.id === newSequence.revision_description_id),
      revision_step: workflowStore.revisionSteps.find(rs => rs.id === newSequence.revision_step_id)
    };
    
    setWorkflowSequences(prev => [...prev, sequence]);
    setNewSequence({
      revision_description_id: null,
      revision_step_id: null,
      is_final: false,
      requires_transmittal: false,
      due_days: null
    });
  };

  const removeSequence = (index: number) => {
    setWorkflowSequences(prev => {
      const newSequences = prev.filter((_, i) => i !== index);
      // Если удалили последнюю последовательность и находимся на вкладке правил, переключаемся на вкладку последовательностей
      if (newSequences.length === 0 && tabIndex === 2) {
        setTabIndex(1);
      }
      return newSequences;
    });
  };


  // Получить доступные последовательности для правил
  const getAvailableSequences = () => {
    return workflowSequences.map(seq => ({
      id: seq.id,
      revision_description_id: seq.revision_description_id,
      revision_step_id: seq.revision_step_id,
      revision_description: seq.revision_description,
      revision_step: seq.revision_step,
      label: `${seq.revision_description?.code || 'U'} - ${seq.revision_step?.code || 'TCO'}`
    }));
  };


  // Workflow rules handlers
  const addRule = () => {
    if (!newRule.current_revision_description_id || newRule.review_code_ids.length === 0) return;
    
    const rule = {
      id: Date.now(),
      current_revision_description_id: newRule.current_revision_description_id,
      current_revision_step_id: newRule.current_revision_step_id,
      operator: newRule.operator,
      review_code_id: newRule.review_code_ids.length === 1 ? newRule.review_code_ids[0] : null, // Для API совместимости
      review_code_list: newRule.review_code_ids.length > 1 ? JSON.stringify(newRule.review_code_ids) : null, // JSON для множественных кодов
      review_code_ids: newRule.review_code_ids, // Для отображения
      next_revision_description_id: newRule.next_revision_description_id,
      next_revision_step_id: newRule.next_revision_step_id,
      current_revision_description: workflowStore.revisionDescriptions.find(rd => rd.id === newRule.current_revision_description_id),
      current_revision_step: workflowStore.revisionSteps.find(rs => rs.id === newRule.current_revision_step_id),
      review_codes: workflowStore.reviewCodes.filter(rc => newRule.review_code_ids.includes(rc.id)),
      next_revision_description: newRule.next_revision_description_id ? workflowStore.revisionDescriptions.find(rd => rd.id === newRule.next_revision_description_id) : null,
      next_revision_step: newRule.next_revision_step_id ? workflowStore.revisionSteps.find(rs => rs.id === newRule.next_revision_step_id) : null
    };
    
    setWorkflowRules(prev => [...prev, rule]);
    setNewRule({
      current_revision_description_id: null,
      current_revision_step_id: null,
      operator: 'equals',
      review_code_ids: [],
      next_revision_description_id: null,
      next_revision_step_id: null,
    });
  };

  const removeRule = (index: number) => {
    setWorkflowRules(prev => prev.filter((_, i) => i !== index));
  };


  // Notification states
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationSeverity, setNotificationSeverity] = useState<'success' | 'error'>('success');

  useEffect(() => {
    if (successMessage) {
      setNotificationMessage(successMessage);
      setNotificationSeverity('success');
      setNotificationOpen(true);
      setSuccessMessage(null);
    }
  }, [successMessage]);

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
        <Typography variant={isMobile ? "h5" : "h4"} component="h1">
          {t('workflows.title')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateOpen}
          sx={{ backgroundColor: '#1976d2', width: isMobile ? '100%' : 'auto' }}
        >
          {t('workflows.create_preset')}
        </Button>
      </Box>

      {/* Filters */}
      <WorkflowPresetsFilters
        searchTerm={searchTerm}
        filterType={filterType}
        onSearchChange={setSearchTerm}
        onTypeChange={setFilterType}
      />

      {/* Контейнер таблицы */}
      <Box sx={{ flex: 1, minHeight: 0 }}>
        {workflowStore.isLoading ? (
          <WorkflowPresetsTableSkeleton />
        ) : filteredPresets.length === 0 ? (
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
                {t('workflows.table.no_presets')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('workflows.no_presets_hint')}
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
                      width: '25%',
                      minWidth: '250px'
                    }}>{t('workflows.table.name')}</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      fontSize: '0.875rem',
                      whiteSpace: 'nowrap',
                      width: '35%',
                      minWidth: '350px'
                    }}>{t('workflows.table.description')}</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      fontSize: '0.875rem',
                      whiteSpace: 'nowrap',
                      width: '15%',
                      minWidth: '150px'
                    }}>{t('workflows.table.type')}</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      fontSize: '0.875rem',
                      whiteSpace: 'nowrap',
                      width: '15%',
                      minWidth: '150px'
                    }}>{t('workflows.table.created')}</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      fontSize: '0.875rem',
                      whiteSpace: 'nowrap',
                      width: '10%',
                      minWidth: '120px'
                    }}>{t('workflows.table.actions')}</TableCell>
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
                  {filteredPresets.map((preset) => (
                    <TableRow 
                      key={preset.id} 
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
                        width: '25%',
                        minWidth: '250px'
                      }}>
                        <Typography variant="body2" sx={{ 
                          fontWeight: 'bold',
                          fontSize: '0.875rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {preset.name}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ 
                        fontSize: '0.875rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        width: '35%',
                        minWidth: '350px'
                      }}>
                        <Typography variant="body2" sx={{ 
                          fontSize: '0.875rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {preset.description || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ 
                        fontSize: '0.875rem',
                        width: '15%',
                        minWidth: '150px'
                      }}>
                        <Chip 
                          label={preset.is_global ? t('workflows.types.global') : t('workflows.types.user')} 
                          color={preset.is_global ? 'primary' : 'secondary'}
                          size="small"
                          sx={{ fontSize: '0.75rem', height: '24px' }}
                        />
                      </TableCell>
                      <TableCell sx={{ 
                        fontSize: '0.875rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        width: '15%',
                        minWidth: '150px'
                      }}>
                        <Typography variant="body2" sx={{ 
                          fontSize: '0.875rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {new Date(preset.created_at).toLocaleDateString('ru-RU')}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ 
                        fontSize: '0.875rem',
                        width: '10%',
                        minWidth: '120px'
                      }}>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title={t('workflows.actions.view')}>
                            <IconButton size="small" onClick={() => handleViewOpen(preset)} sx={{ padding: '4px' }}>
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t('workflows.actions.edit')}>
                            <IconButton size="small" onClick={() => handleEditOpen(preset)} sx={{ padding: '4px' }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t('workflows.actions.delete')}>
                            <span>
                              <IconButton 
                                size="small" 
                                color="error" 
                                onClick={() => handleDeleteOpen(preset)}
                                disabled={preset.is_global}
                                sx={{ padding: '4px' }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </span>
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

      {!isMobile && !workflowStore.isLoading && (
        <AppPagination
          count={filteredPresets.length}
          page={1}
          onPageChange={() => {}}
          simple
          rowsPerPage={13}
          insetLeft={240}
          align="right"
        />
      )}

      {/* Create/Edit Dialog */}
      <WorkflowPresetDialog
        open={!!createEditDialogOpen && !!dialogMode}
        mode={(dialogMode || 'create') as 'create' | 'edit'}
        initialPreset={dialogMode === 'edit' ? selectedPreset : null}
        onClose={handleCloseDialogs}
        onCreate={onCreatePreset}
        onUpdate={onUpdatePreset}
      />

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onClose={handleCloseDialogs} maxWidth="md" fullWidth>
        <DialogTitle>{t('workflows.dialogs.view_title')}</DialogTitle>
        <DialogContent>
          {selectedPreset && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                {selectedPreset.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {selectedPreset.description}
              </Typography>
              
              {/* Sequences */}
              {selectedPreset.sequences && selectedPreset.sequences.length > 0 ? (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    {t('workflows.sections.sequences_title')}
                  </Typography>
                  {selectedPreset.sequences.map((seq, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                      <Typography variant="body2" sx={{ minWidth: '20px' }}>
                        {index + 1}.
                      </Typography>
                      <Chip 
                        label={seq.revision_description?.code || 'U'} 
                        color="primary" 
                        size="small" 
                      />
                      <Typography variant="body2">-</Typography>
                      <Chip 
                        label={seq.revision_step?.code || 'TCO'} 
                        color="secondary" 
                        size="small" 
                      />
                      {seq.is_final && (
                        <Chip 
                          label={t('workflows.fields.final')} 
                          color="success" 
                          size="small" 
                        />
                      )}
                      {seq.requires_transmittal && (
                        <Chip 
                          label={t('workflows.fields.requires_transmittal')} 
                          color="warning" 
                          size="small" 
                        />
                      )}
                      {seq.due_days && (
                        <Chip 
                          label={`${seq.due_days} ${t('workflows.fields.days')}`} 
                          color="info" 
                          size="small" 
                        />
                      )}
                    </Box>
                  ))}
                </Box>
              ) : (
                <Card sx={{ p: 2, mb: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('workflows.messages.no_sequences')}
                  </Typography>
                </Card>
              )}
              
              {/* Rules */}
              {selectedPreset.rules && selectedPreset.rules.length > 0 ? (
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    {t('workflows.sections.rules_title')}
                  </Typography>
                  {selectedPreset.rules.map((rule, index) => (
                    <Box key={index} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1, mb: 1 }}>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>{t('workflows.conditions.if')}</strong> {rule.current_revision_description?.code}-{rule.current_revision_step?.code} 
                        {rule.review_codes && rule.review_codes.length > 0 && ` ${rule.operator === 'equals' ? t('workflows.operators.equals') : t('workflows.operators.not_equals')} ${rule.review_codes.map((rc: any) => rc.code).join(', ')}`}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>{t('workflows.conditions.then')}</strong> {rule.next_revision_description_id ? `${rule.next_revision_description?.code}-${rule.next_revision_step?.code}` : `+1 ${t('workflows.messages.increment_number_short')}`}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Card sx={{ p: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('workflows.messages.add_sequences_first')}
                  </Typography>
                </Card>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs}>{t('workflows.actions.close')}</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title={t('workflows.dialogs.delete_title')}
        content={t('workflows.dialogs.delete_message', { name: selectedPreset?.name })}
        confirmText={t('workflows.actions.delete')}
        cancelText={t('workflows.actions.cancel')}
        onConfirm={handleDelete}
        onClose={handleCloseDialogs}
      />

      {/* Success/Error Notification */}
      <NotificationSnackbar
        open={notificationOpen}
        message={notificationMessage}
        severity={notificationSeverity}
        onClose={() => setNotificationOpen(false)}
      />
    </Box>
  );
});

export default WorkflowPresetsPage;

