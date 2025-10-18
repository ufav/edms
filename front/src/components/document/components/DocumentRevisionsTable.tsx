import React, { useEffect } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Typography,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { 
  Download as DownloadIcon, 
  Compare as CompareIcon, 
  Cancel as CancelIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { observer } from 'mobx-react-lite';
import { documentRevisionStore } from '../../../stores/DocumentRevisionStore';
import { referencesStore } from '../../../stores/ReferencesStore';
import { getFileTypeInfo } from '../utils/fileTypeUtils';
import RevisionsTableSkeleton from './RevisionsTableSkeleton';

interface DocumentRevisionsTableProps {
  documentId: number | null;
  isCreating: boolean;
  fileMetadata: {name: string, size: number, type: string} | null;
  workflowPresetSequence: any[];
  isUploadingDocument: boolean;
  uploadProgress: number;
  onDownloadRevision: (revisionId: number, fileName: string) => void;
  onCompareRevisions: (r1: string, r2: string) => void;
  onOpenCancelRevisionDialog: (revision: any) => void;
  onRemoveFile: () => void;
  getLatestActiveRevision: () => any;
  formatDate: (dateString: string) => string;
  getRevisionStatusColor: (statusId: number | null) => string;
  canCancelRevision?: (revision: any) => boolean;
}

const DocumentRevisionsTable: React.FC<DocumentRevisionsTableProps> = observer(({
  documentId,
  isCreating,
  fileMetadata,
  workflowPresetSequence,
  isUploadingDocument,
  uploadProgress,
  onDownloadRevision,
  onCompareRevisions,
  onOpenCancelRevisionDialog,
  onRemoveFile,
  getLatestActiveRevision,
  formatDate,
  getRevisionStatusColor,
  canCancelRevision,
}) => {
  const { t, i18n } = useTranslation();

  // Загружаем workflow статусы при монтировании компонента
  useEffect(() => {
    referencesStore.loadWorkflowStatuses();
  }, []);

  const hasRevisions = !isCreating && documentId && documentRevisionStore.getRevisions(documentId || 0).length > 0;
  const hasFile = isCreating && fileMetadata;
  const isLoading = !isCreating && documentId && documentRevisionStore.isLoadingDocument(documentId);

  // Показываем скелетон во время загрузки
  if (isLoading) {
    return <RevisionsTableSkeleton />;
  }

  return (
    <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {hasRevisions || hasFile ? (
        <TableContainer component={Paper} sx={{ 
          flexGrow: 1, 
          maxHeight: '400px', 
          overflow: 'auto',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#f1f1f1',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#c1c1c1',
            borderRadius: '4px',
            '&:hover': {
              background: '#a8a8a8',
            },
          },
        }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>{t('document.revision')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>{t('document.revision_description')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>{t('document.step')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>{t('document.status')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Review Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>{t('document.file_name')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>{t('document.change_description')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>{t('document.uploaded_at')}</TableCell>
                <TableCell 
                  sx={{ 
                    position: 'sticky', 
                    right: 0, 
                    backgroundColor: 'background.paper',
                    zIndex: 2,
                    width: '160px',
                    minWidth: '160px',
                    fontWeight: 'bold',
                    fontSize: '0.875rem'
                  }}
                >
                  {t('document.actions')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isCreating && fileMetadata ? (
                // Показываем загруженный файл в режиме создания
                <TableRow 
                  sx={{ 
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.04) !important',
                      '& .MuiTableCell-root': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04) !important'
                      }
                    }
                  }}
                >
                  <TableCell>
                    <Chip 
                      label={workflowPresetSequence.length > 0 && workflowPresetSequence[0].revision_description 
                        ? `${workflowPresetSequence[0].revision_description.code}01`
                        : '01'
                      } 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>
                    {workflowPresetSequence.length > 0 && workflowPresetSequence[0].revision_description 
                      ? `${workflowPresetSequence[0].revision_description.code} - ${workflowPresetSequence[0].revision_description.description}`
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {workflowPresetSequence.length > 0 && workflowPresetSequence[0].revision_step 
                      ? `${workflowPresetSequence[0].revision_step.code} - ${workflowPresetSequence[0].revision_step.description}`
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label="Active" 
                      size="small"
                      color="success"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label="Draft" 
                      size="small"
                      color="default"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {(() => {
                        const fileTypeInfo = getFileTypeInfo(fileMetadata?.type || '', fileMetadata?.name);
                        const IconComponent = fileTypeInfo.icon;
                        return <IconComponent sx={{ fontSize: '1.5rem', color: `${fileTypeInfo.color}.main` }} />;
                      })()}
                      <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                        {fileMetadata?.name || 'N/A'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{t('document.first_revision')}</TableCell>
                  <TableCell>{new Date().toLocaleDateString()}</TableCell>
                  <TableCell 
                    sx={{ 
                      position: 'sticky', 
                      right: 0, 
                      backgroundColor: 'background.paper',
                      zIndex: 1,
                      width: '160px',
                      minWidth: '160px'
                    }}
                  >
                    {isUploadingDocument ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                          <CircularProgress 
                            variant="determinate" 
                            value={uploadProgress} 
                            size={20}
                          />
                          <Box
                            sx={{
                              top: 0,
                              left: 0,
                              bottom: 0,
                              right: 0,
                              position: 'absolute',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Typography
                              variant="caption"
                              component="div"
                              sx={{ fontSize: '8px', fontWeight: 'bold' }}
                            >
                              {`${Math.round(uploadProgress)}%`}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    ) : (
                      <IconButton 
                        size="small" 
                        onClick={onRemoveFile}
                        title={t('document.remove_file')}
                        color="default"
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                // Показываем ревизии существующего документа
                documentRevisionStore.getRevisions(documentId || 0).map((revision) => (
                  <TableRow 
                    key={revision.id}
                    sx={{ 
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04) !important',
                        '& .MuiTableCell-root': {
                          backgroundColor: 'rgba(0, 0, 0, 0.04) !important'
                        }
                      }
                    }}
                  >
                    <TableCell>
                      <Chip label={referencesStore.getFullRevisionNumber(revision)} size="small" />
                    </TableCell>
                    <TableCell>
                      {referencesStore.getRevisionDescriptionLabel(revision.revision_description_id, i18n.language) || '-'}
                    </TableCell>
                    <TableCell>
                      {referencesStore.getRevisionStepLabel(revision.revision_step_id, i18n.language) || '-'}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={referencesStore.getRevisionStatusLabel(revision.revision_status_id, i18n.language)} 
                        size="small"
                        color={getRevisionStatusColor(revision.revision_status_id || null) as any}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={referencesStore.getWorkflowStatusLabel(revision.workflow_status_id, i18n.language)} 
                        size="small"
                        color="default"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {(() => {
                          const fileTypeInfo = getFileTypeInfo(revision.file_type || '', revision.file_name);
                          const IconComponent = fileTypeInfo.icon;
                          return <IconComponent sx={{ fontSize: '1.5rem', color: `${fileTypeInfo.color}.main` }} />;
                        })()}
                        <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                          {revision.file_name || 'N/A'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{revision.change_description || '-'}</TableCell>
                    <TableCell>{formatDate(revision.created_at)}</TableCell>
                    <TableCell 
                      sx={{ 
                        position: 'sticky', 
                        right: 0, 
                        backgroundColor: 'background.paper',
                        zIndex: 1,
                        width: '160px',
                        minWidth: '160px'
                      }}
                    >
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton 
                          size="small" 
                          title={t('document.download')}
                          onClick={() => onDownloadRevision(revision.id, revision.file_name || 'document')}
                        >
                          <DownloadIcon />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          title={t('document.compare')}
                          onClick={() => {
                            onCompareRevisions(
                              referencesStore.getFullRevisionNumber(revision), 
                              ''
                            );
                          }}
                        >
                          <CompareIcon />
                        </IconButton>
                        {revision.revision_status_id === 1 && 
                         revision.id === getLatestActiveRevision()?.id && 
                         canCancelRevision?.(revision) && (
                          <IconButton 
                            size="small" 
                            title={t('documents.cancel_revision')}
                            onClick={() => onOpenCancelRevisionDialog(revision)}
                            color="warning"
                          >
                            <CancelIcon />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <TableContainer component={Paper} sx={{ 
          flexGrow: 1, 
          maxHeight: '400px', 
          overflow: 'auto',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#f1f1f1',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#c1c1c1',
            borderRadius: '4px',
            '&:hover': {
              background: '#a8a8a8',
            },
          },
        }}>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary">
              {!isCreating && documentId ? t('document.no_revisions') : t('document.no_revisions_created')}
            </Typography>
          </Box>
        </TableContainer>
      )}
    </Box>
  );
});

export default DocumentRevisionsTable;
