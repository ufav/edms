import React from 'react';
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
  IconButton,
  Tooltip,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Description as DetailsIcon,
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import referenceDataStore from '../../../stores/ReferenceDataStore';
import { transmittalStore } from '../../../stores/TransmittalStore';

export interface TransmittalColumnOrder {
  column: string;
  order: number;
}

export interface TransmittalTableProps {
  // Данные
  transmittals: any[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  
  // Настройки колонок
  visibleCols: {
    number: boolean;
    title: boolean;
    direction: boolean;
    counterparty: boolean;
    status: boolean;
    date: boolean;
    created_by: boolean;
    actions: boolean;
  };
  columnOrder: TransmittalColumnOrder[];
  
  // Обработчики действий
  onShowDetails: (transmittalId: number) => void;
  onDelete: (transmittal: any) => void;
  onSend?: (transmittal: any) => void;
  
  // Утилиты
  formatDate: (date: string) => string;
}

export const TransmittalTable: React.FC<TransmittalTableProps> = ({
  transmittals,
  totalCount,
  isLoading,
  error,
  visibleCols,
  columnOrder,
  onShowDetails,
  onDelete,
  onSend,
  formatDate,
}) => {
  const { t } = useTranslation();

  if (isLoading) {
    return <TransmittalTableSkeleton />;
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (totalCount === 0) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        minHeight: 0,
        marginBottom: 0,
        paddingBottom: 0
      }}>
        <TableContainer component={Paper} sx={{ 
          boxShadow: 2, 
          width: '100%', 
          minWidth: '100%', 
          flex: 1,
          minHeight: 0,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          borderRadius: 0,
        }}>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary">
              {t('transmittals.no_transmittals')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('transmittals.no_transmittals_hint')}
            </Typography>
          </Box>
        </TableContainer>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      minHeight: 0,
      marginBottom: 0,
      paddingBottom: 0
    }}>
      {/* Заголовок таблицы - зафиксирован */}
      <Box sx={{ 
        borderBottom: '1px solid #f0f0f0',
        backgroundColor: '#f5f5f5',
        boxShadow: 2,
      }}>
        <Table sx={{ tableLayout: 'fixed', width: '100%', minWidth: '100%' }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5', '& .MuiTableCell-root': { padding: '8px 16px' } }}>
              {visibleCols.number && (
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  fontSize: '0.875rem',
                  whiteSpace: 'nowrap',
                  width: '12.5%',
                  minWidth: '120px'
                }}>{t('transmittals.columns.number')}</TableCell>
              )}
              {visibleCols.title && (
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  fontSize: '0.875rem',
                  whiteSpace: 'nowrap',
                  width: '12.5%',
                  minWidth: '120px'
                }}>{t('transmittals.columns.title')}</TableCell>
              )}
              {visibleCols.direction && (
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  fontSize: '0.875rem',
                  whiteSpace: 'nowrap',
                  width: '12.5%',
                  minWidth: '120px'
                }}>{t('transmittals.columns.direction')}</TableCell>
              )}
              {visibleCols.counterparty && (
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  fontSize: '0.875rem',
                  whiteSpace: 'nowrap',
                  width: '12.5%',
                  minWidth: '120px'
                }}>{t('transmittals.columns.counterparty')}</TableCell>
              )}
              {visibleCols.status && (
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  fontSize: '0.875rem',
                  whiteSpace: 'nowrap',
                  width: '12.5%',
                  minWidth: '100px'
                }}>{t('transmittals.columns.status')}</TableCell>
              )}
              {visibleCols.date && (
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  fontSize: '0.875rem',
                  whiteSpace: 'nowrap',
                  width: '12.5%',
                  minWidth: '100px'
                }}>{t('transmittals.columns.date')}</TableCell>
              )}
              {visibleCols.created_by && (
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  fontSize: '0.875rem',
                  whiteSpace: 'nowrap',
                  width: '12.5%',
                  minWidth: '120px'
                }}>{t('transmittals.columns.created_by')}</TableCell>
              )}
              {visibleCols.actions && (
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  fontSize: '0.875rem',
                  whiteSpace: 'nowrap',
                  width: '12.5%',
                  minWidth: '100px'
                }}>{t('common.actions')}</TableCell>
              )}
            </TableRow>
          </TableHead>
        </Table>
      </Box>
      
      {/* Тело таблицы - скроллируемое */}
      <TableContainer component={Paper} sx={{ 
        flex: 1,
        minHeight: 0,
        maxHeight: 'calc(48px + 13 * 48px)', // Ограничиваем высоту 13 строками (заголовок + 13 строк)
        overflow: 'auto',
        borderRadius: 0,
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
        <Table sx={{ tableLayout: 'fixed', width: '100%', minWidth: '100%' }}>
          <TableBody>
            {transmittals.map((transmittal) => (
              <TableRow 
                key={transmittal.id} 
                sx={{ 
                  '& .MuiTableCell-root': { padding: '8px 16px' },
                  '&:hover': {
                    backgroundColor: '#f5f5f5',
                  },
                }}
              >
                {visibleCols.number && (
                  <TableCell sx={{ 
                    fontSize: '0.875rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    width: '12.5%',
                    minWidth: '120px'
                  }}>
                    <Tooltip title={transmittal.transmittal_number} arrow>
                      <Typography variant="body2" sx={{ 
                        fontWeight: 'bold',
                        fontSize: '0.875rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {transmittal.transmittal_number}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                )}
                {visibleCols.title && (
                  <TableCell sx={{ 
                    fontSize: '0.875rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    width: '12.5%',
                    minWidth: '120px'
                  }}>
                    <Tooltip title={transmittal.title || '-'} arrow>
                      <Typography variant="body2" sx={{ 
                        fontSize: '0.875rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {transmittal.title || '-'}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                )}
                {visibleCols.direction && (
                  <TableCell sx={{ 
                    fontSize: '0.875rem',
                    width: '12.5%',
                    minWidth: '120px'
                  }}>
                    <Chip
                      label={transmittal.direction === 'in' ? t('transmittals.direction.in') : 
                             transmittal.direction === 'out' ? t('transmittals.direction.out') : 'Не указано'}
                      color={transmittal.direction === 'in' ? 'success' : 'primary'}
                      size="small"
                      sx={{ fontSize: '0.75rem', height: '24px' }}
                    />
                  </TableCell>
                )}
                {visibleCols.counterparty && (
                  <TableCell sx={{ 
                    fontSize: '0.875rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    width: '12.5%',
                    minWidth: '120px'
                  }}>
                    <Tooltip title={transmittal.counterparty_id ? referenceDataStore.getCompanyName(transmittal.counterparty_id) : '-'} arrow>
                      <Typography variant="body2" sx={{ 
                        fontSize: '0.875rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {transmittal.counterparty_id ? referenceDataStore.getCompanyName(transmittal.counterparty_id) : '-'}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                )}
                {visibleCols.status && (
                  <TableCell sx={{ 
                    fontSize: '0.875rem',
                    width: '12.5%',
                    minWidth: '100px'
                  }}>
                    <Chip
                      label={transmittalStore.getTransmittalStatusLabel(transmittal.status, t)}
                      color={transmittalStore.getTransmittalStatusColor(transmittal.status) as any}
                      size="small"
                      sx={{ fontSize: '0.75rem', height: '24px' }}
                    />
                  </TableCell>
                )}
                {visibleCols.date && (
                  <TableCell sx={{ 
                    fontSize: '0.875rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    width: '12.5%',
                    minWidth: '100px'
                  }}>
                    <Typography variant="body2" sx={{ 
                      fontSize: '0.875rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {transmittal.transmittal_date ? formatDate(transmittal.transmittal_date) : '-'}
                    </Typography>
                  </TableCell>
                )}
                {visibleCols.created_by && (
                  <TableCell sx={{ 
                    fontSize: '0.875rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    width: '12.5%',
                    minWidth: '120px'
                  }}>
                    <Tooltip title={transmittal.created_by ? referenceDataStore.getUserName(transmittal.created_by) : '-'} arrow>
                      <Typography variant="body2" sx={{ 
                        fontSize: '0.875rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {transmittal.created_by ? referenceDataStore.getUserName(transmittal.created_by) : '-'}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                )}
                {visibleCols.actions && (
                  <TableCell sx={{ 
                    fontSize: '0.875rem',
                    width: '12.5%',
                    minWidth: '100px'
                  }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title={t('transmittals.view')}>
                        <IconButton size="small" onClick={() => onShowDetails(transmittal.id)} sx={{ padding: '4px' }}>
                          <DetailsIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      
                      {/* Кнопка отправки - только для исходящих трансмитталов со статусом черновик */}
                      {transmittal.direction === 'out' && transmittal.status === 'Draft' && (
                        <Tooltip title={t('transmittals.send')}>
                          <IconButton 
                            size="small" 
                            onClick={() => onSend && onSend(transmittal)} 
                            sx={{ padding: '4px' }}
                            color="default"
                          >
                            <SendIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      
                      <Tooltip title={t('transmittals.delete')}>
                        <IconButton size="small" onClick={() => onDelete(transmittal)} sx={{ padding: '4px' }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

// Компонент скелетона для загрузки
const TransmittalTableSkeleton: React.FC = () => {
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      minHeight: 0,
      marginBottom: 0,
      paddingBottom: 0
    }}>
      <TableContainer component={Paper} sx={{ 
        flex: 1,
        minHeight: 0,
        maxHeight: 'calc(48px + 13 * 48px)',
        overflow: 'auto',
        borderRadius: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <CircularProgress />
      </TableContainer>
    </Box>
  );
};