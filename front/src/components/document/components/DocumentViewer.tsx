import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
} from '@mui/material';
import { 
  UploadFile as UploadFileIcon, 
  Comment as CommentIcon, 
} from '@mui/icons-material';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { userStore } from '../../../stores/UserStore';
import type { Document as ApiDocument } from '../../../api/client';
import ConfirmDialog from '../../ConfirmDialog';
import NotificationSnackbar from '../../NotificationSnackbar';

// Импортируем созданные компоненты
import DocumentForm from './DocumentForm';
import DocumentFileUpload from './DocumentFileUpload';
import DocumentRevisionsTable from './DocumentRevisionsTable';
import DocumentMetadata from './DocumentMetadata';

// Импортируем созданные хуки
import { useDocumentViewerState } from '../hooks/useDocumentViewerState';
import { useDocumentFileUpload } from '../hooks/useDocumentFileUpload';
import { useDocumentRevisions } from '../hooks/useDocumentRevisions';
import { useDocumentValidation } from '../hooks/useDocumentValidation';
import { useDocumentPermissions } from '../hooks/useDocumentPermissions';
import { useDocumentProjectData } from '../hooks/useDocumentProjectData';
import { disciplineStore } from '../../../stores/DisciplineStore';

interface DocumentViewerProps {
  open: boolean;
  document: ApiDocument | null;
  documentId?: number | null;
  isCreating?: boolean;
  onClose: () => void;
  onNewRevision: () => void;
  onCompareRevisions: (r1: string, r2: string) => void;
  onCreateDocument?: (documentData: any) => Promise<void>;
  onSaveDocument?: (documentData: any) => Promise<void>;
  onOpenComments?: () => void;
}

