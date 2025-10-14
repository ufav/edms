import React from 'react';
import { Box, Pagination, TablePagination } from '@mui/material';

export interface AppPaginationProps {
  // Common
  count: number; // total items count
  page: number; // 1-based for simple mode, 0-based for table mode if using TablePagination signature
  onPageChange: (event: unknown, page: number) => void;

  // Layout
  fixedBottom?: boolean;
  insetLeft?: number | string;
  align?: 'left' | 'center' | 'right';

  // Simple (no rows per page selector)
  simple?: boolean; // if true, uses Pagination with fixed rowsPerPage
  rowsPerPage?: number; // required for simple mode to compute pages
  color?: 'primary' | 'secondary' | 'standard';
  size?: 'small' | 'medium' | 'large';

  // Table-like (with rows per page selector)
  showRowsPerPage?: boolean; // if true, renders TablePagination
  rowsPerPageOptions?: number[];
  onRowsPerPageChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  labelRowsPerPage?: string;
  labelDisplayedRows?: (paginationInfo: { from: number; to: number; count: number; page: number }) => string;
}

const AppPagination: React.FC<AppPaginationProps> = ({
  count,
  page,
  onPageChange,
  fixedBottom = true,
  insetLeft = 240,
  align = 'right',
  simple = false,
  rowsPerPage = 25,
  color = 'primary',
  size = 'small',
  showRowsPerPage = false,
  rowsPerPageOptions = [10, 25, 50],
  onRowsPerPageChange,
  labelRowsPerPage,
  labelDisplayedRows,
}) => {
  const container = (
    <Box sx={{
      display: 'flex',
      justifyContent: align === 'left' ? 'flex-start' : align === 'center' ? 'center' : 'flex-end',
      p: 1.5,
      pr: align === 'right' ? 2 : 1,
      width: '100%',
      boxSizing: 'border-box',
      mr: align === 'right' ? 1 : 0,
    }}>
      {showRowsPerPage ? (
        <TablePagination
          component="div"
          count={count}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={onPageChange}
          onRowsPerPageChange={onRowsPerPageChange as any}
          rowsPerPageOptions={rowsPerPageOptions}
          labelRowsPerPage={labelRowsPerPage}
          labelDisplayedRows={labelDisplayedRows as any}
          sx={{
            '& .MuiTablePagination-toolbar': {
              paddingLeft: 2,
              paddingRight: 2,
              flexWrap: 'wrap',
            },
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
              fontSize: '0.875rem',
            },
          }}
        />
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Pagination
            count={Math.max(1, Math.ceil(count / rowsPerPage))}
            page={page}
            onChange={onPageChange}
            color={color === 'standard' ? 'standard' : color}
            showFirstButton
            showLastButton
            siblingCount={1}
            boundaryCount={1}
            size={size}
            sx={{
              '& .MuiPagination-ul': {
                flexWrap: 'nowrap',
                alignItems: 'center',
                gap: 0.5,
              }
            }}
          />
          {align === 'right' && (
            <Box sx={{ width: 28, flex: '0 0 auto' }} />
          )}
        </Box>
      )}
    </Box>
  );

  if (!fixedBottom) return container;

  return (
    <Box sx={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      borderTop: '1px solid #e0e0e0',
      boxShadow: '0 -2px 8px rgba(0,0,0,0.1)',
      zIndex: 1000,
      paddingLeft: { xs: 0, md: insetLeft },
      paddingRight: { xs: 2, md: 4 },
      backgroundColor: 'white',
    }}>
      {container}
    </Box>
  );
};

export default AppPagination;


