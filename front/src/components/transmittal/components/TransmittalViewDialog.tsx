import React, { useEffect } from 'react';
import { Dialog } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { observer } from 'mobx-react-lite';
import { transmittalsApi, documentsApi } from '../../../api/client';
import referenceDataStore from '../../../stores/ReferenceDataStore';
import TransmittalDialog from './TransmittalDialog';
import { transmittalStore } from '../../../stores/TransmittalStore';
import { documentStore } from '../../../stores/DocumentStore';
import { DocumentViewer } from '../../document';

interface TransmittalViewDialogProps {
  open: boolean;
  transmittalId: number | null;
  onClose: () => void;
}

const TransmittalViewDialog: React.FC<TransmittalViewDialogProps> = observer(({ open, transmittalId, onClose }) => {
  const { t } = useTranslation();
  const [docViewerOpen, setDocViewerOpen] = React.useState(false);
  const [docViewerId, setDocViewerId] = React.useState<number | null>(null);
  const [docData, setDocData] = React.useState<any | null>(null);
  const [docLoading, setDocLoading] = React.useState(false);

  useEffect(() => {
    const load = async () => {
      if (!open || !transmittalId) return;
      try { await referenceDataStore.loadAllReferenceData(); } catch {}
      await transmittalStore.loadTransmittalDetails(transmittalId);
    };
    load();
  }, [open, transmittalId]);

  // Когда меняется transmittalId или открываем диалог, сразу показываем лоадер, чтобы не мерцал предыдущий список
  useEffect(() => {
    if (open) {
      // Если id поменялся — явно сбросим данные перед загрузкой (дублирует логику в сторе, но даёт мгновенный UI-эффект)
      transmittalStore.selectedTransmittal = null as any;
      transmittalStore.selectedRevisions = [] as any;
    }
  }, [open, transmittalId]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth PaperProps={{ sx: { height: '80vh', maxHeight: '800px' } }}>
      <TransmittalDialog
        open={open}
        onClose={onClose}
        readOnly
        initialData={{
          transmittal_number: transmittalStore.selectedTransmittal?.transmittal_number,
          title: transmittalStore.selectedTransmittal?.title,
          recipient_id: transmittalStore.selectedTransmittal?.recipient_id,
          status: transmittalStore.selectedTransmittal?.status,
        }}
        revisions={transmittalStore.selectedRevisions}
        onOpenDocument={async (documentId) => {
          setDocViewerId(documentId);
          setDocLoading(true);
          setDocData(null);
          try {
            const doc = await documentsApi.getById(documentId);
            setDocData(doc);
          } catch {}
          setDocLoading(false);
          setDocViewerOpen(true);
        }}
        titleOverride={t('transmittals.view_title', { defaultValue: 'Просмотр трансмиттала' })}
        formatFileSize={(bytes) => {
          // Простейшее форматирование
          try {
            if (bytes == null) return '';
            const kb = bytes / 1024;
            if (kb < 1024) return `${kb.toFixed(1)} KB`;
            const mb = kb / 1024;
            return `${mb.toFixed(1)} MB`;
          } catch {
            return String(bytes);
          }
        }}
        formatDate={(date) => date}
        isLoading={transmittalStore.detailsLoading}
        error={transmittalStore.detailsError}
      />
      <DocumentViewer
        open={docViewerOpen}
        document={docData}
        documentId={docViewerId}
        isCreating={false}
        onClose={() => {
          setDocViewerOpen(false);
          setDocViewerId(null);
          setDocData(null);
        }}
        onNewRevision={() => {}}
        onCompareRevisions={() => {}}
        onCreateDocument={undefined}
        onSaveDocument={undefined}
        onOpenComments={undefined}
      />
    </Dialog>
  );
});

export default TransmittalViewDialog;