const DocumentViewer: React.FC<DocumentViewerProps> = observer(({
  open,
  document,
  documentId,
  isCreating = false,
  onClose,
  onNewRevision,
  onCompareRevisions,
  onCreateDocument,
  onSaveDocument,
  onOpenComments,
}) => {
  const { t } = useTranslation();
  
  // Локальное состояние для загрузки (как в старом коде)
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Используем созданные хуки
  const documentState = useDocumentViewerState({ 
    document, 
    documentId, 
    isCreating, 
    onSaveDocument: onSaveDocument 
  });
  const fileUpload = useDocumentFileUpload();
  const revisions = useDocumentRevisions({ documentId, open });
  const projectData = useDocumentProjectData({ documentId, document, open, isCreating, isEditing: documentState.isEditing });
  const permissions = useDocumentPermissions({ document });
  
  const validation = useDocumentValidation({
    documentData: documentState.documentData,
    fileMetadata: fileUpload.fileMetadata,
    isCreating,
    isEditing: documentState.isEditing,
  });

  // Обработчики событий
  const handleClose = () => {
    // Очищаем все данные при закрытии
    documentState.cancelEditing();
    documentState.hideNotification();
    
    // Очищаем загруженный файл
    fileUpload.handleRemoveFile();
    
    // Очищаем состояние загрузки (как в старом коде)
    setIsUploadingDocument(false);
    setUploadProgress(0);
    
    // Очищаем ревизии
    if (documentId) {
      revisions.clearRevisions(documentId);
    }
    
    // Очищаем типы документов
    projectData.setProjectDocumentTypes([]);
    
    // Очищаем дисциплины (для создания документа)
    if (isCreating) {
      disciplineStore.clearDisciplines();
    }
    
    onClose();
  };

  const handleEdit = () => {
    documentState.startEditing();
  };

  const handleCancel = () => {
    documentState.cancelEditing();
  };


  return (
    <>
      <Dialog 
        open={open} 
        onClose={handleClose} 
        maxWidth="xl" 
        fullWidth
        PaperProps={{
          sx: { height: '95vh', maxHeight: '95vh', width: '95vw', maxWidth: '95vw' }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            {isCreating ? t('document.create_title') : `${t('document.details_title')}: ${document?.number}`}
          </span>
          {!isCreating && document?.created_at && (
            <span style={{ fontSize: '0.875rem', color: 'rgba(0, 0, 0, 0.6)' }}>
              {t('document.created')} {new Date(document.created_at).toLocaleDateString('ru-RU')}
              {projectData.documentCreator && ` ${t('document.created_by')} ${projectData.documentCreator.full_name}`}
            </span>
          )}
        </DialogTitle>
        
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          {/* Метаданные документа */}
          <DocumentMetadata 
            document={document}
            documentCreator={projectData.documentCreator}
            isCreating={isCreating}
          />

          {/* Форма документа */}
          <DocumentForm
            document={document}
            documentData={documentState.documentData}
            setDocumentData={documentState.updateDocumentData}
            validationErrors={validation.validationErrors}
            isCreating={isCreating}
            isEditing={documentState.isEditing}
            projectDocumentTypes={projectData.projectDocumentTypes}
            loadingProjectData={projectData.loadingProjectData}
            loadDocumentTypes={projectData.loadDocumentTypes}
          />

          {/* Нижняя часть - таблица ревизий */}
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">{t('document.revisions_history')}</Typography>
              {isCreating ? (
                <DocumentFileUpload
                  fileInputRef={fileUpload.fileInputRef}
                  handleFileUpload={fileUpload.handleFileUpload}
                  fileMetadata={fileUpload.fileMetadata}
                  validationErrors={validation.validationErrors}
                />
              ) : documentId ? (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {userStore.currentUser?.role !== 'viewer' && (
                    <Button
                      variant="contained"
                      startIcon={<UploadFileIcon />}
                      onClick={onNewRevision}
                    >
                      {t('document.new_revision')}
                    </Button>
                  )}
                  <Button
                    variant="outlined"
                    startIcon={<CommentIcon />}
                    onClick={onOpenComments}
                  >
                    {t('document.comments')}
                  </Button>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t('document.revisions_after_creation')}
                </Typography>
              )}
            </Box>
          
            {/* Таблица ревизий */}
            <DocumentRevisionsTable
              documentId={documentId || null}
              isCreating={isCreating}
              fileMetadata={fileUpload.fileMetadata}
              workflowPresetSequence={projectData.workflowPresetSequence}
              isUploadingDocument={isUploadingDocument}
              uploadProgress={uploadProgress}
              onDownloadRevision={revisions.handleDownloadRevision}
              onCompareRevisions={onCompareRevisions}
              onOpenCancelRevisionDialog={revisions.handleOpenCancelRevisionDialog}
              onRemoveFile={fileUpload.handleRemoveFile}
              getLatestActiveRevision={revisions.getLatestActiveRevision}
              formatDate={revisions.formatDate}
              getRevisionStatusColor={revisions.getRevisionStatusColor}
              canCancelRevision={permissions.canCancelRevision}
            />
          </Box>
        </DialogContent>
        
        <DialogActions>
          {isCreating ? (
            <>
              <Button onClick={handleClose}>{t('common.cancel')}</Button>
              <Button 
                onClick={async () => {
                  if (validation.validate()) {
                    setIsUploadingDocument(true);
                    setUploadProgress(0);
                    try {
                      await onCreateDocument?.({
                        ...documentState.documentData,
                        uploadedFile: fileUpload.uploadedFile,
                        revisionDescription: projectData.workflowPresetSequence.length > 0 ? projectData.workflowPresetSequence[0].revision_description : null,
                        revisionStep: projectData.workflowPresetSequence.length > 0 ? projectData.workflowPresetSequence[0].revision_step : null,
                        onProgress: (progress: number) => {
                          setUploadProgress(progress);
                        }
                      });
                    } catch (error) {
                      console.error('Error creating document:', error);
                    } finally {
                      setIsUploadingDocument(false);
                      setUploadProgress(0);
                    }
                  }
                }}
                variant="contained" 
                disabled={isUploadingDocument}
              >
                {isUploadingDocument ? t('document.creating') : t('document.create_document')}
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleClose}>{t('common.close')}</Button>
              {documentState.isEditing ? (
                <>
                  <Button onClick={handleCancel}>{t('common.cancel')}</Button>
                  <Button 
                    onClick={() => {
                      if (validation.validate()) {
                        documentState.saveEditing();
                        documentState.showNotification(t('document.saved_successfully'), 'success');
                      }
                    }} 
                    variant="contained"
                  >
                    {t('common.save')}
                  </Button>
                </>
              ) : (
                permissions.canEditCurrentDocument() && (
                  <Button onClick={handleEdit} variant="contained">
                    {t('common.edit')}
                  </Button>
                )
              )}
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Диалог подтверждения отмены ревизии */}
      <ConfirmDialog
        open={revisions.cancelRevisionDialog.isOpen}
        title={t('documents.cancel_revision')}
        content={t('documents.cancel_revision_confirm')}
        onConfirm={() => revisions.handleCancelRevision(revisions.cancelRevisionDialog.itemToDelete)}
        onClose={revisions.cancelRevisionDialog.closeDeleteDialog}
        loading={revisions.cancelRevisionDialog.isLoading}
      />

      {/* Уведомления */}
      <NotificationSnackbar
        open={documentState.notificationOpen}
        message={documentState.notificationMessage}
        severity={documentState.notificationSeverity}
        onClose={() => documentState.hideNotification()}
      />
    </>
  );
});

export default DocumentViewer;