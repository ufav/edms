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
  Autocomplete
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
import ConfirmDialog from '../components/ConfirmDialog';
import WorkflowPresetsTableSkeleton from '../components/workflow/WorkflowPresetsTableSkeleton';
import NotificationSnackbar from '../components/NotificationSnackbar';
import { WorkflowPresetsFilters } from '../components/workflow/WorkflowPresetsFilters';
import { useWorkflowPresetsFilters } from '../components/workflow/hooks/useWorkflowPresetsFilters';

const WorkflowPresetsPage: React.FC = observer(() => {
  const { t } = useTranslation();
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
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
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
    requires_transmittal: false
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
    setFormData({ name: '', description: '', is_global: false });
    setWorkflowSequences([]);
    setWorkflowRules([]);
    setNewSequence({
      revision_description_id: null,
      revision_step_id: null,
      is_final: false,
      requires_transmittal: false
    });
    setNewRule({
      current_revision_description_id: null,
      current_revision_step_id: null,
      operator: 'equals',
      review_code_ids: [],
      next_revision_description_id: null,
      next_revision_step_id: null,
    });
    setTabIndex(0);
    setCreateDialogOpen(true);
  };

  const handleEditOpen = (preset: WorkflowPreset) => {
    setSelectedPreset(preset);
    setFormData({
      name: preset.name,
      description: preset.description || '',
      is_global: preset.is_global
    });
    setWorkflowSequences(preset.sequences || []);
    
    // Преобразуем правила из API формата в формат интерфейса
    const transformedRules = (preset.rules || []).map(rule => ({
      id: rule.id,
      current_revision_description_id: rule.current_revision?.description?.id || rule.current_revision_description_id,
      current_revision_step_id: rule.current_revision?.step?.id || rule.current_revision_step_id,
      operator: rule.operator || 'equals',
      review_code_id: rule.review_code?.id || rule.review_code_id,
      review_code_list: rule.review_code_list,
      review_code_ids: rule.review_code_list ? JSON.parse(rule.review_code_list) : (rule.review_code?.id ? [rule.review_code.id] : []),
      next_revision_description_id: rule.next_revision?.description?.id || rule.next_revision_description_id,
      next_revision_step_id: rule.next_revision?.step?.id || rule.next_revision_step_id,
      current_revision_description: rule.current_revision?.description,
      current_revision_step: rule.current_revision?.step,
      review_codes: rule.review_code_list ? 
        JSON.parse(rule.review_code_list).map((id: number) => workflowStore.reviewCodes.find(rc => rc.id === id)).filter(Boolean) :
        (rule.review_code ? [rule.review_code] : []),
      next_revision_description: rule.next_revision?.description,
      next_revision_step: rule.next_revision?.step,
      action_on_fail: rule.action_on_fail
    }));
    
    setWorkflowRules(transformedRules);
    
    // Сбрасываем состояние newRule для редактирования
    setNewRule({
      current_revision_description_id: null,
      current_revision_step_id: null,
      operator: 'equals',
      review_code_ids: [],
      next_revision_description_id: null,
      next_revision_step_id: null
    });
    
    // Сбрасываем tabIndex на первую вкладку
    setTabIndex(0);
    
    setEditDialogOpen(true);
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
    setCreateDialogOpen(false);
    setEditDialogOpen(false);
    setViewDialogOpen(false);
    setDeleteDialogOpen(false);
    setSelectedPreset(null);
    setTabIndex(0);
    
    // Очищаем данные формы
    setFormData({ name: '', description: '', is_global: false });
    setWorkflowSequences([]);
    setWorkflowRules([]);
    setNewSequence({
      revision_description_id: null,
      revision_step_id: null,
      is_final: false,
      requires_transmittal: false
    });
    setNewRule({
      current_revision_description_id: null,
      current_revision_step_id: null,
      operator: 'equals',
      review_code_ids: [],
      next_revision_description_id: null,
      next_revision_step_id: null,
    });
  };

  // CRUD operations
  const [isCreating, setIsCreating] = useState(false);
  
  const handleCreate = async () => {
    if (isCreating) {
      return;
    }
    
    try {
      setIsCreating(true);
      
      const presetData = {
        ...formData,
        sequences: workflowSequences.map((seq) => ({
          revision_description_id: seq.revision_description_id,
          revision_step_id: seq.revision_step_id,
          is_final: seq.is_final,
          requires_transmittal: seq.requires_transmittal
        })),
        rules: workflowRules.map(rule => ({
          current_revision_description_id: rule.current_revision_description_id,
          current_revision_step_id: rule.current_revision_step_id,
          operator: rule.operator,
          review_code_id: rule.review_code_id,
          review_code_list: rule.review_code_list,
          next_revision_description_id: rule.next_revision_description_id,
          next_revision_step_id: rule.next_revision_step_id,
          action_on_fail: rule.action_on_fail || 'increment_number',
          priority: 100
        }))
      };
      
      await workflowStore.createPreset(presetData);
      // Принудительно обновляем список пресетов для отображения изменений
      await workflowStore.loadPresets(true);
      
      setSuccessMessage(t('workflows.messages.preset_created'));
      handleCloseDialogs();
    } catch (err: any) {
      console.error(t('workflows.errors.create_preset'), err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedPreset) return;
    
    try {
      const presetData = {
        ...formData,
        sequences: workflowSequences.map((seq) => ({
          revision_description_id: seq.revision_description_id,
          revision_step_id: seq.revision_step_id,
          is_final: seq.is_final,
          requires_transmittal: seq.requires_transmittal
        })),
        rules: workflowRules.map(rule => ({
          current_revision_description_id: rule.current_revision_description_id,
          current_revision_step_id: rule.current_revision_step_id,
          operator: rule.operator,
          review_code_id: rule.review_code_id,
          review_code_list: rule.review_code_list,
          next_revision_description_id: rule.next_revision_description_id,
          next_revision_step_id: rule.next_revision_step_id,
          action_on_fail: rule.action_on_fail || 'increment_number',
          priority: 100
        }))
      };
      
      await workflowStore.updatePreset(selectedPreset.id, presetData);
      // Принудительно обновляем список пресетов для отображения изменений
      await workflowStore.loadPresets(true);
      setSuccessMessage(t('workflows.messages.preset_updated'));
      handleCloseDialogs();
    } catch (err: any) {
      console.error(t('workflows.errors.update_preset'), err);
    }
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
      revision_description: workflowStore.revisionDescriptions.find(rd => rd.id === newSequence.revision_description_id),
      revision_step: workflowStore.revisionSteps.find(rs => rs.id === newSequence.revision_step_id)
    };
    
    setWorkflowSequences(prev => [...prev, sequence]);
    setNewSequence({
      revision_description_id: null,
      revision_step_id: null,
      is_final: false,
      requires_transmittal: false
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
    <Box sx={{ width: '100%', p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          {t('workflows.title')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateOpen}
          sx={{ backgroundColor: '#1976d2' }}
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

      {/* Presets Table */}
      {workflowStore.isLoading ? (
        <WorkflowPresetsTableSkeleton />
      ) : (
        <TableContainer component={Paper} sx={{ boxShadow: 2, border: '1px solid #e0e0e0' }}>
          <Table sx={{ tableLayout: 'fixed', width: '100%', minWidth: '100%' }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ width: '25%', fontWeight: 'bold' }}>{t('workflows.table.name')}</TableCell>
                <TableCell sx={{ width: '35%', fontWeight: 'bold' }}>{t('workflows.table.description')}</TableCell>
                <TableCell sx={{ width: '15%', fontWeight: 'bold' }}>{t('workflows.table.type')}</TableCell>
                <TableCell sx={{ width: '15%', fontWeight: 'bold' }}>{t('workflows.table.created')}</TableCell>
                <TableCell sx={{ width: '10%', fontWeight: 'bold' }}>{t('workflows.table.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPresets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('workflows.table.no_presets')}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredPresets.map((preset) => (
              <TableRow key={preset.id} hover>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {preset.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {preset.description || '—'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={preset.is_global ? t('workflows.types.global') : t('workflows.types.user')} 
                    color={preset.is_global ? 'primary' : 'secondary'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {new Date(preset.created_at).toLocaleDateString('ru-RU')}
                  </Typography>
                </TableCell>
                <TableCell sx={{ minWidth: '120px' }}>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title={t('workflows.actions.view')}>
                      <IconButton size="small" onClick={() => handleViewOpen(preset)} sx={{ p: 0.5 }}>
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('workflows.actions.edit')}>
                      <IconButton size="small" onClick={() => handleEditOpen(preset)} sx={{ p: 0.5 }}>
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
                          sx={{ p: 0.5 }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      )}

      {/* Create/Edit Dialog */}
      <Dialog 
        open={createDialogOpen || editDialogOpen} 
        onClose={handleCloseDialogs}
        maxWidth="lg"
        fullWidth
        scroll="paper"
        PaperProps={{ 
          sx: { 
            minWidth: 1000,
            '&:focus': {
              outline: 'none',
            },
            '&:focus-visible': {
              outline: 'none',
            }
          } 
        }}
      >
        <DialogTitle>
          {createDialogOpen ? t('workflows.dialogs.create_title') : t('workflows.dialogs.edit_title')}
        </DialogTitle>
        <DialogContent sx={{ 
          height: 700,
          p: 0,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Fixed Tabs header */}
          <Box sx={{ 
            position: 'sticky',
            top: 0,
            zIndex: 1,
            backgroundColor: 'background.paper',
            borderBottom: 1,
            borderColor: 'divider',
            px: 3,
            pt: 3
          }}>
            <Tabs
              value={tabIndex}
              onChange={(_, v) => setTabIndex(v)}
              sx={{ 
                '& .MuiTab-root': {
                  '&:focus': {
                    outline: 'none !important',
                    boxShadow: 'none !important',
                  },
                  '&.Mui-selected': {
                    outline: 'none !important',
                    boxShadow: 'none !important',
                  },
                  '&:focus-visible': {
                    outline: 'none !important',
                    boxShadow: 'none !important',
                  }
                }
              }}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab label={t('workflows.tabs.main')} />
              <Tab label={t('workflows.tabs.sequences')} />
              <Tab 
                label={t('workflows.tabs.rules')} 
                disabled={workflowSequences.length === 0}
              />
            </Tabs>
          </Box>

          {/* Scrollable content area */}
          <Box sx={{ 
            flex: 1,
            overflow: 'auto',
            p: 3,
            pt: 2
          }}>
            {/* Tab 0: Основное */}
            {tabIndex === 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label={t('workflows.fields.name')}
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    fullWidth
                    required
                    variant="standard"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.is_global}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_global: e.target.checked }))}
                      />
                    }
                    label={t('workflows.fields.global_preset')}
                  />
                </Box>
                
                <TextField
                  label={t('workflows.fields.description')}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  fullWidth
                  multiline
                  rows={4}
                  variant="standard"
                />
              </Box>
            )}

            {/* Tab 1: Последовательности */}
            {tabIndex === 1 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Typography variant="h6" gutterBottom>
                  {t('workflows.sections.sequences_title')}
                </Typography>
                
                {/* Add New Sequence */}
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    {t('workflows.sections.add_sequence')}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
                    <Autocomplete
                      size="small"
                      sx={{ width: '25%' }}
                      options={workflowStore.revisionDescriptions}
                      getOptionLabel={(option) => `${option.code} - ${option.description}`}
                      value={workflowStore.revisionDescriptions.find(desc => desc.id === newSequence.revision_description_id) || null}
                      onChange={(_, newValue) => setNewSequence(prev => ({
                        ...prev,
                        revision_description_id: newValue?.id || null
                      }))}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          variant="standard"
                          label={t('workflows.fields.revision_description')}
                        />
                      )}
                      ListboxProps={{
                        style: {
                          maxHeight: '200px' // Примерно 8 строк по 25px
                        }
                      }}
                    />
                    
                    <FormControl size="small" variant="standard" sx={{ width: '25%' }}>
                      <InputLabel>{t('workflows.fields.revision_step')}</InputLabel>
                      <Select
                        value={newSequence.revision_step_id || ''}
                        onChange={(e) => setNewSequence(prev => ({
                          ...prev,
                          revision_step_id: e.target.value as number
                        }))}
                        label={t('workflows.fields.revision_step')}
                      >
                        {workflowStore.revisionSteps.map((step) => (
                          <MenuItem key={step.id} value={step.id}>
                            {step.code} - {step.description}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={newSequence.is_final}
                          onChange={(e) => setNewSequence(prev => ({
                            ...prev,
                            is_final: e.target.checked
                          }))}
                        />
                      }
                      label={t('workflows.fields.final')}
                    />
                    
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={newSequence.requires_transmittal}
                          onChange={(e) => setNewSequence(prev => ({
                            ...prev,
                            requires_transmittal: e.target.checked
                          }))}
                        />
                      }
                      label={t('workflows.fields.requires_transmittal')}
                    />
                    
                    <Button
                      variant="contained"
                      size="small"
                      onClick={addSequence}
                      disabled={!newSequence.revision_description_id || !newSequence.revision_step_id}
                    >
                      {t('workflows.actions.add')}
                    </Button>
                  </Box>
                </Box>

                {/* Existing Sequences - Vertical Stepper */}
                {workflowSequences.length > 0 && (
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>
                      {t('workflows.sections.added_sequences')}
                    </Typography>
                    <Stepper orientation="vertical" sx={{ mt: 2 }}>
                      {workflowSequences.map((seq, index) => (
                        <Step key={index} active={true} completed={false}>
                          <StepLabel>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                            </Box>
                          </StepLabel>
                          <StepContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Typography variant="body2" color="text.secondary">
                                {seq.revision_description?.description} - {seq.revision_step?.description}
                              </Typography>
                              <IconButton 
                                size="small" 
                                onClick={() => removeSequence(index)}
                                color="error"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </StepContent>
                        </Step>
                      ))}
                    </Stepper>
                  </Box>
                )}
              </Box>
            )}

            {/* Tab 2: Правила */}
            {tabIndex === 2 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Typography variant="h6" gutterBottom>
                  {t('workflows.sections.rules_title')}
                </Typography>
                
                {workflowSequences.length === 0 ? (
                  <Box sx={{ p: 3, textAlign: 'center', backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('workflows.messages.add_sequences_first')}
                    </Typography>
                  </Box>
                ) : (
                  <>
                    {/* Add New Rule */}
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        {t('workflows.sections.add_rule')}
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
                          <Typography variant="body2" sx={{ minWidth: '60px', textAlign: 'left', alignSelf: 'flex-end', mb: 0.5 }}>
                            {t('workflows.conditions.if')}:
                          </Typography>
                          <FormControl size="small" variant="standard" sx={{ width: '25%' }}>
                            <InputLabel>{t('workflows.fields.sequence')}</InputLabel>
                            <Select
                              value={newRule.current_revision_description_id || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (!value) return;
                                
                                const selectedSeq = getAvailableSequences().find(seq => 
                                  seq.revision_description_id === Number(value)
                                );
                                if (selectedSeq) {
                                  setNewRule(prev => ({
                                    ...prev,
                                    current_revision_description_id: selectedSeq.revision_description_id,
                                    current_revision_step_id: selectedSeq.revision_step_id
                                  }));
                                }
                              }}
                              label={t('workflows.fields.sequence')}
                            >
                              {getAvailableSequences().map((seq) => (
                                <MenuItem key={seq.id} value={seq.revision_description_id || ''}>
                                  {seq.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          
                          <FormControl size="small" variant="standard" sx={{ minWidth: 100 }}>
                            <InputLabel>{t('workflows.fields.operator')}</InputLabel>
                            <Select
                              value={newRule.operator}
                              onChange={(e) => setNewRule(prev => ({
                                ...prev,
                                operator: e.target.value as 'equals' | 'not_equals'
                              }))}
                              label={t('workflows.fields.operator')}
                            >
                              <MenuItem value="equals">{t('workflows.operators.equals')}</MenuItem>
                              <MenuItem value="not_equals">{t('workflows.operators.not_equals')}</MenuItem>
                            </Select>
                          </FormControl>
                          
                          <Autocomplete
                            size="small"
                            sx={{ width: '50%' }}
                            multiple
                            options={workflowStore.reviewCodes}
                            getOptionLabel={(option) => `${option.code} - ${option.description}`}
                            value={workflowStore.reviewCodes.filter(rc => newRule.review_code_ids.includes(rc.id))}
                            onChange={(_, newValue) => {
                              setNewRule(prev => ({
                                ...prev,
                                review_code_ids: newValue.map(rc => rc.id)
                              }));
                            }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                variant="standard"
                                label={t('workflows.fields.review_codes')}
                              />
                            )}
                            renderTags={(value, getTagProps) =>
                              value.map((option, index) => (
                                <Chip
                                  {...getTagProps({ index })}
                                  key={option.id}
                                  label={option.code}
                                  size="small"
                                />
                              ))
                            }
                          />
                        </Box>
                        
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
                          <Typography variant="body2" sx={{ minWidth: '60px', textAlign: 'left', alignSelf: 'flex-end', mb: 0.5 }}>
                            {t('workflows.conditions.then')}:
                          </Typography>
                          <FormControl size="small" variant="standard" sx={{ width: '25%' }}>
                            <InputLabel>{t('workflows.fields.sequence')}</InputLabel>
                            <Select
                              value={newRule.next_revision_description_id || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (!value || value === '') {
                                  setNewRule(prev => ({
                                    ...prev,
                                    next_revision_description_id: null,
                                    next_revision_step_id: null
                                  }));
                                } else {
                                  const selectedSeq = getAvailableSequences().find(seq => 
                                    seq.revision_description_id === Number(value)
                                  );
                                  if (selectedSeq) {
                                    setNewRule(prev => ({
                                      ...prev,
                                      next_revision_description_id: selectedSeq.revision_description_id,
                                      next_revision_step_id: selectedSeq.revision_step_id
                                    }));
                                  }
                                }
                              }}
                              label={t('workflows.fields.sequence')}
                            >
                              <MenuItem value="">{t('workflows.messages.not_specified')}</MenuItem>
                              {getAvailableSequences().map((seq) => (
                                <MenuItem key={seq.id} value={seq.revision_description_id || ''}>
                                  {seq.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          
                        </Box>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <Button
                            variant="contained"
                            size="small"
                            onClick={addRule}
                            disabled={!newRule.current_revision_description_id || newRule.review_code_ids.length === 0}
                          >
                            {t('workflows.actions.add')}
                          </Button>
                        </Box>
                      </Box>
                    </Box>

                    {/* Existing Rules */}
                    {workflowRules.length > 0 && (
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          {t('workflows.sections.added_rules')}
                        </Typography>
                        {workflowRules.map((rule, index) => (
                          <Box key={index} sx={{ p: 2, mb: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                              <Typography variant="body2" sx={{ minWidth: '20px' }}>
                                {index + 1}.
                              </Typography>
                              <Typography variant="body2" color="text.secondary">{t('workflows.conditions.if')}</Typography>
                              <Chip 
                                label={rule.current_revision_description?.code || workflowStore.revisionDescriptions.find(rd => rd.id === rule.current_revision_description_id)?.code || 'U'} 
                                color="primary" 
                                size="small" 
                              />
                              <Typography variant="body2">-</Typography>
                              <Chip 
                                label={rule.current_revision_step?.code || workflowStore.revisionSteps.find(rs => rs.id === rule.current_revision_step_id)?.code || 'TCO'} 
                                color="secondary" 
                                size="small" 
                              />
                              <Typography variant="body2" color="text.secondary">
                                {rule.operator === 'equals' ? t('workflows.operators.equals') : t('workflows.operators.not_equals')}
                              </Typography>
                              {rule.review_codes?.map((rc: any, idx: number) => (
                                <Chip 
                                  key={idx}
                                  label={rc.code} 
                                  color="warning" 
                                  size="small" 
                                />
                              )) || <Chip label="No codes" color="warning" size="small" />}
                              <Typography variant="body2" color="text.secondary">→</Typography>
                              {rule.next_revision_description_id ? (
                                <>
                                  <Chip 
                                    label={rule.next_revision_description?.code || workflowStore.revisionDescriptions.find(rd => rd.id === rule.next_revision_description_id)?.code || 'U'} 
                                    color="success" 
                                    size="small" 
                                  />
                                  <Typography variant="body2">-</Typography>
                                  <Chip 
                                    label={rule.next_revision_step?.code || workflowStore.revisionSteps.find(rs => rs.id === rule.next_revision_step_id)?.code || 'Construction'} 
                                    color="success" 
                                    size="small" 
                                  />
                                </>
                              ) : (
                                <Chip 
                                  label={`+1 ${t('workflows.messages.increment_number_short')}`} 
                                  color="default" 
                                  size="small" 
                                />
                              )}
                              <Box sx={{ flexGrow: 1 }} />
                              <IconButton size="small" onClick={() => removeRule(index)}>
                                <DeleteIcon />
                              </IconButton>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </>
                )}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs} startIcon={<CancelIcon />}>
            {t('workflows.actions.cancel')}
          </Button>
          <Button 
            onClick={createDialogOpen ? handleCreate : handleUpdate}
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={!formData.name || isCreating}
          >
            {isCreating 
              ? t('workflows.actions.creating')
              : createDialogOpen 
                ? t('workflows.actions.create') 
                : t('workflows.actions.save')
            }
          </Button>
        </DialogActions>
      </Dialog>

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