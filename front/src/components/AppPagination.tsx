import React from 'react';
import { Box, Pagination, TablePagination, Typography } from '@mui/material';

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
  rowsPerPage?: number; // required for simple mode to compute pages
  color?: 'primary' | 'secondary' | 'standard';
  size?: 'small' | 'medium' | 'large';

  // Table-like (with rows per page selector)
  showRowsPerPage?: boolean; // if true, renders TablePagination
  rowsPerPageOptions?: number[];
  onRowsPerPageChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  labelRowsPerPage?: string;
  labelDisplayedRows?: (paginationInfo: { from: number; to: number; count: number; page: number }) => string;

  // Left side info
  leftInfo?: string; // text to display on the left side
}

const AppPagination: React.FC<AppPaginationProps> = ({
  count,
  page,
  onPageChange,
  fixedBottom = true,
  insetLeft = 240,
  align = 'right',
  rowsPerPage = 25,
  color = 'primary',
  size = 'small',
  showRowsPerPage = false,
  rowsPerPageOptions = [10, 25, 50],
  onRowsPerPageChange,
  labelRowsPerPage,
  labelDisplayedRows,
  leftInfo,
}) => {
  const container = (
    <Box sx={{
      position: 'relative',
      display: 'flex',
      justifyContent: align === 'left' ? 'flex-start' : align === 'center' ? 'center' : 'flex-end',
      alignItems: 'center',
      p: 1.5,
      pr: align === 'right' ? 2 : 1,
      width: '100%',
      boxSizing: 'border-box',
      mr: align === 'right' ? 1 : 0,
    }}>
      {/* Left info */}
      {leftInfo && (
        <Typography
          variant="body2"
          sx={{
            position: 'absolute',
            left: 16,
            color: 'text.secondary',
            fontWeight: 500,
          }}
        >
          {leftInfo}
        </Typography>
      )}
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


