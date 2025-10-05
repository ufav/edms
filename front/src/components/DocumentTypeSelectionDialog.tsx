import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  FormControlLabel,
  Checkbox,
  Box,
  Divider,
  Alert
} from '@mui/material';
import type { Discipline, DocumentType } from '../api/client';
import { useTranslation } from 'react-i18next';

interface DocumentTypeSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (documentTypes: DocumentType[]) => void;
  discipline: Discipline | null;
  documentTypeCode: string;
  documentTypes: DocumentType[];
  loading?: boolean;
}

const DocumentTypeSelectionDialog: React.FC<DocumentTypeSelectionDialogProps> = ({
  open,
  onClose,
  onSelect,
  discipline,
  documentTypeCode,
  documentTypes,
  loading = false
}) => {
  const { t, i18n } = useTranslation();
  const [selectedTypeIds, setSelectedTypeIds] = useState<number[]>([]);

  const getDocumentTypeName = (dt: DocumentType) => {
    return (i18n.language === 'en' && dt.name_en) ? dt.name_en : dt.name;
  };

  const handleTypeToggle = (typeId: number) => {
    setSelectedTypeIds(prev => 
      prev.includes(typeId) 
        ? prev.filter(id => id !== typeId)
        : [...prev, typeId]
    );
  };

  const handleSelect = () => {
    if (selectedTypeIds.length > 0) {
      const selectedTypes = documentTypes.filter(dt => selectedTypeIds.includes(dt.id));
      onSelect(selectedTypes);
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedTypeIds([]);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        {t('createProject.dialogs.select_document_type')}
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {t('createProject.dialogs.discipline')}: <strong>{discipline?.name}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('createProject.dialogs.document_type_code')}: <strong>{documentTypeCode}</strong>
          </Typography>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <Typography>{t('common.loading')}...</Typography>
          </Box>
        ) : documentTypes.length === 0 ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            {t('createProject.messages.no_document_types_found')}
          </Alert>
        ) : (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Выберите один или несколько типов документов:
            </Typography>
            {documentTypes.map((docType) => (
              <FormControlLabel
                key={docType.id}
                control={
                  <Checkbox
                    checked={selectedTypeIds.includes(docType.id)}
                    onChange={() => handleTypeToggle(docType.id)}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {getDocumentTypeName(docType)}
                    </Typography>
                    {docType.description && (
                      <Typography variant="caption" color="text.secondary">
                        {docType.description}
                      </Typography>
                    )}
                  </Box>
                }
                sx={{ display: 'block', mb: 1 }}
              />
            ))}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleSelect}
          variant="contained"
          disabled={selectedTypeIds.length === 0}
        >
          {t('createProject.buttons.select')} ({selectedTypeIds.length})
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentTypeSelectionDialog;
