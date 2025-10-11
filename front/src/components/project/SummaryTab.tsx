import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { rolesApi } from '../../api/client';

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
  revisionDescriptions: any[];
  revisionSteps: any[];
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
  revisionDescriptions,
  revisionSteps
}) => {
  const { t, i18n } = useTranslation();
  const [projectRoles, setProjectRoles] = useState<any[]>([]);

  useEffect(() => {
    const loadProjectRoles = async () => {
      try {
        const roles = await rolesApi.getProjectRoles();
        setProjectRoles(roles);
      } catch (error) {
        console.error('Ошибка загрузки ролей проектов:', error);
      }
    };
    loadProjectRoles();
  }, []);

  const getSelectedDiscipline = (id: number) => disciplines.find(d => d.id === id);
  const getSelectedWorkflowPreset = (id: number) => workflowPresets.find(wp => wp.id === id);

  // Функция для получения локализованного названия дисциплины
  const getDisciplineName = (discipline: any) => {
    if (i18n.language === 'en' && discipline?.name_en) {
      return discipline.name_en;
    }
    return discipline?.name || '';
  };

  // Подсчитываем общее количество типов документов
  const totalDocumentTypes = Object.values(disciplineDocumentTypes).reduce((total, types) => total + types.length, 0);

  // Функция для определения цвета роли
  const getRoleColor = (roleCode: string) => {
    switch (roleCode) {
      case 'owner':
        return 'error'; // Красный для владельца
      case 'manager':
        return 'warning'; // Оранжевый для менеджера
      case 'reviewer':
        return 'info'; // Синий для рецензента
      case 'contributor':
        return 'success'; // Зеленый для участника
      case 'viewer':
        return 'default'; // Серый для наблюдателя
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6" gutterBottom>
        {t('createProject.sections.summary')}
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        {/* Левая колонка - основная информация */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Основная информация */}
          <Card variant="outlined">
            <CardContent>
              <Typography 
                variant="subtitle1" 
                gutterBottom
                sx={{ 
                  fontWeight: 'bold',
                  color: 'primary.main',
                  borderBottom: '2px solid',
                  borderColor: 'primary.main',
                  pb: 1,
                  mb: 2
                }}
              >
                {t('createProject.sections.main')}
              </Typography>
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

          {/* Workflow пресет */}
          <Card variant="outlined">
            <CardContent>
              <Typography 
                variant="subtitle1" 
                gutterBottom
                sx={{ 
                  fontWeight: 'bold',
                  color: 'primary.main',
                  borderBottom: '2px solid',
                  borderColor: 'primary.main',
                  pb: 1,
                  mb: 2
                }}
              >
                {t('createProject.summary.workflow_preset')}
              </Typography>
              {selectedWorkflowPreset ? (
                (() => {
                  const preset = getSelectedWorkflowPreset(selectedWorkflowPreset);
                  return (
                    <Typography variant="body2">
                      {preset?.name} {preset?.is_global ? `(${t('createProject.summary.global')})` : `(${t('createProject.summary.user')})`}
                    </Typography>
                  );
                })()
              ) : (
                <Typography variant="body2" color="text.secondary">{t('createProject.summary.not_selected')}</Typography>
              )}
            </CardContent>
          </Card>

          {/* Ревизии */}
          <Card variant="outlined">
            <CardContent>
              <Typography 
                variant="subtitle1" 
                gutterBottom
                sx={{ 
                  fontWeight: 'bold',
                  color: 'primary.main',
                  borderBottom: '2px solid',
                  borderColor: 'primary.main',
                  pb: 1,
                  mb: 2
                }}
              >
                {t('createProject.sections.revisions')}
              </Typography>
              
              {/* Revision Descriptions */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {t('createProject.sections.revision_descriptions')} ({selectedRevisionDescriptions.length}):
                </Typography>
                {selectedRevisionDescriptions.length > 0 ? (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {selectedRevisionDescriptions.map((descId) => {
                      const description = revisionDescriptions.find(d => d.id === descId);
                      return (
                        <Chip
                          key={descId}
                          label={`${description?.code} - ${description?.description || description?.description_native}`}
                          color="primary"
                          variant="outlined"
                          size="small"
                        />
                      );
                    })}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">{t('createProject.summary.not_chosen')}</Typography>
                )}
              </Box>

              {/* Revision Steps */}
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {t('createProject.sections.revision_steps')} ({selectedRevisionSteps.length}):
                </Typography>
                {selectedRevisionSteps.length > 0 ? (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {selectedRevisionSteps.map((stepId) => {
                      const step = revisionSteps.find(s => s.id === stepId);
                      return (
                        <Chip
                          key={stepId}
                          label={`${step?.code} - ${step?.description || step?.description_native}`}
                          color="secondary"
                          variant="outlined"
                          size="small"
                        />
                      );
                    })}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">{t('createProject.summary.not_chosen')}</Typography>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Участники проекта */}
          <Card variant="outlined">
            <CardContent>
              <Typography 
                variant="subtitle1" 
                gutterBottom
                sx={{ 
                  fontWeight: 'bold',
                  color: 'primary.main',
                  borderBottom: '2px solid',
                  borderColor: 'primary.main',
                  pb: 1,
                  mb: 2
                }}
              >
                {t('createProject.summary.project_participants')} ({pendingParticipants.length})
              </Typography>
              {pendingParticipants.length === 0 ? (
                <Typography variant="body2" color="text.secondary">{t('createProject.summary.not_added')}</Typography>
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

          {/* Доступ к проекту */}
          <Card variant="outlined">
            <CardContent>
              <Typography 
                variant="subtitle1" 
                gutterBottom
                sx={{ 
                  fontWeight: 'bold',
                  color: 'primary.main',
                  borderBottom: '2px solid',
                  borderColor: 'primary.main',
                  pb: 1,
                  mb: 2
                }}
              >
                {t('createProject.summary.project_access')} ({pendingProjectMembers.length})
              </Typography>
              {pendingProjectMembers.length === 0 ? (
                <Typography variant="body2" color="text.secondary">{t('createProject.summary.not_added')}</Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {pendingProjectMembers.map((member, index) => {
                    const user = users.find(u => u.id === member.user_id);
                    return (
                      <Box key={index} sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {user?.full_name || t('createProject.summary.unknown_user')}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Typography variant="body2" color="text.secondary">
                            {user?.email || t('createProject.summary.no_email')}
                          </Typography>
                          {(() => {
                            const role = projectRoles.find(r => r.id === member.project_role_id);
                            return role ? (
                              <Chip
                                label={role.name_en || role.name}
                                color={getRoleColor(role.code) as any}
                                size="small"
                              />
                            ) : (
                              <Chip
                                label="Не назначена"
                                color="default"
                                size="small"
                              />
                            );
                          })()}
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Правая колонка - дисциплины и типы */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography 
                variant="subtitle1" 
                gutterBottom
                sx={{ 
                  fontWeight: 'bold',
                  color: 'primary.main',
                  borderBottom: '2px solid',
                  borderColor: 'primary.main',
                  pb: 1,
                  mb: 2
                }}
              >
                {t('createProject.sections.disciplines_types')} ({selectedDisciplines.length} {t('createProject.summary.disciplines')}, {totalDocumentTypes} {t('createProject.summary.document_types')})
              </Typography>
              {selectedDisciplines.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {selectedDisciplines.map((disciplineId) => {
                    const discipline = getSelectedDiscipline(disciplineId);
                    const types = (disciplineDocumentTypes[disciplineId] || []).map(item => documentTypes.find(t => t.id === item.documentTypeId)?.code).filter(Boolean);
                    return (
                      <Box key={disciplineId} sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                          {discipline?.code} - {getDisciplineName(discipline)} ({types.length} {t('createProject.summary.types')})
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {types.length > 0 ? (
                            types.map((typeCode, index) => (
                              <Chip
                                key={index}
                                label={typeCode}
                                color="primary"
                                variant="outlined"
                                size="small"
                              />
                            ))
                          ) : (
                            <Typography variant="body2" color="text.secondary">{t('createProject.summary.no_types')}</Typography>
                          )}
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">{t('createProject.summary.not_chosen')}</Typography>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default SummaryTab;
