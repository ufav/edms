import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import { useTranslation } from 'react-i18next';

interface SummaryTabProps {
  formData: {
    name: string;
    project_code: string;
    description: string;
    status: string;
    start_date: Date | null;
    end_date: Date | null;
    budget: string;
  };
  selectedDisciplines: number[];
  disciplineDocumentTypes: { [key: number]: { documentTypeId: number, drs?: string }[] };
  selectedRevisionDescriptions: number[];
  selectedRevisionSteps: number[];
  selectedWorkflowPreset: number | null;
  pendingParticipants: any[];
  pendingProjectMembers: any[];
  disciplines: any[];
  documentTypes: any[];
  workflowPresets: any[];
  companies: any[];
  contacts: any[];
  companyRoles: any[];
  users: any[];
  getRoleLabel: (role: string) => string;
}

const SummaryTab: React.FC<SummaryTabProps> = ({
  formData,
  selectedDisciplines,
  disciplineDocumentTypes,
  selectedRevisionDescriptions,
  selectedRevisionSteps,
  selectedWorkflowPreset,
  pendingParticipants,
  pendingProjectMembers,
  disciplines,
  documentTypes,
  workflowPresets,
  companies,
  contacts,
  companyRoles,
  users,
  getRoleLabel
}) => {
  const { t } = useTranslation();

  const getSelectedDiscipline = (id: number) => disciplines.find(d => d.id === id);
  const getSelectedWorkflowPreset = (id: number) => workflowPresets.find(wp => wp.id === id);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6" gutterBottom>
        {t('createProject.sections.summary')}
      </Typography>
      
      <Grid container spacing={2}>
        {/* Основная информация */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>{t('createProject.sections.main')}</Typography>
              <Typography variant="body2">{t('createProject.fields.name')}: {formData.name || '—'}</Typography>
              <Typography variant="body2">{t('createProject.fields.project_code')}: {formData.project_code || '—'}</Typography>
              <Typography variant="body2">{t('common.status')}: {formData.status}</Typography>
              <Typography variant="body2">{t('createProject.fields.start_date')}: {formData.start_date ? formData.start_date.toLocaleDateString('ru-RU') : '—'}</Typography>
              <Typography variant="body2">{t('createProject.fields.end_date')}: {formData.end_date ? formData.end_date.toLocaleDateString('ru-RU') : '—'}</Typography>
              {formData.description && (
                <Typography variant="body2" sx={{ mt: 1 }}>{t('createProject.fields.description')}: {formData.description}</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Workflow пресет */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>Workflow пресет</Typography>
              {selectedWorkflowPreset ? (
                (() => {
                  const preset = getSelectedWorkflowPreset(selectedWorkflowPreset);
                  return (
                    <Typography variant="body2">
                      {preset?.name} {preset?.is_global ? '(Глобальный)' : '(Пользовательский)'}
                    </Typography>
                  );
                })()
              ) : (
                <Typography variant="body2" color="text.secondary">Не выбран</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Дисциплины и типы */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>{t('createProject.sections.disciplines_types')}</Typography>
              {selectedDisciplines.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {selectedDisciplines.map((disciplineId) => {
                    const discipline = getSelectedDiscipline(disciplineId);
                    const types = (disciplineDocumentTypes[disciplineId] || []).map(item => documentTypes.find(t => t.id === item.documentTypeId)?.code).filter(Boolean);
                    return (
                      <Typography key={disciplineId} variant="body2">
                        {discipline?.code}: {types.length ? types.join(', ') : '—'}
                      </Typography>
                    );
                  })}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">Не выбраны</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Ревизии */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>{t('createProject.sections.revisions')}</Typography>
              <Typography variant="body2">
                {t('createProject.sections.revision_descriptions')}: {selectedRevisionDescriptions.length}
              </Typography>
              <Typography variant="body2">
                {t('createProject.sections.revision_steps')}: {selectedRevisionSteps.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Участники проекта */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>Участники проекта</Typography>
              {pendingParticipants.length === 0 ? (
                <Typography variant="body2" color="text.secondary">Не добавлены</Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {pendingParticipants.map((participant, index) => {
                    const company = companies.find(c => c.id === participant.company_id);
                    const contact = contacts.find(c => c.id === participant.contact_id);
                    const role = companyRoles.find(r => r.id === participant.company_role_id);
                    return (
                      <Box key={index} sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {company?.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {contact?.full_name} ({role?.name})
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Доступ к проекту */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>Доступ к проекту</Typography>
              {pendingProjectMembers.length === 0 ? (
                <Typography variant="body2" color="text.secondary">Не добавлены</Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {pendingProjectMembers.map((member, index) => {
                    const user = users.find(u => u.id === member.user_id);
                    return (
                      <Box key={index} sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {user?.full_name || 'Неизвестный пользователь'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {user?.email || 'Нет email'} • {getRoleLabel(member.role)}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SummaryTab;
