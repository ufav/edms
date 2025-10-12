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

const ProjectTableSkeleton: React.FC = () => {
  return (
    <TableContainer component={Paper} sx={{ boxShadow: 2, border: '1px solid #e0e0e0', width: '100%' }}>
      <Table sx={{ tableLayout: 'fixed', width: '100%' }}>
        <TableHead>
          <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
            <TableCell sx={{ 
              fontWeight: 'bold',
              width: '20%',
              maxWidth: '300px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              <Skeleton variant="text" width="80px" height="20px" />
            </TableCell>
            <TableCell sx={{ 
              fontWeight: 'bold',
              width: '25%',
              maxWidth: '300px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              <Skeleton variant="text" width="100px" height="20px" />
            </TableCell>
            <TableCell sx={{ 
              fontWeight: 'bold',
              width: '12%',
              maxWidth: '300px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              <Skeleton variant="text" width="60px" height="20px" />
            </TableCell>
            <TableCell sx={{ 
              fontWeight: 'bold',
              width: '15%',
              maxWidth: '300px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              <Skeleton variant="text" width="80px" height="20px" />
            </TableCell>
            <TableCell sx={{ 
              fontWeight: 'bold',
              width: '15%',
              maxWidth: '300px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              <Skeleton variant="text" width="100px" height="20px" />
            </TableCell>
            <TableCell sx={{ 
              fontWeight: 'bold',
              width: '13%',
              maxWidth: '300px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              <Skeleton variant="text" width="60px" height="20px" />
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {[...Array(6)].map((_, index) => (
            <TableRow key={index} hover>
              <TableCell sx={{ 
                width: '20%',
                maxWidth: '300px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                <Skeleton variant="text" width="150px" height="20px" />
              </TableCell>
              <TableCell sx={{ 
                width: '25%',
                maxWidth: '300px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                <Skeleton variant="text" width="200px" height="20px" />
              </TableCell>
              <TableCell sx={{ 
                width: '12%',
                maxWidth: '300px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                <Skeleton variant="rectangular" width="60px" height="24px" sx={{ borderRadius: '12px' }} />
              </TableCell>
              <TableCell sx={{ 
                width: '15%',
                maxWidth: '300px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                <Skeleton variant="text" width="100px" height="20px" />
              </TableCell>
              <TableCell sx={{ 
                width: '15%',
                maxWidth: '300px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                <Skeleton variant="text" width="80px" height="20px" />
              </TableCell>
              <TableCell sx={{ 
                width: '13%',
                maxWidth: '300px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
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

export default ProjectTableSkeleton;
