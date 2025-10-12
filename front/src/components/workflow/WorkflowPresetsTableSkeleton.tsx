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
  Chip,
} from '@mui/material';

const WorkflowPresetsTableSkeleton: React.FC = () => {
  return (
    <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
      <Table>
        <TableHead>
          <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
            <TableCell sx={{ width: '30%', fontWeight: 'bold' }}>
              <Skeleton variant="text" width="100px" height="20px" />
            </TableCell>
            <TableCell sx={{ width: '30%', fontWeight: 'bold' }}>
              <Skeleton variant="text" width="120px" height="20px" />
            </TableCell>
            <TableCell sx={{ width: '15%', fontWeight: 'bold' }}>
              <Skeleton variant="text" width="60px" height="20px" />
            </TableCell>
            <TableCell sx={{ width: '15%', fontWeight: 'bold' }}>
              <Skeleton variant="text" width="80px" height="20px" />
            </TableCell>
            <TableCell sx={{ width: '10%', fontWeight: 'bold' }}>
              <Skeleton variant="text" width="60px" height="20px" />
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {[...Array(5)].map((_, index) => (
            <TableRow key={index}>
              <TableCell>
                <Skeleton variant="text" width="150px" height="20px" />
              </TableCell>
              <TableCell>
                <Skeleton variant="text" width="200px" height="20px" />
              </TableCell>
              <TableCell>
                <Skeleton variant="rectangular" width="80px" height="24px" sx={{ borderRadius: '12px' }} />
              </TableCell>
              <TableCell>
                <Skeleton variant="text" width="100px" height="20px" />
              </TableCell>
              <TableCell>
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
  );
};

export default WorkflowPresetsTableSkeleton;
