import React from 'react';
import {
  Box,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

interface DocumentMetadataProps {
  document: any;
  documentCreator: any;
  isCreating: boolean;
}

const DocumentMetadata: React.FC<DocumentMetadataProps> = ({
  document,
  documentCreator,
  isCreating,
}) => {
  const { t } = useTranslation();

  if (isCreating || !document) {
    return null;
  }

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {t('document.created')} {new Date(document.created_at).toLocaleDateString('ru-RU')}
        {documentCreator && ` ${t('document.created_by')} ${documentCreator.full_name}`}
      </Typography>
    </Box>
  );
};

export default DocumentMetadata;
