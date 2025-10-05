import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const AdminTest: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Тестовая админка
      </Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        Если вы видите эту страницу, значит админка работает!
      </Typography>
      <Button 
        variant="contained" 
        onClick={() => navigate('/')}
        sx={{ mr: 2 }}
      >
        Вернуться на главную
      </Button>
      <Button 
        variant="outlined" 
        onClick={() => window.location.reload()}
      >
        Обновить страницу
      </Button>
    </Box>
  );
};

export default AdminTest;
