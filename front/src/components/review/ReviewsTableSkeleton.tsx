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
  Skeleton,
} from '@mui/material';

const ReviewsTableSkeleton: React.FC = () => {
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      minHeight: 0,
      marginBottom: 0,
      paddingBottom: 0
    }}>
      {/* Заголовок таблицы - фиксированный */}
      <Box sx={{ 
        flexShrink: 0,
        minHeight: 0,
        marginBottom: 0,
        paddingBottom: 0
      }}>
        <TableContainer component={Paper} sx={{ 
          boxShadow: 2, 
          width: '100%', 
          minWidth: '100%',
          borderRadius: '8px 8px 0 0'
        }}>
          <Table sx={{ tableLayout: 'fixed', width: '100%', minWidth: '100%' }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5', '& .MuiTableCell-root': { padding: '8px 16px' } }}>
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  fontSize: '0.875rem',
                  whiteSpace: 'nowrap',
                  width: '20%',
                  minWidth: '200px'
                }}>
                  <Skeleton variant="text" width="80px" height="20px" />
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  fontSize: '0.875rem',
                  whiteSpace: 'nowrap',
                  width: '15%',
                  minWidth: '150px'
                }}>
                  <Skeleton variant="text" width="60px" height="20px" />
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  fontSize: '0.875rem',
                  whiteSpace: 'nowrap',
                  width: '10%',
                  minWidth: '100px'
                }}>
                  <Skeleton variant="text" width="80px" height="20px" />
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  fontSize: '0.875rem',
                  whiteSpace: 'nowrap',
                  width: '15%',
                  minWidth: '150px'
                }}>
                  <Skeleton variant="text" width="100px" height="20px" />
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  fontSize: '0.875rem',
                  whiteSpace: 'nowrap',
                  width: '20%',
                  minWidth: '200px'
                }}>
                  <Skeleton variant="text" width="80px" height="20px" />
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  fontSize: '0.875rem',
                  whiteSpace: 'nowrap',
                  width: '12%',
                  minWidth: '120px'
                }}>
                  <Skeleton variant="text" width="100px" height="20px" />
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  fontSize: '0.875rem',
                  whiteSpace: 'nowrap',
                  width: '8%',
                  minWidth: '100px'
                }} align="center">
                  <Skeleton variant="text" width="60px" height="20px" />
                </TableCell>
              </TableRow>
            </TableHead>
          </Table>
        </TableContainer>
      </Box>
      
      {/* Тело таблицы - скроллируемое */}
      <TableContainer component={Paper} sx={{ 
        flex: 1,
        minHeight: 0,
        maxHeight: 'calc(48px + 13 * 48px)', // Ограничиваем высоту 13 строками (заголовок + 13 строк)
        overflow: 'auto',
        borderRadius: 0,
        boxShadow: 'none',
        borderTop: 'none',
        '&::-webkit-scrollbar': {
          width: '8px',
          height: '8px',
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: '#f1f1f1',
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: '#c1c1c1',
          borderRadius: '4px',
          '&:hover': {
            backgroundColor: '#a8a8a8',
          },
        },
      }}>
        <Table sx={{ tableLayout: 'fixed', width: '100%', minWidth: '100%' }}>
          <TableBody>
            {[...Array(8)].map((_, index) => (
              <TableRow 
                key={index}
                sx={{ 
                  '& .MuiTableCell-root': { padding: '8px 16px' },
                  '&:hover': {
                    backgroundColor: '#f5f5f5',
                  },
                }}
              >
                <TableCell sx={{ width: '20%', minWidth: '200px' }}>
                  <Box>
                    <Skeleton variant="text" width="150px" height="20px" />
                    <Skeleton variant="text" width="100px" height="16px" />
                  </Box>
                </TableCell>
                <TableCell sx={{ width: '15%', minWidth: '150px' }}>
                  <Skeleton variant="text" width="80px" height="20px" />
                </TableCell>
                <TableCell sx={{ width: '10%', minWidth: '100px' }}>
                  <Skeleton variant="rectangular" width="30px" height="24px" sx={{ borderRadius: '12px' }} />
                </TableCell>
                <TableCell sx={{ width: '15%', minWidth: '150px' }}>
                  <Skeleton variant="text" width="100px" height="20px" />
                </TableCell>
                <TableCell sx={{ width: '20%', minWidth: '200px' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Skeleton variant="rectangular" width="20px" height="20px" />
                    <Box>
                      <Skeleton variant="text" width="120px" height="16px" />
                      <Skeleton variant="text" width="80px" height="14px" />
                    </Box>
                  </Box>
                </TableCell>
                <TableCell sx={{ width: '12%', minWidth: '120px' }}>
                  <Skeleton variant="text" width="100px" height="20px" />
                </TableCell>
                <TableCell sx={{ width: '8%', minWidth: '100px' }} align="center">
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                    <Skeleton variant="circular" width="32px" height="32px" />
                    <Skeleton variant="circular" width="32px" height="32px" />
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ReviewsTableSkeleton;
