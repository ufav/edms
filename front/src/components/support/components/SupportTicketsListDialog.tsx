import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Close as CloseIcon, Add as AddIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { supportApi } from '../../../api/client';
import SupportChatDialog from './SupportChatDialog';

interface SupportTicketsListDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateNew: () => void;
}

interface SupportTicket {
  id: number;
  subject: string;
  status: string;
  created_at: string;
  last_message_at: string;
}

const SupportTicketsListDialog: React.FC<SupportTicketsListDialogProps> = ({
  open,
  onClose,
  onCreateNew,
}) => {
  const { t } = useTranslation();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    if (open) {
      loadTickets();
    }
  }, [open]);

  const loadTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await supportApi.getTickets();
      setTickets(response);
    } catch (err: any) {
      let errorMessage = t('support.load_error');
      
      if (err?.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleTicketClick = (ticketId: number) => {
    setSelectedTicketId(ticketId);
    setChatOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'default';
      case 'in_progress':
        return 'primary';
      case 'resolved':
        return 'success';
      case 'closed':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    return t(`support.status.${status}`) || status;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <>
      <Dialog open={open && !chatOpen} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">{t('support.my_tickets') || 'Мои обращения'}</Typography>
            <Box>
              <IconButton onClick={onCreateNew} color="primary">
                <AddIcon />
              </IconButton>
              <IconButton onClick={onClose}>
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : tickets.length === 0 ? (
            <Box textAlign="center" p={3}>
              <Typography variant="body2" color="text.secondary">
                {t('support.no_tickets') || 'У вас пока нет обращений'}
              </Typography>
            </Box>
          ) : (
            <List>
              {tickets.map((ticket) => (
                <ListItem
                  key={ticket.id}
                  button
                  onClick={() => handleTicketClick(ticket.id)}
                  sx={{
                    border: '1px solid #e0e0e0',
                    borderRadius: 1,
                    mb: 1,
                    '&:hover': { backgroundColor: '#f5f5f5' },
                  }}
                >
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle1">{ticket.subject}</Typography>
                        <Chip
                          label={getStatusLabel(ticket.status)}
                          color={getStatusColor(ticket.status) as any}
                          size="small"
                        />
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(ticket.last_message_at)}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>

      {selectedTicketId && (
        <SupportChatDialog
          open={chatOpen}
          ticketId={selectedTicketId}
          onClose={() => {
            setChatOpen(false);
            setSelectedTicketId(null);
            loadTickets();
          }}
        />
      )}
    </>
  );
};

export default SupportTicketsListDialog;

