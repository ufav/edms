import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import { documentsApi } from '../../../api/client';
import { documentRevisionStore } from '../../../stores/DocumentRevisionStore';

interface DocumentCompareDialogProps {
  open: boolean;
  documentId: number | null;
  onClose: () => void;
}

const DocumentCompareDialog: React.FC<DocumentCompareDialogProps> = ({
  open,
  documentId,
  onClose,
}) => {
  const [r1, setR1] = useState('');
  const [r2, setR2] = useState('');
  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (open && documentId) {
      // Загружаем ревизии если они еще не загружены
      if (documentRevisionStore.getRevisions(documentId).length === 0) {
        documentRevisionStore.loadRevisions(documentId);
      }
    }
  }, [open, documentId]);

  const handleCompare = async () => {
    if (!r1 || !r2 || !documentId) {
      setError('Выберите обе ревизии для сравнения');
      return;
    }

    if (r1 === r2) {
      setError('Выберите разные ревизии для сравнения');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await documentsApi.compareRevisions(documentId, r1, r2);
      setComparison(result);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Ошибка при сравнении ревизий');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setR1('');
    setR2('');
    setComparison(null);
    setError('');
    onClose();
  };

  const revisions = documentId ? documentRevisionStore.getRevisions(documentId) : [];

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>Сравнение ревизий документа</DialogTitle>
      
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
          {/* Выбор ревизий */}
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Первая ревизия</InputLabel>
                <Select
                  value={r1}
                  onChange={(e) => setR1(e.target.value)}
                  label="Первая ревизия"
                >
                  {revisions.map((revision) => (
                    <MenuItem key={revision.id} value={revision.number}>
                      {revision.number} - {revision.file_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Вторая ревизия</InputLabel>
                <Select
                  value={r2}
                  onChange={(e) => setR2(e.target.value)}
                  label="Вторая ревизия"
                >
                  {revisions.map((revision) => (
                    <MenuItem key={revision.id} value={revision.number}>
                      {revision.number} - {revision.file_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Button
            variant="contained"
            onClick={handleCompare}
            disabled={!r1 || !r2 || loading}
            sx={{ alignSelf: 'flex-start' }}
          >
            {loading ? <CircularProgress size={20} /> : 'Сравнить'}
          </Button>

          {error && (
            <Alert severity="error">{error}</Alert>
          )}

          {/* Результаты сравнения */}
          {comparison && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Результаты сравнения
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        Ревизия {comparison.revision1?.number}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Файл: {comparison.revision1?.file_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Размер: {comparison.revision1?.file_size} байт
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Дата: {new Date(comparison.revision1?.created_at).toLocaleDateString()}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        Ревизия {comparison.revision2?.number}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Файл: {comparison.revision2?.file_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Размер: {comparison.revision2?.file_size} байт
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Дата: {new Date(comparison.revision2?.created_at).toLocaleDateString()}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Различия
                </Typography>
                <Typography variant="body2">
                  Разница в размере: {comparison.size_diff} байт
                </Typography>
                {comparison.content_diff && (
                  <Typography variant="body2">
                    Изменения в содержимом: {comparison.content_diff}
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose}>Закрыть</Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentCompareDialog;
