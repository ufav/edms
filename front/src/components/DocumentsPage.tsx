import React from 'react';
import {
  Box,
  Typography,
  Button,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Add as AddIcon,
  UploadFile as UploadFileIcon,
} from '@mui/icons-material';
import { observer } from 'mobx-react-lite';
import { projectStore } from '../stores/ProjectStore';
import { documentStore } from '../stores/DocumentStore';
import { documentRevisionStore } from '../stores/DocumentRevisionStore';
import ProjectRequired from './ProjectRequired';
import ConfirmDialog from './ConfirmDialog';
import { workflowApi, documentsApi } from '../api/client';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useTranslation } from 'react-i18next';
import { useRefreshStore } from '../hooks/useRefreshStore';
import { useDeleteDialog } from '../hooks/useDeleteDialog';
import { DocumentViewer, DocumentRevisionDialog, DocumentCompareDialog } from './document';
import DocumentComments from './document/components/DocumentComments';
import NotificationSnackbar from './NotificationSnackbar';
import { useDocumentFilters } from './document/hooks/useDocumentFilters';
import { useDocumentPagination } from './document/hooks/useDocumentPagination';
import { useDocumentSettings } from './document/hooks/useDocumentSettings';
import { useDocumentActions } from './document/hooks/useDocumentActions';
import { useDocumentDialogs } from './document/hooks/useDocumentDialogs';
import { useDocumentBatchUpload } from './document/hooks/useDocumentBatchUpload';
import { useDocumentDataLoading } from './document/hooks/useDocumentDataLoading';
import { DocumentFilters } from './document/components/DocumentFilters';
import { DocumentCards } from './document/components/DocumentCards';
import { DocumentTable } from './document/components/DocumentTable';
import { DocumentBatchUploadDialog } from './document/components/DocumentBatchUploadDialog';
import { DocumentSettingsDialog } from './document/components/DocumentSettingsDialog';
import { DocumentWorkflowDialog } from './document/components/DocumentWorkflowDialog';

