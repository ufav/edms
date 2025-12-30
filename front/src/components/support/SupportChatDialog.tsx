import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chip, Box, Typography, CircularProgress, Dialog, IconButton, Backdrop } from '@mui/material';
import { Close as CloseIcon, Download as DownloadIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { supportApi } from '../../api/client';
import { useSupportWebSocket } from '../../hooks/useSupportWebSocket';
import { userStore } from '../../stores/UserStore';
import ChatDialog from '../common/ChatDialog';
import type { ChatMessage } from '../common/ChatDialog';

interface SupportChatDialogProps {
  open: boolean;
  ticketId: number;
  onClose: () => void;
}

// Кеш для blob'ов изображений (ключ: ticketId-fileId)
const imageBlobCache = new Map<string, Blob>();
const imageUrlCache = new Map<string, string>();

// Компонент для отображения изображения из тикета (вынесен за пределы для предотвращения пересоздания)
const SupportFileImage: React.FC<{ 
  ticketId: number; 
  fileId: number; 
  fileName: string;
  onImageClick: (url: string, fileName: string, fileId: number) => void;
}> = React.memo(({ ticketId, fileId, fileName, onImageClick }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const imageUrlRef = useRef<string | null>(null);

  useEffect(() => {
    // Проверяем, что fileId валиден
    if (!fileId || fileId === null) {
      setError(true);
      setLoading(false);
      return;
    }
    
    const cacheKey = `${ticketId}-${fileId}`;
    
    // Проверяем кеш
    const cachedUrl = imageUrlCache.get(cacheKey);
    if (cachedUrl) {
      setImageUrl(cachedUrl);
      imageUrlRef.current = cachedUrl;
      setLoading(false);
      return;
    }
    
    let isMounted = true;
    
    const loadImage = async () => {
      try {
        setLoading(true);
        setError(false);
        
        // Проверяем кеш blob'ов
        const cachedBlob = imageBlobCache.get(cacheKey);
        let blob: Blob;
        
        if (cachedBlob) {
          blob = cachedBlob;
        } else {
          blob = await supportApi.downloadFile(ticketId, fileId);
          // Сохраняем blob в кеш
          imageBlobCache.set(cacheKey, blob);
        }
        
        if (isMounted) {
          // Освобождаем предыдущий URL, если есть (но не из кеша)
          if (imageUrlRef.current && !imageUrlCache.has(cacheKey)) {
            URL.revokeObjectURL(imageUrlRef.current);
          }
          
          const url = URL.createObjectURL(blob);
          imageUrlRef.current = url;
          // Сохраняем URL в кеш
          imageUrlCache.set(cacheKey, url);
          setImageUrl(url);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading image:', err);
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    };
    
    loadImage();
    
    return () => {
      isMounted = false;
      // Не освобождаем URL из кеша при размонтировании
      if (imageUrlRef.current && !imageUrlCache.has(cacheKey)) {
        URL.revokeObjectURL(imageUrlRef.current);
        imageUrlRef.current = null;
      }
    };
  }, [ticketId, fileId]);

  const handleClick = () => {
    if (imageUrl) {
      onImageClick(imageUrl, fileName, fileId);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          width: 200,
          height: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #ddd',
          borderRadius: 1,
          bgcolor: '#f5f5f5',
        }}
      >
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error || !imageUrl) {
    return (
      <Box
        sx={{
          width: 200,
          height: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #ddd',
          borderRadius: 1,
          backgroundColor: '#f5f5f5',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          Ошибка загрузки
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      component="img"
      src={imageUrl}
      alt={fileName}
      onClick={handleClick}
      sx={{
        maxWidth: 200,
        maxHeight: 200,
        borderRadius: 1,
        cursor: 'pointer',
        '&:hover': {
          opacity: 0.8,
        },
      }}
    />
  );
});

SupportFileImage.displayName = 'SupportFileImage';

const SupportChatDialog: React.FC<SupportChatDialogProps> = ({ open, ticketId, onClose }) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<{ url: string; fileName: string; fileId: number } | null>(null);

  // Конвертация сообщения поддержки в универсальный формат
  const convertSupportMessageToChatMessage = useCallback((msg: any): ChatMessage => {
    // Определяем, является ли сообщение "своим" (от текущего пользователя)
    const isOwnMessage = msg.sender_type === 'user' && msg.sender_id === userStore.currentUser?.id;
    
    return {
      id: msg.id,
      user_id: msg.sender_id,
      sender_type: msg.sender_type,
      content: msg.message_text || '',
      message_text: msg.message_text,
      created_at: msg.created_at,
      files: msg.files || [],
      // Добавляем флаг для определения "своих" сообщений
      is_own: isOwnMessage,
    };
  }, []);

  // Мемоизируем колбэки, чтобы они не пересоздавались при каждом рендере
  const handleWebSocketMessage = useCallback((newMessage: any) => {
    setMessages((prev) => {
      // Проверяем, нет ли уже такого сообщения (избегаем дубликатов)
      const exists = prev.some((msg) => msg.id === newMessage.id);
      if (exists) {
        return prev;
      }
      return [...prev, convertSupportMessageToChatMessage(newMessage)];
    });
  }, [convertSupportMessageToChatMessage]);
  
  const handleWebSocketConnected = useCallback(() => {
    console.log('WebSocket connected for ticket', ticketId);
  }, [ticketId]);
  
  const handleWebSocketError = useCallback((err: Event) => {
    console.error('WebSocket error:', err);
  }, []);

  // WebSocket для real-time обновлений
  const { isConnected } = useSupportWebSocket({
    ticketId,
    enabled: open,
    onMessage: handleWebSocketMessage,
    onConnected: handleWebSocketConnected,
    onError: handleWebSocketError,
  });

  // Загружаем тикет при открытии диалога
  const loadTicket = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await supportApi.getTicket(ticketId);
      setTicket(response);
      setMessages((response.messages || []).map(convertSupportMessageToChatMessage));
    } catch (err: any) {
      let errorMessage = t('support.load_error');
      
      if (err?.response?.status === 404) {
        errorMessage = t('support.errors.ticket_not_found');
      } else if (err?.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (Array.isArray(detail)) {
          errorMessage = detail.map((d: any) => d.msg || d).join(', ');
        }
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [ticketId, t, convertSupportMessageToChatMessage]);

  useEffect(() => {
    if (open) {
      loadTicket();
    }
  }, [open, ticketId, loadTicket]);

  const handleSendMessage = useCallback(async (text: string, files?: File[]): Promise<void> => {
    const formData = new FormData();
    formData.append('message_text', text || ' ');
    
    if (files && files.length > 0) {
      files.forEach((file) => {
        formData.append('files', file);
      });
    }

    const newMessage = await supportApi.createMessage(ticketId, formData);
    
    // Добавляем отправленное сообщение сразу в список
    setMessages((prev) => {
      const exists = prev.some((msg) => msg.id === newMessage.id);
      if (exists) {
        return prev;
      }
      return [...prev, convertSupportMessageToChatMessage(newMessage)];
    });
  }, [ticketId, convertSupportMessageToChatMessage]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'default';
      case 'in_progress':
        return 'primary';
      case 'resolved':
        return 'success';
      case 'closed':
        return 'default';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${day}.${month}.${year} ${hours}:${minutes}`;
    } catch {
      return dateString;
    }
  };

  const getSenderName = (message: ChatMessage) => {
    if (message.sender_type === 'user') {
      return t('support.you') || 'Вы';
    }
    if (message.sender_type === 'support') {
      return t('support.support') || 'Поддержка';
    }
    return 'Неизвестно';
  };

  const handleImageClick = useCallback((url: string, fileName: string, fileId: number) => {
    setImagePreview({ url, fileName, fileId });
  }, []);

  const renderFilePreview = useCallback((file: { id: number; file_name: string; file_path: string; file_size: number; mime_type: string }, onDownload: () => void) => {
    // Проверяем, что file.id существует и не равен null
    if (!file.id) {
      return (
        <Box
          sx={{
            width: 200,
            height: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #ddd',
            borderRadius: 1,
            bgcolor: '#f5f5f5',
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Ошибка: ID файла отсутствует
          </Typography>
        </Box>
      );
    }
    return (
      <SupportFileImage 
        ticketId={ticketId}
        fileId={file.id} 
        fileName={file.file_name}
        onImageClick={handleImageClick}
      />
    );
  }, [ticketId, handleImageClick]);

  return (
    <>
      <ChatDialog
        open={open}
        onClose={onClose}
        title={ticket?.subject || `Тикет #${ticketId}`}
        messages={messages}
        loading={loading}
        error={error}
        onSendMessage={handleSendMessage}
        onLoadMessages={loadTicket}
        placeholder={t('support.type_message') || 'Введите сообщение...'}
        emptyMessage={t('support.no_messages') || 'Нет сообщений'}
        emptySubmessage={t('support.be_first') || 'Будьте первым, кто оставит сообщение'}
        allowFiles={true}
        maxFileSize={5 * 1024 * 1024}
        allowedFileTypes={['image/jpeg', 'image/png', 'image/gif', 'image/webp']}
        renderFilePreview={renderFilePreview}
        formatDate={formatDate}
        getSenderName={getSenderName}
        showStatusChip={!!ticket?.status}
        statusChip={
          ticket?.status ? (
            <Chip
              label={t(`support.status.${ticket.status}`) || ticket.status}
              color={getStatusColor(ticket.status) as any}
              size="small"
              sx={{ mt: 0.5 }}
            />
          ) : undefined
        }
      />

      {/* Модальное окно для просмотра изображения */}
    <Dialog
      open={!!imagePreview}
      onClose={() => setImagePreview(null)}
      maxWidth={false}
      PaperProps={{
        sx: {
          backgroundColor: 'transparent',
          boxShadow: 'none',
          maxWidth: '90vw',
          maxHeight: '90vh',
        }
      }}
      BackdropProps={{
        sx: {
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
        }
      }}
    >
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
        }}
      >
        {imagePreview && (
          <>
            <Box
              component="img"
              src={imagePreview.url}
              alt={imagePreview.fileName}
              sx={{
                maxWidth: '90vw',
                maxHeight: '90vh',
                objectFit: 'contain',
              }}
            />
            <IconButton
              onClick={() => setImagePreview(null)}
              sx={{
                position: 'absolute',
                top: 16,
                right: 16,
                color: 'white',
                bgcolor: 'rgba(0, 0, 0, 0.5)',
                '&:hover': {
                  bgcolor: 'rgba(0, 0, 0, 0.7)',
                },
              }}
            >
              <CloseIcon />
            </IconButton>
            <IconButton
              onClick={async () => {
                if (imagePreview) {
                  try {
                    const blob = await supportApi.downloadFile(ticketId, imagePreview.fileId);
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = imagePreview.fileName;
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch (err) {
                    console.error('Error downloading file:', err);
                  }
                }
              }}
              sx={{
                position: 'absolute',
                top: 16,
                right: 64,
                color: 'white',
                bgcolor: 'rgba(0, 0, 0, 0.5)',
                '&:hover': {
                  bgcolor: 'rgba(0, 0, 0, 0.7)',
                },
              }}
            >
              <DownloadIcon />
            </IconButton>
          </>
        )}
      </Box>
    </Dialog>
    </>
  );
};

export default SupportChatDialog;
