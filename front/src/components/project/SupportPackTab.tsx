import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import { useTranslation } from 'react-i18next';
import { projectsApi, type ProjectSupportFile } from '../../api/client';
import { getFileTypeInfo } from '../document/utils/fileTypeUtils';

interface PendingSupportFile {
  file: File;
  id: string; // временный ID для ключа
}

interface SupportPackTabProps {
  projectId?: number; // Для режима edit - показываем уже загруженные файлы
  pendingFiles?: PendingSupportFile[]; // Файлы, ожидающие загрузки (для режима create/edit)
  deletedFileIds?: number[]; // ID файлов, помеченных на удаление
  onAddFiles?: (files: File[]) => void; // Добавить файлы в pending
  onRemovePendingFile?: (fileId: string) => void; // Удалить файл из pending
  onDeleteFile?: (fileId: number) => void; // Пометить сохраненный файл на удаление
}

const SupportPackTab: React.FC<SupportPackTabProps> = ({ 
  projectId,
  pendingFiles = [],
  deletedFileIds = [],
  onAddFiles,
  onRemovePendingFile,
  onDeleteFile
}) => {
  const { t } = useTranslation();
  const [files, setFiles] = useState<ProjectSupportFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const canUseSupportPack = !!projectId || pendingFiles.length > 0;

  const loadFiles = async () => {
    if (!projectId) return;
    try {
      const data = await projectsApi.getSupportFiles(projectId);
      setFiles(data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || t('supportPack.load_error'));
    }
  };

  useEffect(() => {
    if (projectId) {
      loadFiles();
    }
  }, [projectId]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const list = Array.from(event.target.files);
      if (onAddFiles) {
        onAddFiles(list);
      }
    }
    // Сбрасываем значение input, чтобы можно было выбрать тот же файл снова
    event.target.value = '';
  };

  const handleDelete = (fileId: number) => {
    if (onDeleteFile) {
      // Отложенное удаление - помечаем файл на удаление
      onDeleteFile(fileId);
    }
  };

  const handleRemovePendingFile = (fileId: string) => {
    if (onRemovePendingFile) {
      onRemovePendingFile(fileId);
    }
  };

  const handleDownload = async (file: ProjectSupportFile) => {
    try {
      const blob = await projectsApi.downloadSupportFile(file.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e?.response?.data?.detail || t('supportPack.download_error'));
    }
  };

  if (!canUseSupportPack) {
    return (
      <Box>
        <Typography variant="body2" color="text.secondary">
          {t('supportPack.available_after_create')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {error && (
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      )}

      <Stack direction="row" spacing={2} alignItems="center">
        <Button
          variant="outlined"
          component="label"
          startIcon={<CloudUploadIcon />}
        >
          {pendingFiles.length > 0
            ? t('supportPack.selected_files', { count: pendingFiles.length })
            : t('supportPack.select_file')}
          <input type="file" hidden multiple onChange={handleFileChange} />
        </Button>
      </Stack>

      <Box>
        {(files.length === 0 && pendingFiles.length === 0) ? (
          <Typography variant="body2" color="text.secondary">
            {t('supportPack.no_files')}
          </Typography>
        ) : (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('supportPack.columns.name')}</TableCell>
                  <TableCell>{t('supportPack.columns.size')}</TableCell>
                  <TableCell>{t('supportPack.columns.created_at')}</TableCell>
                  <TableCell align="right">{t('common.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {/* Pending файлы (еще не загружены) */}
                {pendingFiles.map((pendingFile) => {
                  const fileTypeInfo = getFileTypeInfo(pendingFile.file.type || '', pendingFile.file.name);
                  const IconComponent = fileTypeInfo.icon;
                  return (
                    <TableRow key={pendingFile.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <IconComponent sx={{ fontSize: '1.5rem', color: `${fileTypeInfo.color}.main` }} />
                          <Typography variant="body2" noWrap>{pendingFile.file.name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {pendingFile.file.size
                            ? `${Math.round((pendingFile.file.size / 1024 / 1024) * 100) / 100} MB`
                            : ''}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {t('supportPack.pending_upload')}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          aria-label={t('common.delete')}
                          onClick={() => handleRemovePendingFile(pendingFile.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* Уже загруженные файлы (только в режиме edit) */}
                {files
                  .filter(f => !deletedFileIds.includes(f.id))
                  .map((f) => {
                  const fileTypeInfo = getFileTypeInfo(f.file_type || '', f.file_name);
                  const IconComponent = fileTypeInfo.icon;
                  return (
                  <TableRow key={f.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconComponent sx={{ fontSize: '1.5rem', color: `${fileTypeInfo.color}.main` }} />
                        <Typography variant="body2" noWrap>{f.file_name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {f.file_size
                          ? `${Math.round((f.file_size / 1024 / 1024) * 100) / 100} MB`
                          : ''}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {f.created_at
                          ? new Date(f.created_at).toLocaleString()
                          : ''}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        aria-label={t('supportPack.download')}
                        onClick={() => handleDownload(f)}
                      >
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        aria-label={t('common.delete')}
                        onClick={() => handleDelete(f.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Box>
  );
};

export default SupportPackTab;


