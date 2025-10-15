import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
  Chip,
} from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { transmittalStore, type Transmittal } from '../../stores/TransmittalStore';
import referenceDataStore from '../../stores/ReferenceDataStore';

interface TransmittalViewerProps {
  open: boolean;
  transmittalId: number | null;
  onClose: () => void;
}

const TransmittalViewer: React.FC<TransmittalViewerProps> = observer(({ open, transmittalId, onClose }) => {
  const { t } = useTranslation();
  const [transmittal, setTransmittal] = useState<Transmittal | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!transmittalId) {
        setTransmittal(null);
        return;
      }
      const existing = transmittalStore.getTransmittalById(transmittalId);
      if (existing) {
        setTransmittal(existing);
        return;
      }
      try {
        await transmittalStore.loadTransmittals();
        const after = transmittalStore.getTransmittalById(transmittalId) || null;
        setTransmittal(after);
      } catch {
        setTransmittal(null);
      }
    };
    if (open) load();
  }, [open, transmittalId]);

  const content = (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
      <Box>
        <Typography variant="subtitle2" color="text.secondary">{t('transmittals.columns.number')}</Typography>
        <Typography variant="body1">{transmittal?.transmittal_number || '-'}</Typography>
      </Box>
      <Box>
        <Typography variant="subtitle2" color="text.secondary">{t('transmittals.columns.status')}</Typography>
        <Chip
          label={transmittal ? transmittalStore.getTransmittalStatusLabel(transmittal.status, t) : '-'}
          color={transmittal ? (transmittalStore.getTransmittalStatusColor(transmittal.status) as any) : 'default'}
          size="small"
          sx={{ mt: 0.5, width: 'fit-content' }}
        />
      </Box>
      <Box sx={{ gridColumn: '1 / -1' }}>
        <Typography variant="subtitle2" color="text.secondary">{t('transmittals.columns.title')}</Typography>
        <Typography variant="body1">{transmittal?.title || '-'}</Typography>
      </Box>
      <Box sx={{ gridColumn: '1 / -1' }}>
        <Typography variant="subtitle2" color="text.secondary">{t('common.description')}</Typography>
        <Typography variant="body1">{transmittal?.description || '-'}</Typography>
      </Box>
      <Divider sx={{ gridColumn: '1 / -1' }} />
      <Box>
        <Typography variant="subtitle2" color="text.secondary">{t('transmittals.columns.sender')}</Typography>
        <Typography variant="body1">{transmittal?.sender_id ? referenceDataStore.getUserName(transmittal.sender_id) : t('transmittals.not_sent')}</Typography>
      </Box>
      <Box>
        <Typography variant="subtitle2" color="text.secondary">{t('transmittals.columns.recipient')}</Typography>
        <Typography variant="body1">{transmittal?.counterparty_id ? referenceDataStore.getCompanyName(transmittal.counterparty_id) : '-'}</Typography>
      </Box>
      <Box>
        <Typography variant="subtitle2" color="text.secondary">{t('transmittals.columns.sent')}</Typography>
        <Typography variant="body1">{transmittalStore.formatDate(transmittal?.transmittal_date || null)}</Typography>
      </Box>
      <Box>
        <Typography variant="subtitle2" color="text.secondary">{t('transmittals.columns.received')}</Typography>
        <Typography variant="body1">{transmittalStore.formatDate(transmittal?.transmittal_date || null)}</Typography>
      </Box>
      <Box>
        <Typography variant="subtitle2" color="text.secondary">{t('transmittals.columns.created_by')}</Typography>
        <Typography variant="body1">{transmittal ? referenceDataStore.getUserName(transmittal.created_by) : '-'}</Typography>
      </Box>
      <Box>
        <Typography variant="subtitle2" color="text.secondary">ID</Typography>
        <Typography variant="body1">{transmittal?.id ?? '-'}</Typography>
      </Box>
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { height: '80vh' } }}
    >
      <DialogTitle>
        {t('transmittals.view_title', { defaultValue: 'Трансмиттал' })}{transmittal?.transmittal_number ? `: ${transmittal.transmittal_number}` : ''}
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {content}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">{t('common.close')}</Button>
      </DialogActions>
    </Dialog>
  );
});

export default TransmittalViewer;


