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

const RevisionsTableSkeleton: React.FC = () => {
  return (
    <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <TableContainer component={Paper} sx={{ 
        flexGrow: 1, 
        maxHeight: '400px', 
        overflow: 'auto',
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
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>
                <Skeleton variant="text" width="60px" height="20px" />
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>
                <Skeleton variant="text" width="80px" height="20px" />
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>
                <Skeleton variant="text" width="50px" height="20px" />
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>
                <Skeleton variant="text" width="60px" height="20px" />
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>
                <Skeleton variant="text" width="80px" height="20px" />
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>
                <Skeleton variant="text" width="100px" height="20px" />
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>
                <Skeleton variant="text" width="80px" height="20px" />
              </TableCell>
              <TableCell 
                sx={{ 
                  position: 'sticky', 
                  right: 0, 
                  backgroundColor: 'background.paper',
                  zIndex: 2,
                  width: '160px',
                  minWidth: '160px',
                  fontWeight: 'bold',
                  fontSize: '0.875rem'
                }}
              >
                <Skeleton variant="text" width="60px" height="20px" />
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[...Array(3)].map((_, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Skeleton variant="rectangular" width="40px" height="24px" sx={{ borderRadius: '12px' }} />
                </TableCell>
                <TableCell>
                  <Skeleton variant="text" width="120px" height="20px" />
                </TableCell>
                <TableCell>
                  <Skeleton variant="text" width="80px" height="20px" />
                </TableCell>
                <TableCell>
                  <Skeleton variant="rectangular" width="60px" height="24px" sx={{ borderRadius: '12px' }} />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Skeleton variant="rectangular" width="24px" height="24px" />
                    <Skeleton variant="text" width="100px" height="20px" />
                  </Box>
                </TableCell>
                <TableCell>
                  <Skeleton variant="text" width="150px" height="20px" />
                </TableCell>
                <TableCell>
                  <Skeleton variant="text" width="80px" height="20px" />
                </TableCell>
                <TableCell 
                  sx={{ 
                    position: 'sticky', 
                    right: 0, 
                    backgroundColor: 'background.paper',
                    zIndex: 1,
                    width: '160px',
                    minWidth: '160px'
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Skeleton variant="circular" width="32px" height="32px" />
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

export default RevisionsTableSkeleton;
