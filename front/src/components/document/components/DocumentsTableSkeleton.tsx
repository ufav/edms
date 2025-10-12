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

interface DocumentsTableSkeletonProps {
  visibleCols: {
    number?: boolean;
    title?: boolean;
    file?: boolean;
    size?: boolean;
    revision?: boolean;
    status?: boolean;
    language?: boolean;
    drs?: boolean;
    discipline?: boolean;
    document_type?: boolean;
    date?: boolean;
    updated_at?: boolean;
    created_by?: boolean;
    actions?: boolean;
  };
  showSelectColumn?: boolean; // Показывать ли колонку с галочками
}

const DocumentsTableSkeleton: React.FC<DocumentsTableSkeletonProps> = ({ visibleCols, showSelectColumn = false }) => {
  return (
    <TableContainer component={Paper} sx={{ 
      boxShadow: 2, 
      width: '100%', 
      minWidth: '100%', 
      flex: 1
    }}>
      <Table sx={{ tableLayout: 'fixed', width: '100%', minWidth: '100%' }}>
        <TableHead>
          <TableRow sx={{ backgroundColor: '#f5f5f5', '& .MuiTableCell-root': { padding: '8px 16px' } }}>
            {showSelectColumn && (
              <TableCell sx={{ width: '50px', minWidth: '50px', maxWidth: '50px', fontWeight: 'bold', fontSize: '0.875rem', whiteSpace: 'nowrap', textAlign: 'center', position: 'sticky', left: 0, backgroundColor: '#f5f5f5', zIndex: 1 }}>
              </TableCell>
            )}
            {visibleCols.number && (
              <TableCell sx={{ width: '123px', minWidth: '123px', maxWidth: '320px', fontWeight: 'bold', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                <Skeleton variant="text" width="60px" height="20px" />
              </TableCell>
            )}
            {visibleCols.title && (
              <TableCell sx={{ width: '200px', minWidth: '200px', maxWidth: '320px', fontWeight: 'bold', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                <Skeleton variant="text" width="50px" height="20px" />
              </TableCell>
            )}
            {visibleCols.file && (
              <TableCell sx={{ width: '200px', minWidth: '200px', maxWidth: '320px', fontWeight: 'bold', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                <Skeleton variant="text" width="40px" height="20px" />
              </TableCell>
            )}
            {visibleCols.size && (
              <TableCell sx={{ width: '83px', minWidth: '83px', maxWidth: '320px', fontWeight: 'bold', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                <Skeleton variant="text" width="40px" height="20px" />
              </TableCell>
            )}
            {visibleCols.revision && (
              <TableCell sx={{ width: '83px', minWidth: '83px', maxWidth: '320px', fontWeight: 'bold', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                <Skeleton variant="text" width="60px" height="20px" />
              </TableCell>
            )}
            {visibleCols.status && (
              <TableCell sx={{ width: '103px', minWidth: '103px', maxWidth: '320px', fontWeight: 'bold', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                <Skeleton variant="text" width="50px" height="20px" />
              </TableCell>
            )}
            {visibleCols.language && (
              <TableCell sx={{ width: '83px', minWidth: '83px', maxWidth: '320px', fontWeight: 'bold', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                <Skeleton variant="text" width="60px" height="20px" />
              </TableCell>
            )}
            {visibleCols.drs && (
              <TableCell sx={{ width: '83px', minWidth: '83px', maxWidth: '320px', fontWeight: 'bold', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                <Skeleton variant="text" width="30px" height="20px" />
              </TableCell>
            )}
            {visibleCols.discipline && (
              <TableCell sx={{ width: '103px', minWidth: '103px', maxWidth: '320px', fontWeight: 'bold', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                <Skeleton variant="text" width="80px" height="20px" />
              </TableCell>
            )}
            {visibleCols.document_type && (
              <TableCell sx={{ width: '123px', minWidth: '123px', maxWidth: '320px', fontWeight: 'bold', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                <Skeleton variant="text" width="100px" height="20px" />
              </TableCell>
            )}
            {visibleCols.date && (
              <TableCell sx={{ width: '140px', minWidth: '140px', maxWidth: '320px', fontWeight: 'bold', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                <Skeleton variant="text" width="100px" height="20px" />
              </TableCell>
            )}
            {visibleCols.updated_at && (
              <TableCell sx={{ width: '140px', minWidth: '140px', maxWidth: '320px', fontWeight: 'bold', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                <Skeleton variant="text" width="100px" height="20px" />
              </TableCell>
            )}
            {visibleCols.created_by && (
              <TableCell sx={{ width: '123px', minWidth: '123px', maxWidth: '320px', fontWeight: 'bold', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                <Skeleton variant="text" width="80px" height="20px" />
              </TableCell>
            )}
            {visibleCols.actions && (
              <TableCell sx={{ width: '110px', minWidth: '110px', maxWidth: '110px', fontWeight: 'bold', fontSize: '0.875rem', whiteSpace: 'nowrap', position: 'sticky', right: 0, backgroundColor: '#f5f5f5', zIndex: 1 }}>
                <Skeleton variant="text" width="60px" height="20px" />
              </TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {[...Array(8)].map((_, index) => (
            <TableRow key={index} sx={{ '& .MuiTableCell-root': { padding: '8px 16px' } }}>
              {showSelectColumn && (
                <TableCell sx={{ width: '50px', minWidth: '50px', maxWidth: '50px', textAlign: 'center', position: 'sticky', left: 0, backgroundColor: 'white', zIndex: 1 }}>
                  <Skeleton variant="rectangular" width="20px" height="20px" sx={{ borderRadius: 1 }} />
                </TableCell>
              )}
              {visibleCols.number && (
                <TableCell sx={{ width: '123px', minWidth: '123px', maxWidth: '320px' }}>
                  <Skeleton variant="text" width="80px" height="20px" />
                </TableCell>
              )}
              {visibleCols.title && (
                <TableCell sx={{ width: '200px', minWidth: '200px', maxWidth: '320px' }}>
                  <Skeleton variant="text" width="150px" height="20px" />
                </TableCell>
              )}
              {visibleCols.file && (
                <TableCell sx={{ width: '200px', minWidth: '200px', maxWidth: '320px' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Skeleton variant="rectangular" width="20px" height="20px" />
                    <Skeleton variant="text" width="120px" height="20px" />
                  </Box>
                </TableCell>
              )}
              {visibleCols.size && (
                <TableCell sx={{ width: '83px', minWidth: '83px', maxWidth: '320px' }}>
                  <Skeleton variant="text" width="50px" height="20px" />
                </TableCell>
              )}
              {visibleCols.revision && (
                <TableCell sx={{ width: '83px', minWidth: '83px', maxWidth: '320px' }}>
                  <Skeleton variant="rectangular" width="30px" height="24px" sx={{ borderRadius: '12px' }} />
                </TableCell>
              )}
              {visibleCols.status && (
                <TableCell sx={{ width: '103px', minWidth: '103px', maxWidth: '320px' }}>
                  <Skeleton variant="rectangular" width="60px" height="24px" sx={{ borderRadius: '12px' }} />
                </TableCell>
              )}
              {visibleCols.language && (
                <TableCell sx={{ width: '83px', minWidth: '83px', maxWidth: '320px' }}>
                  <Skeleton variant="text" width="30px" height="20px" />
                </TableCell>
              )}
              {visibleCols.drs && (
                <TableCell sx={{ width: '83px', minWidth: '83px', maxWidth: '320px' }}>
                  <Skeleton variant="text" width="40px" height="20px" />
                </TableCell>
              )}
              {visibleCols.discipline && (
                <TableCell sx={{ width: '103px', minWidth: '103px', maxWidth: '320px' }}>
                  <Skeleton variant="text" width="60px" height="20px" />
                </TableCell>
              )}
              {visibleCols.document_type && (
                <TableCell sx={{ width: '123px', minWidth: '123px', maxWidth: '320px' }}>
                  <Skeleton variant="text" width="80px" height="20px" />
                </TableCell>
              )}
              {visibleCols.date && (
                <TableCell sx={{ width: '140px', minWidth: '140px', maxWidth: '320px' }}>
                  <Skeleton variant="text" width="100px" height="20px" />
                </TableCell>
              )}
              {visibleCols.updated_at && (
                <TableCell sx={{ width: '140px', minWidth: '140px', maxWidth: '320px' }}>
                  <Skeleton variant="text" width="100px" height="20px" />
                </TableCell>
              )}
              {visibleCols.created_by && (
                <TableCell sx={{ width: '123px', minWidth: '123px', maxWidth: '320px' }}>
                  <Skeleton variant="text" width="100px" height="20px" />
                </TableCell>
              )}
              {visibleCols.actions && (
                <TableCell sx={{ width: '110px', minWidth: '110px', maxWidth: '110px', position: 'sticky', right: 0, backgroundColor: 'white', zIndex: 1 }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Skeleton variant="circular" width="32px" height="32px" />
                    <Skeleton variant="circular" width="32px" height="32px" />
                    <Skeleton variant="circular" width="32px" height="32px" />
                  </Box>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default DocumentsTableSkeleton;
