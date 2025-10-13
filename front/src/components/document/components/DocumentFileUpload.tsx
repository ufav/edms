import React from 'react';
import {
  Box,
  Button,
  Typography,
} from '@mui/material';
import { UploadFile as UploadFileIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

interface DocumentFileUploadProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fileMetadata: {name: string, size: number, type: string} | null;
  validationErrors: {[key: string]: boolean};
}

const DocumentFileUpload: React.FC<DocumentFileUploadProps> = ({
  fileInputRef,
  handleFileUpload,
  fileMetadata,
  validationErrors,
}) => {
  const { t } = useTranslation();

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
        />
        <Button
          variant="contained"
          startIcon={<UploadFileIcon />}
          onClick={() => {
            fileInputRef.current?.click();
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
    </Box>
  );
};

export default DocumentFileUpload;
