import React from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { FiberManualRecord } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useConnectionStatus } from '../contexts/ConnectionStatusContext';

const ConnectionStatusDot: React.FC = () => {
  const { t } = useTranslation();
  const { status } = useConnectionStatus();

  const getStatusConfig = () => {
    switch (status) {
      case 'online':
        return {
          color: '#4caf50', // Зеленый
          text: t('connection.online') || 'Online',
          tooltip: t('connection.online_tooltip') || 'Соединение с сервером установлено',
        };
      case 'reconnecting':
        return {
          color: '#ff9800', // Оранжевый/желтый
          text: t('connection.reconnecting') || 'Переподключение...',
          tooltip: t('connection.reconnecting_tooltip') || 'Переподключение к серверу...',
        };
      case 'offline':
        return {
          color: '#f44336', // Красный
          text: t('connection.offline') || 'Offline',
          tooltip: t('connection.offline_tooltip') || 'Нет соединения с сервером',
        };
      default:
        return {
          color: '#9e9e9e', // Серый
          text: t('connection.unknown') || 'Неизвестно',
          tooltip: t('connection.unknown_tooltip') || 'Статус соединения неизвестен',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Tooltip title={config.tooltip} arrow placement="top">
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          mr: 0.75,
          gap: 0.5,
        }}
      >
        <FiberManualRecord
          sx={{
            fontSize: '10px',
            color: config.color,
            animation: status === 'reconnecting' ? 'pulse 2s infinite' : 'none',
            '@keyframes pulse': {
              '0%, 100%': {
                opacity: 1,
              },
              '50%': {
                opacity: 0.5,
              },
            },
          }}
        />
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            fontSize: '0.75rem',
            fontWeight: 500,
            whiteSpace: 'nowrap',
          }}
        >
          {config.text}
        </Typography>
      </Box>
    </Tooltip>
  );
};

export default ConnectionStatusDot;

