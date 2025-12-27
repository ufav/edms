import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
} from '@mui/material';
import { UploadFile as UploadFileIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import DocumentFileUploadModal from './DocumentFileUploadModal';

interface DocumentFileUploadProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fileMetadata: {name: string, size: number, type: string} | null;
  validationErrors: {[key: string]: boolean};
  onFileUploadWithComment?: (file: File, comment: string) => void;
  onFilesUploadWithComment?: (files: File[], comment: string) => void;
}

const DocumentFileUpload: React.FC<DocumentFileUploadProps> = ({
  fileInputRef,
  handleFileUpload,
  fileMetadata,
  validationErrors,
  onFileUploadWithComment,
  onFilesUploadWithComment,
}) => {
  const { t } = useTranslation();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const handleUploadWithComment = (file: File, comment: string) => {
    // Создаем событие для совместимости с существующей логикой
    const mockEvent = {
      target: {
        files: [file]
      }
    } as React.ChangeEvent<HTMLInputElement>;
    
    handleFileUpload(mockEvent);
    
    // Вызываем callback с комментарием
    onFileUploadWithComment?.(file, comment);
    
    setUploadModalOpen(false);
  };

  const handleUploadMultipleWithComment = (files: File[], comment: string) => {
    // Создаем событие для совместимости (передаем первый файл)
    const mockEvent = {
      target: {
        files
      }
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    handleFileUpload(mockEvent);
    onFilesUploadWithComment?.(files, comment);
    setUploadModalOpen(false);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <input
          id="document-file-upload"
          name="document-file-upload"
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileUpload}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.dwg,.dxf"
          multiple
        />
        <Button
          variant="contained"
          startIcon={<UploadFileIcon />}
          onClick={() => {
            setUploadModalOpen(true);
          }}
          disabled={!!fileMetadata}
          color={validationErrors.file ? 'error' : 'primary'}
        >
          {t('document.upload_file')}
        </Button>
      </Box>
      {validationErrors.file && (
        <Typography variant="caption" color="error" sx={{ fontSize: '0.75rem' }}>
          {t('document.file_required')}
        </Typography>
      )}
      
      <DocumentFileUploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUpload={handleUploadWithComment}
        onUploadMultiple={handleUploadMultipleWithComment}
      />
    </Box>
  );
};

export default DocumentFileUpload;
