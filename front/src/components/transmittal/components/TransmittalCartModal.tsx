import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  Chip,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Send as SendIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { observer } from 'mobx-react-lite';
import { transmittalCartStore } from '../../../stores/TransmittalCartStore';
import TransmittalDialog from './TransmittalDialog';

export interface SelectedRevision {
  id: number;
  document_id: number;
  document_title: string;
  document_number: string;
  revision_number: string;
  revision_description_code?: string;
  file_name: string;
  file_type?: string;
  file_size: number;
  created_at: string;
}

export interface TransmittalCartModalProps {
  // Состояние модалки
  open: boolean;
  
  // Данные
  selectedRevisionIds: number[];
  activeRevisions: SelectedRevision[];
  isLoading?: boolean;
  error?: string | null;
  
  // Обработчики
  onClose: () => void;
  onRemoveRevision: (revisionId: number) => void;
  onClearAll: () => void;
  onCreateTransmittal: (transmittalData: any) => Promise<void>;
  onShowNotification?: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
  
  // Утилиты
  formatFileSize: (bytes: number) => string;
  formatDate: (date: string) => string;
}

export const TransmittalCartModal: React.FC<TransmittalCartModalProps> = observer(({
  open,
  selectedRevisionIds,
  activeRevisions,
  isLoading = false,
  error = null,
  onClose,
  onRemoveRevision,
  onClearAll,
  onCreateTransmittal,
  onShowNotification,
  formatFileSize,
  formatDate,
}) => {
  // Получаем актуальные данные ревизий по выбранным ID из стора
  const selectedRevisions = transmittalCartStore.getSelectedRevisions(activeRevisions || []);
  const { t } = useTranslation();
  
  // Состояние для диалога создания трансмиттала
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  if (!open) return null;

  return (
    <>
      <Paper
        sx={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          width: 400,
          maxHeight: 500,
          zIndex: 1300,
          boxShadow: 3,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Заголовок */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          p: 2,
          borderBottom: 1,
          borderColor: 'divider'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6">
              {t('transmittals.add_to_transmittal')}
            </Typography>
            <Chip 
              label={transmittalCartStore.selectedCount} 
              color="primary" 
              size="small" 
            />
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Содержимое */}
        <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {isLoading ? (
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress size={24} />
            </Box>
          ) : error ? (
            <Box sx={{ p: 2 }}>
              <Alert severity="error" sx={{ fontSize: '0.875rem' }}>{error}</Alert>
            </Box>
          ) : transmittalCartStore.isEmpty ? (
            <Box sx={{ 
              p: 3,
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'text.secondary',
              textAlign: 'center'
            }}>
              <Typography variant="body2" color="text.secondary">
                {t('transmittals.no_selected_documents')}
              </Typography>
            </Box>
          ) : (
            <>
              {/* Список ревизий */}
              <List sx={{ 
                flex: 1, 
                overflow: 'auto', 
                p: 0,
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
                {selectedRevisions.map((revision, index) => (
                  <React.Fragment key={revision.id}>
                    <ListItem sx={{ px: 2, py: 1 }}>
                      <ListItemText
                        primary={
                          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '0.875rem' }}>
                              {revision.document_number || `DOC-${revision.document_id}`}
                            </span>
                            <Chip 
                              label={`Rev. ${revision.revision_description_code || 'N/A'}${revision.revision_number}`} 
                              size="small" 
                              color="secondary"
                              sx={{ fontSize: '0.75rem', height: 20 }}
                            />
                          </span>
                        }
                        secondary={
                          <span style={{ display: 'flex', gap: '4px', fontSize: '0.75rem', color: 'inherit' }}>
                            <span>{revision.file_name}</span>
                            <span>{formatFileSize(revision.file_size)}</span>
                          </span>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={() => onRemoveRevision(revision.id)}
                          size="small"
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < transmittalCartStore.selectedCount - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>

              {/* Кнопки действий */}
              <Box sx={{ 
                p: 2, 
                borderTop: 1, 
                borderColor: 'divider',
                display: 'flex',
                gap: 1
              }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={onClearAll}
                  disabled={isLoading}
                  sx={{ flex: 1 }}
                >
                  {t('transmittals.clear')}
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<SendIcon />}
                  onClick={() => setCreateDialogOpen(true)}
                  disabled={isLoading}
                  sx={{ flex: 1 }}
                >
                  {t('transmittals.create_button')}
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Paper>

      {/* Диалог создания трансмиттала */}
      <TransmittalDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreateTransmittal={onCreateTransmittal}
        selectedRevisions={selectedRevisions}
        onRemoveRevision={onRemoveRevision}
        formatFileSize={formatFileSize}
        formatDate={formatDate}
        isLoading={isLoading}
        error={error}
        onShowNotification={onShowNotification}
      />
    </>
  );
});
