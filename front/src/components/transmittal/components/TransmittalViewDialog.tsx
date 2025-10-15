import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { transmittalsApi, documentsApi } from '../../../api/client';
import referenceDataStore from '../../../stores/ReferenceDataStore';
import TransmittalDialog from './TransmittalDialog';
import { transmittalStore } from '../../../stores/TransmittalStore';
import { DocumentViewer } from '../../document';
import { useTransmittalViewerState } from '../hooks/useTransmittalViewerState';
import NotificationSnackbar from '../../NotificationSnackbar';

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

  // Используем хук для редактирования
  const transmittalState = useTransmittalViewerState({
    transmittal: transmittalStore.selectedTransmittal,
    transmittalId,
    onSaveTransmittal: async (transmittalData) => {
      if (transmittalId) {
        await transmittalsApi.update(transmittalId, transmittalData);
        // Перезагружаем данные трансмиттала
        await transmittalStore.loadTransmittalDetails(transmittalId);
      }
    }
  });


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
      runInAction(() => {
        transmittalStore.selectedTransmittal = null as any;
        transmittalStore.selectedRevisions = [] as any;
      });
    }
  }, [open, transmittalId]);

  // Обработчики для редактирования
  const handleEdit = () => {
    transmittalState.startEditing();
  };

  const handleCancel = () => {
    transmittalState.cancelEditing();
  };

  const handleSave = () => {
    transmittalState.saveEditing();
  };

  const handleClose = () => {
    transmittalState.cancelEditing();
    transmittalState.hideNotification();
    onClose();
  };

  return (
    <>
      <TransmittalDialog
        open={open}
        onClose={handleClose}
        readOnly
        initialData={{
          transmittal_number: transmittalState.transmittalData.transmittal_number,
          title: transmittalState.transmittalData.title,
          direction: transmittalStore.selectedTransmittal?.direction || undefined,
          counterparty_id: transmittalState.transmittalData.counterparty_id,
          status: transmittalStore.selectedTransmittal?.status
        }}
        isEditing={transmittalState.isEditing}
        onUpdateTransmittalData={(field: string, value: any) => transmittalState.updateTransmittalData(field as keyof typeof transmittalState.transmittalData, value)}
        onEdit={handleEdit}
        onCancel={handleCancel}
        onSave={handleSave}
        hasChanges={transmittalState.hasChanges}
        revisions={transmittalStore.selectedRevisions}
        isLoading={transmittalStore.detailsLoading}
        onOpenDocument={async (documentId) => {
          setDocViewerId(documentId);
          setDocData(null);
          try {
            const doc = await documentsApi.getById(documentId);
            setDocData(doc);
          } catch {}
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
      
      {/* Уведомления */}
      <NotificationSnackbar
        open={transmittalState.notificationOpen}
        message={transmittalState.notificationMessage}
        severity={transmittalState.notificationSeverity}
        onClose={transmittalState.hideNotification}
      />
    </>
  );
});

export default TransmittalViewDialog;