const DocumentsPage: React.FC = observer(() => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { refreshDocuments } = useRefreshStore();
  const { isViewer } = useCurrentUser();
  
  const {
    filterStatus,
    searchTerm,
    selectedDisciplineId,
    setFilterStatus,
    setSearchTerm,
    filteredDocuments,
  } = useDocumentFilters();

  const {
    page,
    rowsPerPage,
    handleChangePage,
    handleChangeRowsPerPage,
    paginatedDocuments,
    totalCount,
    rowsPerPageOptions,
  } = useDocumentPagination({
    filteredDocuments,
    dependencies: [filterStatus, searchTerm, selectedDisciplineId]
  });

  const {
    settingsOpen,
    visibleCols,
    setSettingsOpen,
    handleColumnVisibilityChange,
    handleSettingsClose,
  } = useDocumentSettings();

  const {
    batchUploadOpen,
    newRevisionOpen,
    documentDetailsOpen,
    compareOpen,
    workflowOpen,
    commentsOpen,
    selectedDocumentForWorkflow,
    workflowTemplates,
    workflowStatus,
    handleOpenBatchUpload,
    handleOpenNewRevision,
    handleOpenDocumentDetails,
    handleOpenCompare,
    handleOpenComments,
    handleCloseBatchUpload,
    handleCloseNewRevision,
    handleCloseDocumentDetails,
    handleCloseCompare,
    handleCloseWorkflow,
    handleCloseComments,
    handleCloseWorkflowWithReset,
  } = useDocumentDialogs();

  const {
    isCreatingDocument,
    selectedDocument,
    selectedDocumentId,
    successNotification,
    setIsCreatingDocument,
    setSelectedDocument,
    handleUpload,
    handleCreateDocument,
    handleSaveDocument,
    handleShowDocumentDetails,
    handleDownload,
    handleCloseNotification,
  } = useDocumentActions({ 
    t, 
    onCloseDialog: handleCloseDocumentDetails 
  });

  const {
    metadataFile,
    uploading,
    handleMetadataFileSelect,
    handleBatchUpload,
    canUpload,
  } = useDocumentBatchUpload({
    t,
    onClose: handleCloseBatchUpload,
  });

  useDocumentDataLoading();

  const deleteDialog = useDeleteDialog();
  
  const { refreshDocuments: refreshDocumentsList } = useRefreshStore();

  const handleDeleteDocument = async (document: any) => {
    try {
      await documentsApi.softDelete(document.id);
      await refreshDocumentsList();
    } catch (error) {
      throw error;
    }
  };
  


  const handleStartWorkflowWithTemplate = async (templateId: number) => {
    if (!selectedDocumentForWorkflow) return;

    try {
      await workflowApi.startWorkflow(selectedDocumentForWorkflow.id, templateId);
      alert(t('documents.workflow_started'));
      handleCloseWorkflow();
      
      documentStore.loadDocuments(projectStore.selectedProject!.id);
    } catch (error) {
      alert(t('documents.workflow_error'));
    }
  };



  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  };




  return (
    <ProjectRequired>
    <Box sx={{ 
      width: '100%', 
      minWidth: 0, 
      p: 3, 
      flex: 1, 
      display: 'flex', 
      flexDirection: 'column'
    }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: isMobile ? 'flex-start' : 'center', 
          mb: 3,
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 2 : 0
        }}>
          <Typography variant={isMobile ? "h5" : "h4"} component="h1">
            {t('menu.documents')} {projectStore.selectedProject && `- ${projectStore.selectedProject.name}`}
          </Typography>
          {!isViewer && (
          <Box sx={{ display: 'flex', gap: 1, width: isMobile ? '100%' : 'auto' }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                handleUpload();
                handleOpenDocumentDetails();
              }}
              sx={{ backgroundColor: '#1976d2', flex: isMobile ? 1 : 'none' }}
            >
              {t('documents.upload')}
            </Button>
            <Button
              variant="outlined"
              startIcon={<UploadFileIcon />}
              onClick={handleOpenBatchUpload}
              sx={{ flex: isMobile ? 1 : 'none' }}
            >
              {t('documents.import_by_paths') || 'Импорт по путям (Excel)'}
            </Button>
          </Box>
          )}
        </Box>

        <DocumentFilters
          searchTerm={searchTerm}
          filterStatus={filterStatus}
          onSearchChange={setSearchTerm}
          onStatusChange={setFilterStatus}
          onSettingsClick={() => setSettingsOpen(true)}
        />

        <Box sx={{ 
          width: '100%', 
          minWidth: 0, 
          flex: 1
        }}>

          {isMobile ? (
            <Box sx={{ 
              width: '100%', 
              minWidth: 0, 
              flex: 1
            }}>
              <DocumentCards
              documents={paginatedDocuments}
              totalCount={totalCount}
              isLoading={documentStore.isLoading}
              error={documentStore.error}
                        page={page}
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={rowsPerPageOptions}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
              onShowDetails={(documentId) => {
                handleShowDocumentDetails(documentId);
                handleOpenDocumentDetails();
              }}
              onDownload={handleDownload}
              onDelete={(document) => {
                deleteDialog.openDeleteDialog(document);
              }}
              formatFileSize={formatFileSize}
              formatDate={formatDate}
              language={i18n.language}
              />
            </Box>
          ) : (
            <Box sx={{ 
              width: '100%', 
              minWidth: 0, 
              flex: 1
            }}>
              <DocumentTable
                documents={paginatedDocuments}
                totalCount={totalCount}
                isLoading={documentStore.isLoading}
                error={documentStore.error}
                visibleCols={visibleCols}
                  page={page}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={rowsPerPageOptions}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                onShowDetails={(documentId) => {
                  handleShowDocumentDetails(documentId);
                  handleOpenDocumentDetails();
                }}
                onDownload={handleDownload}
                onDelete={(document) => {
                  deleteDialog.openDeleteDialog(document);
                }}
                formatFileSize={formatFileSize}
                formatDate={formatDate}
                language={i18n.language}
              />
            </Box>
          )}
        </Box>


        <DocumentSettingsDialog
          open={settingsOpen}
          visibleCols={visibleCols}
          onClose={handleSettingsClose}
          onColumnVisibilityChange={handleColumnVisibilityChange}
        />

        <DocumentBatchUploadDialog
          open={batchUploadOpen} 
          metadataFile={metadataFile}
          uploading={uploading}
          canUpload={canUpload}
          onClose={handleCloseBatchUpload}
          onFileSelect={handleMetadataFileSelect}
          onUpload={handleBatchUpload}
        />

        <DocumentViewer
          open={documentDetailsOpen}
          document={selectedDocument}
          documentId={selectedDocumentId}
          isCreating={isCreatingDocument}
          onClose={() => {
            handleCloseDocumentDetails();
            setSelectedDocument(null);
            setIsCreatingDocument(false);
            if (selectedDocumentId) {
              documentRevisionStore.clearRevisions(selectedDocumentId);
            }
          }}
          onNewRevision={handleOpenNewRevision}
          onCompareRevisions={handleOpenCompare}
          onCreateDocument={handleCreateDocument}
          onSaveDocument={handleSaveDocument}
          onOpenComments={handleOpenComments}
        />

        <DocumentRevisionDialog
          open={newRevisionOpen}
          documentId={selectedDocumentId}
          onClose={handleCloseNewRevision}
          onSuccess={() => {
            if (selectedDocumentId) {
              documentRevisionStore.reloadRevisions(selectedDocumentId);
            }
            refreshDocuments();
          }}
        />

        <DocumentCompareDialog
          open={compareOpen}
          documentId={selectedDocumentId}
          onClose={handleCloseCompare}
        />


        <DocumentWorkflowDialog
          open={workflowOpen}
          selectedDocument={selectedDocumentForWorkflow}
          workflowTemplates={workflowTemplates}
          workflowStatus={workflowStatus}
          onClose={handleCloseWorkflow}
          onCloseWithReset={handleCloseWorkflowWithReset}
          onStartWorkflow={handleStartWorkflowWithTemplate}
        />

        <ConfirmDialog
          open={deleteDialog.isOpen}
          title={t('documents.delete_confirm_title')}
          content={t('documents.delete_confirm_content')}
          confirmText={t('documents.delete_confirm')}
          cancelText={t('documents.cancel')}
          onConfirm={() => deleteDialog.confirmDelete((document) => handleDeleteDocument(document))}
          onClose={deleteDialog.closeDeleteDialog}
          loading={deleteDialog.isLoading}
        />

        <DocumentComments
          open={commentsOpen}
          documentId={selectedDocumentId}
          onClose={handleCloseComments}
        />

        <NotificationSnackbar
          open={successNotification.open}
          message={successNotification.message}
          severity="success"
          onClose={handleCloseNotification}
        />
      </Box>
    </ProjectRequired>
  );
});

export default DocumentsPage;