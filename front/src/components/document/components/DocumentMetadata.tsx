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

  return null;
};

export default DocumentMetadata;
