import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Alert,
  Chip,
  Card,
  CardContent,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

export interface WorkflowTemplate {
  id: number;
  name: string;
  description?: string;
  steps?: any[];
}

export interface WorkflowStatus {
  progress_percentage: number;
  current_step?: string;
  status: string;
  approvals: Array<{
    id: number;
    step_name: string;
    status: string;
    approver_name: string;
    comments?: string;
    created_at: string;
  }>;
}

export interface DocumentWorkflowDialogProps {
  // Состояние диалога
  open: boolean;
  
  // Данные workflow
  selectedDocument: any;
  workflowTemplates: WorkflowTemplate[];
  workflowStatus: WorkflowStatus | null;
  
  // Обработчики
  onClose: () => void;
  onCloseWithReset: () => void;
  onStartWorkflow: (templateId: number) => void;
}

export const DocumentWorkflowDialog: React.FC<DocumentWorkflowDialogProps> = ({
  open,
  selectedDocument,
  workflowTemplates,
  workflowStatus,
  onClose,
  onCloseWithReset,
  onStartWorkflow,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {workflowStatus ? t('documents.workflow_status') : t('documents.start_workflow')}
      </DialogTitle>
      <DialogContent>
        {workflowStatus ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Прогресс согласования</Typography>
              <Chip
                label={`${workflowStatus.progress_percentage}%`}
                color={workflowStatus.progress_percentage === 100 ? 'success' : 'primary'}
              />
            </Box>
            
            <Typography variant="body2" color="text.secondary">
              {t('documents.current_step')}: {workflowStatus.current_step || t('documents.completed')}
            </Typography>
            
            <Typography variant="body2" color="text.secondary">
              Статус: {workflowStatus.status}
            </Typography>
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>История согласований</Typography>
              {workflowStatus.approvals.map((approval) => (
                <Card key={approval.id} sx={{ mb: 1 }}>
                  <CardContent sx={{ py: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" fontWeight="bold">
                        {approval.step_name}
                      </Typography>
                      <Chip
                        label={approval.status}
                        color={approval.status === 'approved' ? 'success' : approval.status === 'rejected' ? 'error' : 'default'}
                        size="small"
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Согласующий: {approval.approver_name}
                    </Typography>
                    {approval.comments && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Комментарий: {approval.comments}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {new Date(approval.created_at).toLocaleString('ru-RU')}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Выберите шаблон согласования для документа: {selectedDocument?.title}
            </Typography>
            
            {workflowTemplates.length === 0 ? (
              <Alert severity="info">
                Нет доступных шаблонов согласования для данного типа документа
              </Alert>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {workflowTemplates.map((template) => (
                  <Card key={template.id} sx={{ cursor: 'pointer' }} onClick={() => onStartWorkflow(template.id)}>
                    <CardContent>
                      <Typography variant="h6">{template.name}</Typography>
                      {template.description && (
                        <Typography variant="body2" color="text.secondary">
                          {template.description}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        Шагов: {template.steps?.length || 0}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCloseWithReset}>
          Закрыть
        </Button>
      </DialogActions>
    </Dialog>
  );
};
