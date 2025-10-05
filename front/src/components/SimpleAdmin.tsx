import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';

const SimpleAdmin: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          🎉 Админка работает!
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Это простая версия админки без сложного роутинга.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Если вы видите эту страницу, значит проблема была в роутинге.
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => window.location.href = '/'}
        >
          Вернуться на главную
        </Button>
      </Paper>
    </Box>
  );
};

export default SimpleAdmin;
