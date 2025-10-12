import React from 'react';
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
  ShoppingCart as CartIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { observer } from 'mobx-react-lite';

export interface SelectedRevision {
  id: number;
  document_id: number;
  document_title: string;
  document_number: string;
  revision_number: string;
  file_name: string;
  file_size: number;
  created_at: string;
}

export interface TransmittalCartProps {
  // Данные
  selectedRevisions: SelectedRevision[];
  isLoading?: boolean;
  error?: string | null;
  
  // Обработчики
  onRemoveRevision: (revisionId: number) => void;
  onClearAll: () => void;
  onCreateTransmittal: () => void;
  
  // Утилиты
  formatFileSize: (bytes: number) => string;
  formatDate: (date: string) => string;
}

export const TransmittalCart: React.FC<TransmittalCartProps> = observer(({
  selectedRevisions,
  isLoading = false,
  error = null,
  onRemoveRevision,
  onClearAll,
  onCreateTransmittal,
  formatFileSize,
  formatDate,
}) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Paper sx={{ p: 2, minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2, minHeight: 200 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CartIcon color="primary" />
          <Typography variant="h6">
            Корзина трансмиттала
          </Typography>
          <Chip 
            label={selectedRevisions.length} 
            color="primary" 
            size="small" 
          />
        </Box>
        
        {selectedRevisions.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={onClearAll}
              disabled={isLoading}
            >
              Очистить все
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<SendIcon />}
              onClick={onCreateTransmittal}
              disabled={isLoading}
            >
              Создать трансмиттал
            </Button>
          </Box>
        )}
      </Box>

      {selectedRevisions.length === 0 ? (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          py: 4,
          color: 'text.secondary'
        }}>
          <CartIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
          <Typography variant="body1" color="text.secondary">
            Корзина пуста
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Выберите документы в таблице для добавления в трансмиттал
          </Typography>
        </Box>
      ) : (
        <List sx={{ maxHeight: 400, overflow: 'auto' }}>
          {selectedRevisions.map((revision, index) => (
            <React.Fragment key={revision.id}>
              <ListItem sx={{ px: 0 }}>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        {revision.document_number || `DOC-${revision.document_id}`}
                      </Typography>
                      <Chip 
                        label={`Rev. ${revision.revision_number}`} 
                        size="small" 
                        color="secondary" 
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
                        {revision.document_title}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, fontSize: '0.75rem', color: 'text.secondary' }}>
                        <span>{revision.file_name}</span>
                        <span>{formatFileSize(revision.file_size)}</span>
                        <span>{formatDate(revision.created_at)}</span>
                      </Box>
                    </Box>
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
              {index < selectedRevisions.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      )}
    </Paper>
  );
});
