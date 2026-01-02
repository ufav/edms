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
import { useServerDocumentPagination } from './document/hooks/useServerDocumentPagination';
import { useDocumentSettings } from './document/hooks/useDocumentSettings';
import { useDocumentActions } from './document/hooks/useDocumentActions';
import { useDocumentDialogs } from './document/hooks/useDocumentDialogs';
import { useDocumentBatchUploadV2 } from './document/hooks/useDocumentBatchUploadV2';
import { useDocumentDataLoading } from './document/hooks/useDocumentDataLoading';
import { DocumentFilters } from './document/components/DocumentFilters';
import { DocumentCards } from './document/components/DocumentCards';
import ServerPagination from './ServerPagination';
import { DocumentTable } from './document/components/DocumentTable';
import { DocumentBatchUploadDialog } from './document/components/DocumentBatchUploadDialog';
import { DocumentSettingsDialog } from './document/components/DocumentSettingsDialog';
import { DocumentWorkflowDialog } from './document/components/DocumentWorkflowDialog';
import { TransmittalCartModal, useActiveRevisions } from './transmittal';
import { transmittalCartStore } from '../stores/TransmittalCartStore';
import { activeRevisionsStore } from '../stores/ActiveRevisionsStore';
import { useDocumentExport } from './document/hooks/useDocumentExport';

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
  
  // Состояние для сортировки
  const [orderBy, setOrderBy] = useState<string>('updated_at');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  
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
  

  useEffect(() => {
    // Дополнительная загрузка при изменении проекта
    if (projectStore.selectedProject?.id) {
      refreshActiveRevisions();
    }
  }, [projectStore.selectedProject?.id, refreshActiveRevisions]);
  
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
    selectedDocumentTypeId,
    selectedRevisionDescriptionId,
    selectedAreaId,
    dateRange,
    setFilterStatus,
    setSearchTerm,
    setSelectedDisciplineId,
    setSelectedDocumentTypeId,
    setSelectedRevisionDescriptionId,
    setSelectedAreaId,
    setDateRange,
    resetFilters,
  } = useDocumentFilters();

  const { exportToExcel } = useDocumentExport();

  const {
    page,
    size,
    total,
    pages,
    setPage,
    handleChangePage,
    handleChangeSize,
    documents: paginatedDocuments,
    isLoading: documentsLoading,
    error: documentsError,
    refresh: refreshDocumentsData,
  } = useServerDocumentPagination({
    projectId: projectStore.selectedProject?.id,
    status: filterStatus,
    search: searchTerm,
    disciplineId: selectedDisciplineId,
    documentTypeId: selectedDocumentTypeId,
    revisionDescriptionId: selectedRevisionDescriptionId,
    areaId: selectedAreaId,
    dateFrom: dateRange[0] ? (() => {
      const d = dateRange[0]!;
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })() : undefined,
    dateTo: dateRange[1] ? (() => {
      const d = dateRange[1]!;
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })() : undefined,
    sortBy: orderBy,
    sortDir: order,
    pageSize: 13,
  });

  // Слушаем событие обновления документов (например, после утверждения/отклонения)
  useEffect(() => {
    const handleDocumentsRefresh = () => {
      refreshDocumentsData();
    };

    window.addEventListener('documents:refresh', handleDocumentsRefresh);
    return () => {
      window.removeEventListener('documents:refresh', handleDocumentsRefresh);
    };
  }, [refreshDocumentsData]);
  
  // Обработчик сортировки
  const handleRequestSort = (event: React.MouseEvent<unknown>, property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

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
    setSuccessNotification,
    handleCreateDocument,
    handleSaveDocument,
    handleShowDocumentDetails,
    handleDownload,
    handleCloseNotification,
    errorNotification,
    handleCloseErrorNotification,
  } = useDocumentActions({ 
    t, 
    onCloseDialog: handleCloseDocumentDetails,
    onRefreshActiveRevisions: () => {
      refreshActiveRevisions();
    },
    onRefreshDocuments: refreshDocumentsData
  });

  const {
    metadataFile,
    uploading,
    validating,
    validationErrors,
    selectedDirectoryName,
    notification,
    handleMetadataFileSelect,
    handleSelectDirectory,
    handleValidateAndUpload,
    handleCloseBatchNotification,
    canUpload,
  } = useDocumentBatchUploadV2({
    t,
    onClose: handleCloseBatchUpload,
    onDocumentsUpdated: refreshDocumentsData,
  });

  // Загружаем дисциплины и другие данные (но не документы)
  useDocumentDataLoading();

  const deleteDialog = useDeleteDialog();


  const handleDeleteDocument = async (document: any) => {
    try {
      await documentsApi.softDelete(document.id);
      await refreshDocumentsData();
    } catch (error) {
      throw error;
    }
  };

  // Обработчик выпуска ревизии документа
  const handleReleaseDocument = async (revisionId: number, comment?: string) => {
    try {
      await documentsApi.releaseRevision(revisionId, comment);
      
      // Обновляем данные документов
      await refreshDocuments();
      
      // Обновляем данные ревизий для текущего документа
      if (selectedDocumentId) {
        await documentRevisionStore.reloadRevisions(selectedDocumentId);
      }
      
      // Обновляем активные ревизии для трансмитталов
      refreshActiveRevisions();
      
      setSuccessNotification({
        open: true,
        message: t('documents.release_success')
      });
    } catch (error) {
      console.error('Error releasing revision:', error);
      setSuccessNotification({
        open: true,
        message: t('documents.release_error')
      });
    }
  };
  


  const handleStartWorkflowWithTemplate = async (templateId: number) => {
    if (!selectedDocumentForWorkflow) return;

    try {
      await workflowApi.startWorkflow(selectedDocumentForWorkflow.id, templateId);
      alert(t('documents.workflow_started'));
      handleCloseWorkflow();
      
      documentStore.loadDocuments(projectStore.selectedProject!.id, false, 'all');
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
                setIsCreatingDocument(true);
                setSelectedDocument(null);
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
          selectedDisciplineId={selectedDisciplineId}
          selectedDocumentTypeId={selectedDocumentTypeId}
          selectedRevisionDescriptionId={selectedRevisionDescriptionId}
          selectedAreaId={selectedAreaId}
          dateRange={dateRange}
          onSearchChange={setSearchTerm}
          onStatusChange={setFilterStatus}
          onDisciplineChange={setSelectedDisciplineId}
          onDocumentTypeChange={setSelectedDocumentTypeId}
          onRevisionDescriptionChange={setSelectedRevisionDescriptionId}
          onAreaChange={setSelectedAreaId}
          onDateRangeChange={setDateRange}
          onSettingsClick={() => setSettingsOpen(true)}
          onResetFilters={resetFilters}
          onExportToExcel={async () => {
            try {
              await exportToExcel({
                projectId: projectStore.selectedProject?.id,
                status: filterStatus,
                search: searchTerm,
                disciplineId: selectedDisciplineId || undefined,
                documentTypeId: selectedDocumentTypeId || undefined,
                revisionDescriptionId: selectedRevisionDescriptionId || undefined,
                areaId: selectedAreaId || undefined,
                dateFrom: dateRange[0] ? (() => {
                  const d = dateRange[0]!;
                  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                })() : undefined,
                dateTo: dateRange[1] ? (() => {
                  const d = dateRange[1]!;
                  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                })() : undefined,
                sortBy: orderBy,
                sortDir: order,
                visibleCols: visibleCols,
                columnOrder: columnOrder,
                language: i18n.language,
              });
            } catch (error: any) {
              console.error('Ошибка при экспорте в Excel:', error);
              alert(t('documents.export_error') || 'Ошибка при экспорте в Excel');
            }
          }}
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
              totalCount={total}
              isLoading={documentsLoading}
              error={documentsError}
                        page={page}
              rowsPerPage={size}
              rowsPerPageOptions={[10, 13, 25, 50]}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeSize}
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
                totalCount={total}
                isLoading={documentsLoading}
                error={documentsError}
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
                activeRevisions={activeRevisions || []}
                formatFileSize={formatFileSize}
                formatDate={formatDate}
                language={i18n.language}
                order={order}
                orderBy={orderBy}
                onRequestSort={handleRequestSort}
              />
            </Box>
          )}
        </Box>

        {/* Фиксированная пагинация внизу экрана */}
        {!isMobile && !documentsLoading && (
          <ServerPagination
            total={total}
            page={page}
            size={size}
            onPageChange={handleChangePage}
            insetLeft={240}
            align="right"
            leftInfo={`${t('common.total_documents', { count: total }).replace('{count}', total.toLocaleString(i18n.language === 'ru' ? 'ru-RU' : 'en-US'))}`}
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
              bottom: 130,
              right: 24,
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
          columnOrder={columnOrder as any}
          onClose={handleSettingsClose}
          onColumnVisibilityChange={handleColumnVisibilityChange}
          onColumnOrderChange={handleColumnOrderChange}
        />

        <DocumentBatchUploadDialog
          open={batchUploadOpen} 
          metadataFile={metadataFile}
          uploading={uploading}
          validating={validating}
          canUpload={canUpload}
          validationErrors={validationErrors}
          selectedDirectoryName={selectedDirectoryName}
          onClose={handleCloseBatchUpload}
          onFileSelect={handleMetadataFileSelect}
          onSelectDirectory={handleSelectDirectory}
          onValidateAndUpload={handleValidateAndUpload}
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
          onRelease={handleReleaseDocument}
        />

        <DocumentRevisionDialog
          open={newRevisionOpen}
          documentId={selectedDocumentId}
          onClose={handleCloseNewRevision}
          onSuccess={async () => {
            if (selectedDocumentId) {
              documentRevisionStore.reloadRevisions(selectedDocumentId);
            }
            // Обновляем данные таблицы, принудительно загружая первую страницу
            // (документ с новой ревизией должен быть на первой странице при сортировке по updated_at desc)
            await refreshDocumentsData(1);
            refreshActiveRevisions(); // Обновляем активные ревизии для трансмиттала
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

        {/* Уведомления об ошибках скачивания */}
        <NotificationSnackbar
          open={errorNotification.open}
          message={errorNotification.message}
          severity="error"
          onClose={handleCloseErrorNotification}
        />

        {/* Уведомления для множественной загрузки */}
        <NotificationSnackbar
          open={notification.open}
          message={notification.message}
          severity={notification.severity}
          onClose={handleCloseBatchNotification}
        />
      </Box>
    </ProjectRequired>
  );
});

export default DocumentsPage;