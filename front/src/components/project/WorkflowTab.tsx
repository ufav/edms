import React from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  Chip
} from '@mui/material';
import { useTranslation } from 'react-i18next';

interface WorkflowTabProps {
  workflowPresets: any[];
  selectedWorkflowPreset: number | null;
  onWorkflowPresetChange: (presetId: number | null) => void;
}

const WorkflowTab: React.FC<WorkflowTabProps> = ({
  workflowPresets,
  selectedWorkflowPreset,
  onWorkflowPresetChange
}) => {
  const { t } = useTranslation();
  

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6" gutterBottom>
        {t('createProject.sections.workflow_selection')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('createProject.sections.workflow_hint')}
      </Typography>

      <FormControl fullWidth>
        <InputLabel>{t('createProject.sections.workflow_preset')}</InputLabel>
        <Select
          value={selectedWorkflowPreset || ''}
          onChange={(e) => onWorkflowPresetChange(Number(e.target.value))}
          label={t('createProject.sections.workflow_preset')}
          MenuProps={{
            disablePortal: true
          }}
        >
          <MenuItem value="">
            <em>{t('createProject.messages.no_preset_selected')}</em>
          </MenuItem>
          {workflowPresets.map((preset) => (
            <MenuItem key={preset.id} value={preset.id}>
              {preset.name} {preset.is_global ? `(${t('createProject.types.global')})` : `(${t('createProject.types.user')})`}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {selectedWorkflowPreset !== null && selectedWorkflowPreset !== 0 && (
        <Box sx={{ mt: 2 }}>
          {(() => {
            const preset = workflowPresets.find(p => p.id === selectedWorkflowPreset);
            if (!preset) return null;

            return (
              <Card variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  {preset.name}
                </Typography>
                {preset.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {preset.description}
                  </Typography>
                )}

                <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2">
                      <strong>{t('createProject.fields.preset_type')}:</strong>
                    </Typography>
                    <Chip 
                      label={preset.is_global ? t('createProject.types.global') : t('createProject.types.user')}
                      size="small"
                      color={preset.is_global ? 'primary' : 'secondary'}
                    />
                  </Box>
                  <Typography variant="body2">
                    <strong>{t('createProject.fields.sequences_count')}:</strong> {preset.sequences?.length || 0}
                  </Typography>
                  <Typography variant="body2">
                    <strong>{t('createProject.fields.rules_count')}:</strong> {preset.rules?.length || 0}
                  </Typography>
                </Box>

                {/* Последовательность ревизий */}
                {preset.sequences && preset.sequences.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      {t('createProject.sections.revision_sequence')}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {preset.sequences.map((seq: any, index: number) => (
                        <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                              label={t('createProject.labels.final')}
                              color="success"
                              size="small"
                            />
                          )}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}

                {/* Правила переходов */}
                {preset.rules && preset.rules.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      {t('createProject.sections.transition_rules')}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {preset.rules.map((rule: any, index: number) => (
                        <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="body2" sx={{ minWidth: '20px' }}>
                            {index + 1}.
                          </Typography>
                          <Typography variant="body2" color="text.secondary">{t('createProject.sections.if_condition')}</Typography>
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
                              label={`+1 ${t('createProject.sections.increment_number')} (${rule.action_on_fail})`}
                              color="default"
                              size="small"
                            />
                          )}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </Card>
            );
          })()}
        </Box>
      )}
    </Box>
  );
};

export default WorkflowTab;