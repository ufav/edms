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
  Alert,
  Snackbar,
  Card,
  Divider,
  Tooltip,
  CircularProgress
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

const WorkflowPresetsPage: React.FC = observer(() => {
  const { t } = useTranslation();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<WorkflowPreset | null>(null);
  
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
    is_final: false
  });
  const [newRule, setNewRule] = useState({
    current_revision_description_id: null as number | null,
    current_revision_step_id: null as number | null,
    review_code_id: null as number | null,
    next_revision_description_id: null as number | null,
    next_revision_step_id: null as number | null,
    action_on_fail: 'increment_number'
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
    setWorkflowRules(preset.rules || []);
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
          is_final: seq.is_final
        })),
        rules: workflowRules.map(rule => ({
          current_revision_description_id: rule.current_revision_description_id,
          current_revision_step_id: rule.current_revision_step_id,
          review_code_id: rule.review_code_id,
          next_revision_description_id: rule.next_revision_description_id,
          next_revision_step_id: rule.next_revision_step_id,
          action_on_fail: rule.action_on_fail
        }))
      };
      
      await workflowStore.createPreset(presetData);
      
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
          is_final: seq.is_final
        })),
        rules: workflowRules.map(rule => ({
          current_revision_description_id: rule.current_revision_description_id,
          current_revision_step_id: rule.current_revision_step_id,
          review_code_id: rule.review_code_id,
          next_revision_description_id: rule.next_revision_description_id,
          next_revision_step_id: rule.next_revision_step_id,
          action_on_fail: rule.action_on_fail
        }))
      };
      
      await workflowStore.updatePreset(selectedPreset.id, presetData);
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
      revision_description: workflowStore.revisionDescriptions.find(rd => rd.id === newSequence.revision_description_id),
      revision_step: workflowStore.revisionSteps.find(rs => rs.id === newSequence.revision_step_id)
    };
    
    setWorkflowSequences(prev => [...prev, sequence]);
    setNewSequence({
      revision_description_id: null,
      revision_step_id: null,
      is_final: false
    });
  };

  const removeSequence = (index: number) => {
    setWorkflowSequences(prev => prev.filter((_, i) => i !== index));
  };

  // Workflow rules handlers
  const addRule = () => {
    if (!newRule.current_revision_description_id || !newRule.current_revision_step_id || !newRule.review_code_id) return;
    
    const rule = {
      id: Date.now(),
      current_revision_description_id: newRule.current_revision_description_id,
      current_revision_step_id: newRule.current_revision_step_id,
      review_code_id: newRule.review_code_id,
      next_revision_description_id: newRule.next_revision_description_id,
      next_revision_step_id: newRule.next_revision_step_id,
      action_on_fail: newRule.action_on_fail,
      current_revision: {
        description: workflowStore.revisionDescriptions.find(rd => rd.id === newRule.current_revision_description_id),
        step: workflowStore.revisionSteps.find(rs => rs.id === newRule.current_revision_step_id)
      },
      review_code: workflowStore.reviewCodes.find(rc => rc.id === newRule.review_code_id),
      next_revision: newRule.next_revision_description_id && newRule.next_revision_step_id ? {
        description: workflowStore.revisionDescriptions.find(rd => rd.id === newRule.next_revision_description_id),
        step: workflowStore.revisionSteps.find(rs => rs.id === newRule.next_revision_step_id)
      } : null
    };
    
    setWorkflowRules(prev => [...prev, rule]);
    setNewRule({
      current_revision_description_id: null,
      current_revision_step_id: null,
      review_code_id: null,
      next_revision_description_id: null,
      next_revision_step_id: null,
      action_on_fail: 'increment_number'
    });
  };

  const removeRule = (index: number) => {
    setWorkflowRules(prev => prev.filter((_, i) => i !== index));
  };

  // Get available sequences for rules
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

      {/* Presets Table */}
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
            {workflowStore.isLoading ? (
              <TableRow>
                <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : workflowStore.presets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('workflows.table.no_presets')}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              workflowStore.presets.map((preset) => (
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

      {/* Create/Edit Dialog */}
      <Dialog 
        open={createDialogOpen || editDialogOpen} 
        onClose={handleCloseDialogs}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {createDialogOpen ? t('workflows.dialogs.create_title') : t('workflows.dialogs.edit_title')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            {/* Basic Info */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label={t('workflows.fields.name')}
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                fullWidth
                required
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
              rows={2}
            />

            <Divider />

            {/* Sequences */}
            <Box>
              <Typography variant="h6" gutterBottom>
                {t('workflows.sections.sequences')}
              </Typography>
              
              {workflowSequences.map((seq, index) => (
                <Card key={seq.id} variant="outlined" sx={{ p: 2, mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="body2" sx={{ minWidth: '30px' }}>
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
                    <Box sx={{ flexGrow: 1 }} />
                    <IconButton size="small" onClick={() => removeSequence(index)}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Card>
              ))}

              {/* Add Sequence */}
              <Card variant="outlined" sx={{ p: 2, borderStyle: 'dashed', mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {t('workflows.sections.add_sequence')}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel shrink>{t('workflows.fields.revision_description')}</InputLabel>
                    <Select
                      value={newSequence.revision_description_id || ''}
                      onChange={(e) => setNewSequence(prev => ({
                        ...prev,
                        revision_description_id: Number(e.target.value)
                      }))}
                      label={t('workflows.fields.revision_description')}
                    >
                      {workflowStore.revisionDescriptions.map((rd) => (
                        <MenuItem key={rd.id} value={rd.id}>
                          {rd.code} - {rd.description_native || rd.description}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel shrink>{t('workflows.fields.revision_step')}</InputLabel>
                    <Select
                      value={newSequence.revision_step_id || ''}
                      onChange={(e) => setNewSequence(prev => ({
                        ...prev,
                        revision_step_id: Number(e.target.value)
                      }))}
                      label={t('workflows.fields.revision_step')}
                    >
                      {workflowStore.revisionSteps.map((rs) => (
                        <MenuItem key={rs.id} value={rs.id}>
                          {rs.code} - {rs.description_native || rs.description}
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
                  
                  <Button
                    variant="contained"
                    size="small"
                    onClick={addSequence}
                    disabled={!newSequence.revision_description_id || !newSequence.revision_step_id}
                  >
                    {t('workflows.actions.add')}
                  </Button>
                </Box>
              </Card>
            </Box>

            <Divider />

            {/* Rules */}
            <Box>
              <Typography variant="h6" gutterBottom>
                {t('workflows.sections.rules')}
              </Typography>
              
              {workflowRules.map((rule, index) => (
                <Card key={rule.id} variant="outlined" sx={{ p: 2, mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <Typography variant="body2" sx={{ minWidth: '30px' }}>
                      {index + 1}.
                    </Typography>
                    <Typography variant="body2" color="text.secondary">{t('workflows.conditions.if')}</Typography>
                    <Chip 
                      label={rule.current_revision?.description?.code || 'U'} 
                      color="primary" 
                      size="small" 
                    />
                    <Typography variant="body2">-</Typography>
                    <Chip 
                      label={rule.current_revision?.step?.code || 'TCO'} 
                      color="secondary" 
                      size="small" 
                    />
                    <Typography variant="body2" color="text.secondary">+</Typography>
                    <Chip 
                      label={rule.review_code?.code || 'Code 1'} 
                      color="warning" 
                      size="small" 
                    />
                    <Typography variant="body2" color="text.secondary">→</Typography>
                    {rule.next_revision ? (
                      <>
                        <Chip 
                          label={rule.next_revision.description?.code || 'U'} 
                          color="success" 
                          size="small" 
                        />
                        <Typography variant="body2">-</Typography>
                        <Chip 
                          label={rule.next_revision.step?.code || 'Construction'} 
                          color="success" 
                          size="small" 
                        />
                      </>
                    ) : (
                      <Chip 
                        label={`+1 ${t('workflows.messages.increment_number_short')} (${rule.action_on_fail})`} 
                        color="default" 
                        size="small" 
                      />
                    )}
                    <Box sx={{ flexGrow: 1 }} />
                    <IconButton size="small" onClick={() => removeRule(index)}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Card>
              ))}

              {/* Add Rule */}
              {workflowSequences.length > 0 ? (
                <Card variant="outlined" sx={{ p: 2, borderStyle: 'dashed', mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    {t('workflows.sections.add_rule')}
                  </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Current Revision */}
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: '60px' }}>
                      {t('workflows.conditions.if')}:
                    </Typography>
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                      <InputLabel shrink>{t('workflows.fields.sequence')}</InputLabel>
                      <Select
                        value={newRule.current_revision_description_id || ''}
                        onChange={(e) => {
                          const selectedSeq = getAvailableSequences().find(seq => 
                            seq.revision_description_id === Number(e.target.value)
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
                          <MenuItem key={seq.id} value={seq.revision_description_id}>
                            {seq.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    
                    <Typography variant="body2" color="text.secondary">+</Typography>
                    
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel shrink>Review Code</InputLabel>
                      <Select
                        value={newRule.review_code_id || ''}
                        onChange={(e) => setNewRule(prev => ({
                          ...prev,
                          review_code_id: Number(e.target.value)
                        }))}
                        label="Review Code"
                      >
                        {workflowStore.reviewCodes.map((rc) => (
                          <MenuItem key={rc.id} value={rc.id}>
                            {rc.code} - {rc.description_native || rc.description}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                  
                  {/* Next Revision */}
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: '60px' }}>
                      {t('workflows.conditions.then')}:
                    </Typography>
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                      <InputLabel shrink>{t('workflows.fields.sequence')}</InputLabel>
                      <Select
                        value={newRule.next_revision_description_id || ''}
                        onChange={(e) => {
                          if (e.target.value === '') {
                            setNewRule(prev => ({
                              ...prev,
                              next_revision_description_id: null,
                              next_revision_step_id: null
                            }));
                          } else {
                            const selectedSeq = getAvailableSequences().find(seq => 
                              seq.revision_description_id === Number(e.target.value)
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
                          <MenuItem key={seq.id} value={seq.revision_description_id}>
                            {seq.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    
                    <Typography variant="body2" color="text.secondary">{t('workflows.conditions.or')}</Typography>
                    
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                      <InputLabel shrink>{t('workflows.fields.action_on_fail')}</InputLabel>
                      <Select
                        value={newRule.action_on_fail}
                        onChange={(e) => setNewRule(prev => ({
                          ...prev,
                          action_on_fail: e.target.value
                        }))}
                        label={t('workflows.fields.action_on_fail')}
                      >
                        <MenuItem value="increment_number">{t('workflows.messages.increment_number')}</MenuItem>
                        <MenuItem value="keep_same">{t('workflows.messages.keep_same')}</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  
                  <Button
                    variant="contained"
                    size="small"
                    onClick={addRule}
                    disabled={!newRule.current_revision_description_id || !newRule.current_revision_step_id || !newRule.review_code_id}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    {t('workflows.sections.add_rule')}
                  </Button>
                </Box>
              </Card>
              ) : (
                <Card variant="outlined" sx={{ p: 2, borderStyle: 'dashed', mt: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('workflows.messages.add_sequences_first')}
                  </Typography>
                </Card>
              )}
            </Box>
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
              {selectedPreset.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {selectedPreset.description}
                </Typography>
              )}
              
              {/* Sequences */}
              {selectedPreset.sequences && selectedPreset.sequences.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    {t('workflows.sections.sequences_title')}
                  </Typography>
                  {selectedPreset.sequences.map((seq: any, index: number) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
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
                    </Box>
                  ))}
                </Box>
              )}
              
              {/* Rules */}
              {selectedPreset.rules && selectedPreset.rules.length > 0 && (
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    {t('workflows.sections.rules_title')}
                  </Typography>
                  {selectedPreset.rules.map((rule: any, index: number) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                      <Typography variant="body2" sx={{ minWidth: '20px' }}>
                        {index + 1}.
                      </Typography>
                      <Typography variant="body2" color="text.secondary">{t('workflows.conditions.if')}</Typography>
                      <Chip 
                        label={rule.current_revision?.description?.code || 'U'} 
                        color="primary" 
                        size="small" 
                      />
                      <Typography variant="body2">-</Typography>
                      <Chip 
                        label={rule.current_revision?.step?.code || 'TCO'} 
                        color="secondary" 
                        size="small" 
                      />
                      <Typography variant="body2" color="text.secondary">+</Typography>
                      <Chip 
                        label={rule.review_code?.code || 'Code 1'} 
                        color="warning" 
                        size="small" 
                      />
                      <Typography variant="body2" color="text.secondary">→</Typography>
                      {rule.next_revision ? (
                        <>
                          <Chip 
                            label={rule.next_revision.description?.code || 'U'} 
                            color="success" 
                            size="small" 
                          />
                          <Typography variant="body2">-</Typography>
                          <Chip 
                            label={rule.next_revision.step?.code || 'Construction'} 
                            color="success" 
                            size="small" 
                          />
                        </>
                      ) : (
                        <Chip 
                          label={`+1 ${t('workflows.messages.increment_number_short')} (${rule.action_on_fail})`} 
                          color="default" 
                          size="small" 
                        />
                      )}
                    </Box>
                  ))}
                </Box>
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

      {/* Notifications */}
      <Snackbar
        open={!!workflowStore.error}
        autoHideDuration={6000}
        onClose={() => workflowStore.clearError()}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={() => workflowStore.clearError()} severity="error" variant="filled">
          {workflowStore.error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!successMessage}
        autoHideDuration={4000}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={() => setSuccessMessage(null)} severity="success" variant="filled">
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
});

export default WorkflowPresetsPage;
