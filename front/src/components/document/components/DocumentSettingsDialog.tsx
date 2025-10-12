import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Button,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

export interface ColumnVisibility {
  title: boolean;
  number: boolean;
  file: boolean;
  size: boolean;
  revision: boolean;
  status: boolean;
  language: boolean;
  drs: boolean;
  date: boolean;
  updated_at: boolean;
  created_by: boolean;
  discipline: boolean;
  document_type: boolean;
  actions: boolean;
}

export interface DocumentSettingsDialogProps {
  // Состояние диалога
  open: boolean;
  
  // Настройки колонок
  visibleCols: ColumnVisibility;
  
  // Обработчики
  onClose: () => void;
  onColumnVisibilityChange: (column: keyof ColumnVisibility, checked: boolean) => void;
}

export const DocumentSettingsDialog: React.FC<DocumentSettingsDialogProps> = ({
  open,
  visibleCols,
  onClose,
  onColumnVisibilityChange,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('documents.settings') || 'Настройки таблицы'}</DialogTitle>
      <DialogContent>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('documents.columns.title')}</Typography>
        <FormGroup>
          <FormControlLabel 
            control={
              <Checkbox 
                checked={visibleCols.title ?? true} 
                onChange={(e) => onColumnVisibilityChange('title', e.target.checked)} 
              />
            } 
            label={t('documents.columns.title')} 
          />
          <FormControlLabel 
            control={
              <Checkbox 
                checked={visibleCols.number ?? true} 
                onChange={(e) => onColumnVisibilityChange('number', e.target.checked)} 
              />
            } 
            label={t('documents.columns.number')} 
          />
          <FormControlLabel 
            control={
              <Checkbox 
                checked={visibleCols.file ?? true} 
                onChange={(e) => onColumnVisibilityChange('file', e.target.checked)} 
              />
            } 
            label={t('documents.columns.file')} 
          />
          <FormControlLabel 
            control={
              <Checkbox 
                checked={visibleCols.size ?? true} 
                onChange={(e) => onColumnVisibilityChange('size', e.target.checked)} 
              />
            } 
            label={t('documents.columns.size')} 
          />
          <FormControlLabel 
            control={
              <Checkbox 
                checked={visibleCols.revision ?? true} 
                onChange={(e) => onColumnVisibilityChange('revision', e.target.checked)} 
              />
            } 
            label={t('documents.columns.revision')} 
          />
          <FormControlLabel 
            control={
              <Checkbox 
                checked={visibleCols.status ?? true} 
                onChange={(e) => onColumnVisibilityChange('status', e.target.checked)} 
              />
            } 
            label={t('documents.columns.status')} 
          />
          <FormControlLabel 
            control={
              <Checkbox 
                checked={visibleCols.language ?? true} 
                onChange={(e) => onColumnVisibilityChange('language', e.target.checked)} 
              />
            } 
            label={t('documents.columns.language')} 
          />
          <FormControlLabel 
            control={
              <Checkbox 
                checked={visibleCols.drs ?? false} 
                onChange={(e) => onColumnVisibilityChange('drs', e.target.checked)} 
              />
            } 
            label="DRS" 
          />
          <FormControlLabel 
            control={
              <Checkbox 
                checked={visibleCols.discipline ?? true} 
                onChange={(e) => onColumnVisibilityChange('discipline', e.target.checked)} 
              />
            } 
            label={t('documents.columns.discipline')} 
          />
          <FormControlLabel 
            control={
              <Checkbox 
                checked={visibleCols.document_type ?? true} 
                onChange={(e) => onColumnVisibilityChange('document_type', e.target.checked)} 
              />
            } 
            label={t('documents.columns.document_type')} 
          />
          <FormControlLabel 
            control={
              <Checkbox 
                checked={visibleCols.date ?? true} 
                onChange={(e) => onColumnVisibilityChange('date', e.target.checked)} 
              />
            } 
            label={t('documents.columns.created_at')} 
          />
          <FormControlLabel 
            control={
              <Checkbox 
                checked={visibleCols.updated_at ?? true} 
                onChange={(e) => onColumnVisibilityChange('updated_at', e.target.checked)} 
              />
            } 
            label={t('documents.columns.updated_at')} 
          />
          <FormControlLabel 
            control={
              <Checkbox 
                checked={visibleCols.created_by ?? true} 
                onChange={(e) => onColumnVisibilityChange('created_by', e.target.checked)} 
              />
            } 
            label={t('documents.columns.created_by')} 
          />
          <FormControlLabel 
            control={
              <Checkbox 
                checked={visibleCols.actions ?? true} 
                onChange={(e) => onColumnVisibilityChange('actions', e.target.checked)} 
              />
            } 
            label={t('common.actions')} 
          />
        </FormGroup>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
      </DialogActions>
    </Dialog>
  );
};
