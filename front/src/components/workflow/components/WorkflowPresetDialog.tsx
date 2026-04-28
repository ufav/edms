import React, { useEffect, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Step,
  StepContent,
  StepLabel,
  Stepper,
  Tab,
  Tabs,
  TextField,
  Typography,
  Checkbox,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { workflowStore } from '../../../stores/WorkflowStore';
import Autocomplete from '@mui/material/Autocomplete';
import IconButton from '@mui/material/IconButton';

export type WorkflowPresetDialogMode = 'create' | 'edit';

interface WorkflowPresetDialogProps {
  open: boolean;
  mode: WorkflowPresetDialogMode;
  initialPreset?: any | null;
  onClose: () => void;
  onCreate: (payload: any) => Promise<void>;
  onUpdate: (payload: any) => Promise<void>;
}

const WorkflowPresetDialog: React.FC<WorkflowPresetDialogProps> = observer(({ open, mode, initialPreset, onClose, onCreate, onUpdate }) => {
  const { t } = useTranslation();

  // Вкладки
  const [tabIndex, setTabIndex] = useState(0);

  // Основные данные
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_global: false,
  });

  // Секции и правила
  const [workflowSequences, setWorkflowSequences] = useState<any[]>([]);
  const [workflowRules, setWorkflowRules] = useState<any[]>([]);
  const [newSequence, setNewSequence] = useState({
    revision_description_id: null as number | null,
    revision_step_id: null as number | null,
    is_final: false,
    requires_transmittal: false,
    due_days: null as number | null,
  });
  const [newRule, setNewRule] = useState({
    current_revision_description_id: null as number | null,
    current_revision_step_id: null as number | null,
    operator: 'equals' as 'equals' | 'not_equals',
    review_code_ids: [] as number[],
    next_revision_description_id: null as number | null,
    next_revision_step_id: null as number | null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Инициализация при открытии
  useEffect(() => {
    if (!open) return;
    try { workflowStore.loadReferences(); } catch {}

    if (mode === 'edit' && initialPreset) {
      setFormData({
        name: initialPreset.name,
        description: initialPreset.description || '',
        is_global: !!initialPreset.is_global,
      });
      setWorkflowSequences(initialPreset.sequences || []);

      const transformedRules = (initialPreset.rules || []).map((rule: any) => ({
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
        action_on_fail: rule.action_on_fail,
      }));
      setWorkflowRules(transformedRules);
    } else {
      setFormData({ name: '', description: '', is_global: false });
      setWorkflowSequences([]);
      setWorkflowRules([]);
    }
    setNewSequence({
      revision_description_id: null,
      revision_step_id: null,
      is_final: false,
      requires_transmittal: false,
      due_days: null,
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
  }, [open, mode, initialPreset]);

  const getAvailableSequences = useMemo(() => (
    workflowSequences.map(seq => ({
      id: seq.id,
      revision_description_id: seq.revision_description_id,
      revision_step_id: seq.revision_step_id,
      revision_description: seq.revision_description,
      revision_step: seq.revision_step,
      label: `${seq.revision_description?.code || 'U'} - ${seq.revision_step?.code || 'TCO'}`,
    }))
  ), [workflowSequences]);

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
      revision_step: workflowStore.revisionSteps.find(rs => rs.id === newSequence.revision_step_id),
    };
    setWorkflowSequences(prev => [...prev, sequence]);
    setNewSequence({
      revision_description_id: null,
      revision_step_id: null,
      is_final: false,
      requires_transmittal: false,
      due_days: null,
    });
  };

  const removeSequence = (index: number) => {
    setWorkflowSequences(prev => prev.filter((_, i) => i !== index));
    if (workflowSequences.length - 1 === 0 && tabIndex === 2) {
      setTabIndex(1);
    }
  };

  const addRule = () => {
    if (!newRule.current_revision_description_id || newRule.review_code_ids.length === 0) return;
    const rule = {
      id: Date.now(),
      current_revision_description_id: newRule.current_revision_description_id,
      current_revision_step_id: newRule.current_revision_step_id,
      operator: newRule.operator,
      review_code_id: newRule.review_code_ids.length === 1 ? newRule.review_code_ids[0] : null,
      review_code_list: newRule.review_code_ids.length > 1 ? JSON.stringify(newRule.review_code_ids) : null,
      review_code_ids: newRule.review_code_ids,
      next_revision_description_id: newRule.next_revision_description_id,
      next_revision_step_id: newRule.next_revision_step_id,
      current_revision_description: workflowStore.revisionDescriptions.find(rd => rd.id === newRule.current_revision_description_id),
      current_revision_step: workflowStore.revisionSteps.find(rs => rs.id === newRule.current_revision_step_id),
      review_codes: workflowStore.reviewCodes.filter(rc => newRule.review_code_ids.includes(rc.id)),
      next_revision_description: newRule.next_revision_description_id ? workflowStore.revisionDescriptions.find(rd => rd.id === newRule.next_revision_description_id) : null,
      next_revision_step: newRule.next_revision_step_id ? workflowStore.revisionSteps.find(rs => rs.id === newRule.next_revision_step_id) : null,
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

  const buildPayload = () => ({
    ...formData,
    sequences: workflowSequences.map(seq => ({
      revision_description_id: seq.revision_description_id,
      revision_step_id: seq.revision_step_id,
      is_final: seq.is_final,
      requires_transmittal: seq.requires_transmittal,
      due_days: seq.due_days,
    })),
    rules: workflowRules.map(rule => ({
      current_revision_description_id: rule.current_revision_description_id,
      current_revision_step_id: rule.current_revision_step_id,
      operator: rule.operator,
      review_code_id: rule.review_code_id,
      review_code_list: rule.review_code_list,
      next_revision_description_id: rule.next_revision_description_id,
      next_revision_step_id: rule.next_revision_step_id,
      action_on_fail: (rule as any).action_on_fail || 'increment_number',
      priority: 100,
    })),
  });

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const payload = buildPayload();
      if (mode === 'create') {
        await onCreate(payload);
      } else {
        await onUpdate(payload);
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth scroll="paper">
      <DialogTitle>
        {mode === 'create' ? t('workflows.dialogs.create_title') : t('workflows.dialogs.edit_title')}
      </DialogTitle>
      <DialogContent sx={{ height: 700, p: 0, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: 'background.paper', borderBottom: 1, borderColor: 'divider', px: 3, pt: 3 }}>
          <Tabs 
            value={tabIndex} 
            onChange={(_, v) => setTabIndex(v)} 
            variant="scrollable" 
            scrollButtons="auto"
            sx={{ 
              '& .MuiTab-root': {
                textTransform: 'uppercase',
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
          >
            <Tab label={t('workflows.tabs.main')} />
            <Tab label={t('workflows.tabs.sequences')} />
          </Tabs>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', p: 3, pt: 2 }}>
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
                  control={<Checkbox checked={formData.is_global} onChange={(e) => setFormData(prev => ({ ...prev, is_global: e.target.checked }))} />}
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

          {tabIndex === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Typography variant="h6" gutterBottom>
                {t('workflows.sections.sequences_title')}
              </Typography>

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
                    onChange={(_, newValue) => setNewSequence(prev => ({ ...prev, revision_description_id: (newValue as any)?.id || null }))}
                    renderInput={(params) => (
                      <TextField {...params} variant="standard" label={t('workflows.fields.revision_description')} />
                    )}
                    ListboxProps={{ style: { maxHeight: '200px' } }}
                  />

                  <FormControl size="small" variant="standard" sx={{ width: '25%' }}>
                    <InputLabel>{t('workflows.fields.revision_step')}</InputLabel>
                    <Select
                      value={newSequence.revision_step_id || ''}
                      onChange={(e) => setNewSequence(prev => ({ ...prev, revision_step_id: e.target.value as number }))}
                      label={t('workflows.fields.revision_step')}
                    >
                      {workflowStore.revisionSteps.map((step) => (
                        <MenuItem key={step.id} value={step.id}>
                          {step.code} - {step.description}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    size="small"
                    variant="standard"
                    sx={{ width: '10%' }}
                    type="text"
                    label={t('workflows.fields.due_days')}
                    value={newSequence.due_days || ''}
                    onChange={(e) => setNewSequence(prev => ({ ...prev, due_days: e.target.value ? parseInt(e.target.value) : null }))}
                  />

                  <FormControlLabel control={<Checkbox checked={newSequence.is_final} onChange={(e) => setNewSequence(prev => ({ ...prev, is_final: e.target.checked }))} />} label={t('workflows.fields.final')} />
                  <FormControlLabel control={<Checkbox checked={newSequence.requires_transmittal} onChange={(e) => setNewSequence(prev => ({ ...prev, requires_transmittal: e.target.checked }))} />} label={t('workflows.fields.requires_transmittal')} />

                  <Button variant="contained" size="small" onClick={addSequence} disabled={!newSequence.revision_description_id || !newSequence.revision_step_id}>
                    {t('workflows.actions.add')}
                  </Button>
                </Box>
              </Box>

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
                            <Chip label={seq.revision_description?.code || 'U'} color="primary" size="small" />
                            <Typography variant="body2">-</Typography>
                            <Chip label={seq.revision_step?.code || 'TCO'} color="secondary" size="small" />
                            {seq.is_final && (<Chip label={t('workflows.fields.final')} color="success" size="small" />)}
                            {seq.requires_transmittal && (<Chip label={t('workflows.fields.requires_transmittal')} color="warning" size="small" />)}
                            {seq.due_days && (<Chip label={`${seq.due_days} ${t('workflows.fields.days')}`} color="info" size="small" />)}
                          </Box>
                        </StepLabel>
                        <StepContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                              {seq.revision_description?.description} - {seq.revision_step?.description}
                            </Typography>
                            <IconButton size="small" onClick={() => removeSequence(index)} color="error">
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

        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('workflows.actions.cancel')}</Button>
        <Button onClick={handleSubmit} variant="contained" startIcon={<SaveIcon />} disabled={!formData.name || isSubmitting}>
          {isSubmitting ? t('workflows.actions.creating') : (mode === 'create' ? t('workflows.actions.create') : t('workflows.actions.save'))}
        </Button>
      </DialogActions>
    </Dialog>
  );
});

export default WorkflowPresetDialog;
