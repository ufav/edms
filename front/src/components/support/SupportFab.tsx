import React, { useState } from 'react';
import { Fab, Tooltip } from '@mui/material';
import { Support as SupportIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import SupportTicketDialog from './SupportTicketDialog';

const SupportFab: React.FC = () => {
  const { t } = useTranslation();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const handleOpenCreate = () => {
    setCreateDialogOpen(true);
  };

  return (
    <>
      <Tooltip title={t('support.create_ticket') || 'Создать обращение'} arrow placement="left">
        <Fab
          color="primary"
          aria-label="create support ticket"
          onClick={handleOpenCreate}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
          }}
        >
          <SupportIcon />
        </Fab>
      </Tooltip>

      <SupportTicketDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={() => {
          setCreateDialogOpen(false);
        }}
      />
    </>
  );
};

export default SupportFab;

