import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Send as SendIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { transmittalsApi } from '../../api/client';

interface Transmittal {
  id: number;
  transmittal_number: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  project_id: number;
  created_by: number;
  counterparty_id?: number;
}

const AdminTransmittals: React.FC = () => {
  const { t } = useTranslation();
  const [transmittals, setTransmittals] = useState<Transmittal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTransmittal, setSelectedTransmittal] = useState<Transmittal | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const loadTransmittals = async () => {
    try {
      setLoading(true);
      const data = await transmittalsApi.getAll();
      setTransmittals(data);
    } catch (err) {
      setError('Ошибка загрузки трансмитталов');
      console.error('Error loading transmittals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransmittals();
  }, []);

  const filteredTransmittals = transmittals.filter(transmittal => {
    const matchesSearch = transmittal.transmittal_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transmittal.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || transmittal.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft': return 'default';
      case 'sent': return 'primary';
      case 'received': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const handleViewTransmittal = (transmittal: Transmittal) => {
    setSelectedTransmittal(transmittal);
    setViewDialogOpen(true);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          {t('admin.transmittals.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('admin.transmittals.subtitle')}
        </Typography>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder={t('admin.transmittals.search_placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>{t('admin.transmittals.status_filter')}</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">{t('admin.transmittals.all_statuses')}</MenuItem>
                  <MenuItem value="draft">{t('admin.transmittals.draft')}</MenuItem>
                  <MenuItem value="sent">{t('admin.transmittals.sent')}</MenuItem>
                  <MenuItem value="received">{t('admin.transmittals.received')}</MenuItem>
                  <MenuItem value="rejected">{t('admin.transmittals.rejected')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={5}>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={loadTransmittals}
                >
                  {t('admin.refresh')}
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                >
                  {t('admin.transmittals.create')}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('admin.transmittals.number')}</TableCell>
                <TableCell>{t('admin.transmittals.title')}</TableCell>
                <TableCell>{t('admin.transmittals.status')}</TableCell>
                <TableCell>{t('admin.transmittals.project')}</TableCell>
                <TableCell>{t('admin.transmittals.created_at')}</TableCell>
                <TableCell>{t('admin.transmittals.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTransmittals.map((transmittal) => (
                <TableRow key={transmittal.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {transmittal.transmittal_number}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {transmittal.title}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={transmittal.status}
                      color={getStatusColor(transmittal.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      Project #{transmittal.project_id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(transmittal.created_at).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title={t('admin.view')}>
                        <IconButton
                          size="small"
                          onClick={() => handleViewTransmittal(transmittal)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('admin.edit')}>
                        <IconButton size="small">
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('admin.delete')}>
                        <IconButton size="small" color="error">
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* View Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {t('admin.transmittals.details')}
        </DialogTitle>
        <DialogContent>
          {selectedTransmittal && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('admin.transmittals.number')}
                  </Typography>
                  <Typography variant="body1">
                    {selectedTransmittal.transmittal_number}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('admin.transmittals.status')}
                  </Typography>
                  <Chip
                    label={selectedTransmittal.status}
                    color={getStatusColor(selectedTransmittal.status)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('admin.transmittals.title')}
                  </Typography>
                  <Typography variant="body1">
                    {selectedTransmittal.title}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('admin.transmittals.created_at')}
                  </Typography>
                  <Typography variant="body1">
                    {new Date(selectedTransmittal.created_at).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('admin.transmittals.updated_at')}
                  </Typography>
                  <Typography variant="body1">
                    {new Date(selectedTransmittal.updated_at).toLocaleString()}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>
            {t('admin.close')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminTransmittals;
