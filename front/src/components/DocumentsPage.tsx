import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  useTheme,
  useMediaQuery,
  IconButton,
  Badge,
} from '@mui/material';
import {
  Add as AddIcon,
  UploadFile as UploadFileIcon,
  Send as SendIcon,
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
import AppPagination from './AppPagination';
import { DocumentTable } from './document/components/DocumentTable';
import { DocumentBatchUploadDialog } from './document/components/DocumentBatchUploadDialog';
import { DocumentSettingsDialog } from './document/components/DocumentSettingsDialog';
import { DocumentWorkflowDialog } from './document/components/DocumentWorkflowDialog';
import { TransmittalCartModal, useActiveRevisions } from './transmittal';
import { transmittalCartStore } from '../stores/TransmittalCartStore';

const DocumentsPage: React.FC = observer(() => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { refreshDocuments } = useRefreshStore();
  const { isViewer } = useCurrentUser();
  
  // Состояние для выбранных документов в трансмиттал
  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([]);
  const [showSelectColumn, setShowSelectColumn] = useState(!isViewer); // Не показываем галочки для viewer
  const [cartModalOpen, setCartModalOpen] = useState(false); // Состояние модалки трансмитталов
  
  // Состояние для уведомлений трансмиттала
  const [transmittalNotification, setTransmittalNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // Хуки для работы с трансмитталами
  const { activeRevisions, refreshActiveRevisions } = useActiveRevisions();
  
  // Активные ревизии автоматически загружаются в useActiveRevisions хуке
  
  // Обновляем showSelectColumn при изменении роли пользователя
  useEffect(() => {
    setShowSelectColumn(!isViewer);
  }, [isViewer]);

  
  // Обработчик выбора документа
  const handleDocumentSelect = (documentId: number, selected: boolean) => {
    if (selected) {
      setSelectedDocuments(prev => [...prev, documentId]);
    } else {
      setSelectedDocuments(prev => prev.filter(id => id !== documentId));
    }
  };
  
  // Обработчик добавления выбранных документов в трансмиттал
  const handleAddToTransmittal = () => {
    (activeRevisions || []).forEach(activeRevision => {
      if (selectedDocuments.includes(activeRevision.document_id)) {
        transmittalCartStore.addRevision(activeRevision.id);
      }
    });
    // Очищаем выбор после добавления в трансмиттал
    setSelectedDocuments([]);
    // Открываем модалку трансмитталов
    setCartModalOpen(true);
  };

  // Функция для показа уведомлений трансмиттала
  const handleShowTransmittalNotification = (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setTransmittalNotification({
      open: true,
      message,
      severity
    });
  };

  // Функция для закрытия уведомлений трансмиттала
  const handleCloseTransmittalNotification = () => {
    setTransmittalNotification(prev => ({ ...prev, open: false }));
  };
  
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
    columnOrder,
    setSettingsOpen,
    handleColumnVisibilityChange,
    handleColumnOrderChange,
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
    onCloseDialog: handleCloseDocumentDetails,
    onRefreshActiveRevisions: () => {
      refreshActiveRevisions();
    }
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


  const handleDeleteDocument = async (document: any) => {
    try {
      await documentsApi.softDelete(document.id);
      await refreshDocuments();
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
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${day}.${month}.${year} ${hours}:${minutes}`;
    } catch (error) {
      return dateString;
    }
  };


  return (
    <ProjectRequired>
    <Box sx={{ 
      width: '100%', 
      minWidth: 0, 
      pt: 3, // padding только сверху
      px: 3, // padding только по бокам
      pb: 0, // убираем padding снизу
      height: !isMobile ? 'calc(100vh - 117px)' : '100vh', // Всегда вычитаем высоту пагинации для десктопа
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden', // Убираем прокрутку страницы
    }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: isMobile ? 'flex-start' : 'center', 
          mb: 3, // Возвращаем отступ снизу
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 2 : 0,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant={isMobile ? "h5" : "h4"} component="h1">
              {t('menu.documents')} {projectStore.selectedProject && `- ${projectStore.selectedProject.name}`}
            </Typography>
            
          </Box>
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
            {selectedDocuments.length > 0 && !isViewer && (
              <Button
                variant="contained"
                onClick={handleAddToTransmittal}
                sx={{ backgroundColor: '#1976d2', flex: isMobile ? 1 : 'none' }}
              >
{t('transmittals.add_to_transmittal')} ({selectedDocuments.length})
              </Button>
            )}
            
            {/* Кнопка корзины для мобильной версии */}
            {isMobile && transmittalCartStore.selectedCount > 0 && !isViewer && (
              <Badge badgeContent={transmittalCartStore.selectedCount} color="primary">
                <IconButton
                  onClick={() => setCartModalOpen(true)}
                  sx={{ 
                    color: 'primary.main',
                    border: '1px solid',
                    borderColor: 'primary.main',
                    '&:hover': {
                      backgroundColor: 'primary.light',
                      color: 'white'
                    }
                  }}
                  title={t('documents.open_transmittal_cart')}
                >
                  <SendIcon />
                </IconButton>
              </Badge>
            )}
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
          display: 'flex',
          flexDirection: 'column',
          flex: 1, // Занимаем оставшееся место
          minHeight: 0, // Важно! Позволяет flex-элементу сжиматься
          marginBottom: 0, // Убираем отступ снизу
          paddingBottom: 0, // Убираем padding снизу
          pt: 0, // Убираем отступ сверху
        }}>

          {isMobile ? (
            <Box sx={{ 
              width: '100%', 
              minWidth: 0, 
              flex: 1,
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
              flex: 1, // Занимаем всю высоту зеленого контейнера
              minHeight: 0, // Важно! Позволяет flex-элементу сжиматься
              display: 'flex',
              flexDirection: 'column',
              marginBottom: 0, // Убираем отступ снизу
              paddingBottom: 0, // Убираем padding снизу
            }}>
              <DocumentTable
                documents={paginatedDocuments}
                totalCount={totalCount}
                isLoading={documentStore.isLoading}
                error={documentStore.error}
                visibleCols={visibleCols}
                columnOrder={columnOrder}
                onShowDetails={(documentId) => {
                  handleShowDocumentDetails(documentId);
                  handleOpenDocumentDetails();
                }}
                onDownload={handleDownload}
                onDelete={(document) => {
                  deleteDialog.openDeleteDialog(document);
                }}
                showSelectColumn={showSelectColumn}
                selectedDocuments={selectedDocuments}
                onDocumentSelect={handleDocumentSelect}
                formatFileSize={formatFileSize}
                formatDate={formatDate}
                language={i18n.language}
              />
            </Box>
          )}
        </Box>

        {/* Фиксированная пагинация внизу экрана */}
        {!isMobile && !documentStore.isLoading && (
          <AppPagination
            count={totalCount}
            page={page + 1}
            onPageChange={(_, p) => handleChangePage(_, p - 1)}
            rowsPerPage={rowsPerPage}
            insetLeft={240}
            align="right"
            leftInfo={`${t('common.total_documents', { count: totalCount }).replace('{count}', totalCount.toLocaleString(i18n.language === 'ru' ? 'ru-RU' : 'en-US'))}`}
          />
        )}

        {/* Модалка трансмитталов */}
        <TransmittalCartModal
          open={cartModalOpen}
          selectedRevisionIds={transmittalCartStore.selectedRevisionIds}
          activeRevisions={activeRevisions || []}
          isLoading={transmittalCartStore.isLoading}
          error={transmittalCartStore.error}
          onClose={() => setCartModalOpen(false)}
          onRemoveRevision={transmittalCartStore.removeRevision}
          onClearAll={transmittalCartStore.clearAll}
          onCreateTransmittal={async (transmittalData) => {
            if (projectStore.selectedProject) {
              await transmittalCartStore.createTransmittal(transmittalData, projectStore.selectedProject.id);
              setCartModalOpen(false);
            }
          }}
          onShowNotification={handleShowTransmittalNotification}
          formatFileSize={formatFileSize}
          formatDate={formatDate}
        />

        {/* Кнопка открытия корзины трансмитталов в правом нижнем углу */}
        {!cartModalOpen && transmittalCartStore.selectedCount > 0 && !isViewer && (
          <Box
            sx={{
              position: 'fixed',
              bottom: 20,
              right: 20,
              zIndex: 1000,
            }}
          >
            <Badge badgeContent={transmittalCartStore.selectedCount} color="primary">
              <IconButton
                onClick={() => setCartModalOpen(true)}
                sx={{
                  backgroundColor: 'primary.main',
                  color: 'white',
                  width: 56,
                  height: 56,
                  boxShadow: 3,
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                    boxShadow: 6,
                  },
                }}
                title={t('documents.open_transmittal_cart')}
              >
                <SendIcon />
              </IconButton>
            </Badge>
          </Box>
        )}

        <DocumentSettingsDialog
          open={settingsOpen}
          visibleCols={visibleCols}
          columnOrder={columnOrder}
          onClose={handleSettingsClose}
          onColumnVisibilityChange={handleColumnVisibilityChange}
          onColumnOrderChange={handleColumnOrderChange}
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

        {/* Уведомления для трансмитталов */}
        <NotificationSnackbar
          open={transmittalNotification.open}
          message={transmittalNotification.message}
          severity={transmittalNotification.severity}
          onClose={handleCloseTransmittalNotification}
        />
      </Box>
    </ProjectRequired>
  );
});

export default DocumentsPage;