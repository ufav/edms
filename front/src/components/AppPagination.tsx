import React from 'react';
import { Box, Pagination, Typography } from '@mui/material';

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
  leftInfo,
}) => {
  const totalPages = Math.max(1, Math.ceil(count / rowsPerPage));

  // Фрагмент для текста — рендерится в fixed Box
  const leftInfoElement = leftInfo && (
    <Typography
      variant="body2"
      sx={{
        position: 'absolute',  // Absolute относительно fixed Box
        left: 30,  // Небольшой отступ: ~16px от левого края экрана (подкрутите: 1=8px, 3=24px)
        top: '50%',  // Вертикально по центру
        transform: 'translateY(-50%)',  // Точный центр по вертикали
        color: 'text.secondary',
        fontWeight: 500,
        zIndex: 1,  // Над пагинацией, если перекрытие
        fontStyle: 'italic',
      }}
    >
      {leftInfo}
    </Typography>
  );

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
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Pagination
          count={totalPages}
          page={page}
          onChange={onPageChange}
          color={color === 'standard' ? 'standard' : color}
          showFirstButton
          showLastButton
          siblingCount={1}
          boundaryCount={1}
          size={size}
          sx={{
            mr: align === 'right' ? 3 : 0,  // Отступ справа вместо хака (~28px)
            '& .MuiPagination-ul': {
              flexWrap: 'nowrap',
              alignItems: 'center',
              gap: 0.5,
            }
          }}
        />
      </Box>
    </Box>
  );

  if (!fixedBottom) {
    // Fallback для не-fixed: текст в flex слева
    return (
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
        {leftInfo && (
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, mr: 2 }}>
            {leftInfo}
          </Typography>
        )}
        {container}
      </Box>
    );
  }

  // FIXED: Убрали дубликат position: 'relative' — fixed уже достаточно
  return (
    <Box sx={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      borderTop: '1px solid #e0e0e0',
      boxShadow: '0 -2px 8px rgba(0,0,0,0.1)',
      zIndex: 1000,
      paddingLeft: { xs: 0, md: insetLeft },  // Пагинация уважает padding, текст — нет
      paddingRight: { xs: 2, md: 4 },
      backgroundColor: 'white',
    }}>
      {leftInfoElement}  {/* Текст слева от экрана */}
      {container}  {/* Пагинация справа */}
    </Box>
  );
};

export default AppPagination;