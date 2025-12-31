import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Slide,
  Skeleton,
} from '@mui/material';
import {
  Send as SendIcon,
  Close as CloseIcon,
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

// Универсальный интерфейс для сообщения
export interface ChatMessage {
  id: number;
  user_id?: number;
  user_name?: string;
  sender_type?: 'user' | 'support';
  content: string;
  message_text?: string; // Для совместимости с support messages
  created_at: string;
  updated_at?: string;
  is_resolved?: boolean;
  is_own?: boolean; // Флаг для определения "своих" сообщений
  replies?: ChatMessage[];
  files?: Array<{
    id: number;
    file_name: string;
    file_path: string;
    file_size: number;
    mime_type: string;
  }>;
}

export interface ChatDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  onSendMessage: (text: string, files?: File[]) => Promise<ChatMessage | void>;
  onLoadMessages: () => Promise<void>;
  placeholder?: string;
  emptyMessage?: string;
  emptySubmessage?: string;
  allowFiles?: boolean;
  maxFileSize?: number; // в байтах
  allowedFileTypes?: string[];
  renderFilePreview?: (file: { id: number; file_name: string; file_path: string; file_size: number; mime_type: string }, onDownload: () => void) => React.ReactNode;
  formatDate?: (dateString: string) => string;
  getSenderName?: (message: ChatMessage) => string;
  showStatusChip?: boolean;
  statusChip?: React.ReactNode;
  onNewMessage?: (message: ChatMessage) => void; // Для WebSocket
  disabled?: boolean; // Отключить отправку сообщений
  actionButton?: React.ReactNode; // Дополнительная кнопка действий
}

const CommentSkeleton = () => (
  <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, mb: 1 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
      <Skeleton variant="circular" width={24} height={24} />
      <Skeleton variant="text" width="40%" height={20} />
    </Box>
    <Skeleton variant="text" width="100%" height={16} />
    <Skeleton variant="text" width="80%" height={16} />
  </Box>
);

const ChatDialog: React.FC<ChatDialogProps> = ({
  open,
  onClose,
  title,
  subtitle,
  messages,
  loading,
  error,
  onSendMessage,
  onLoadMessages,
  placeholder,
  emptyMessage,
  emptySubmessage,
  allowFiles = false,
  maxFileSize = 5 * 1024 * 1024, // 5MB по умолчанию
  allowedFileTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  renderFilePreview,
  formatDate,
  getSenderName,
  showStatusChip = false,
  statusChip,
  onNewMessage,
  disabled = false,
  actionButton,
}) => {
  const { t } = useTranslation();
  const [newMessage, setNewMessage] = useState('');
  const [files, setFiles] = useState<Array<{ file: File; preview: string; id: string }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Загружаем сообщения при открытии
  useEffect(() => {
    if (open) {
      onLoadMessages();
    }
  }, [open]);

  // Прокрутка к последнему сообщению
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Обработка новых сообщений через WebSocket
  useEffect(() => {
    if (onNewMessage) {
      // onNewMessage будет вызываться извне через WebSocket
    }
  }, [onNewMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const defaultFormatDate = (dateString: string) => {
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

  const defaultGetSenderName = (message: ChatMessage) => {
    if (message.user_name) return message.user_name;
    if (message.sender_type === 'support') return t('support.support') || 'Поддержка';
    // Для пользователя имя будет определяться через is_own в renderMessage
    return 'Пользователь';
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles) return;

    const newFiles: Array<{ file: File; preview: string; id: string }> = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];

      if (!allowedFileTypes.includes(file.type)) {
        // Показываем ошибку через alert (можно улучшить)
        alert(t('support.invalid_file_type') || 'Можно загружать только изображения');
        continue;
      }

      if (file.size > maxFileSize) {
        alert(t('support.file_too_large') || 'Файл слишком большой');
        continue;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target?.result as string;
        newFiles.push({
          file,
          preview,
          id: `${Date.now()}-${i}`,
        });
        if (newFiles.length === selectedFiles.length) {
          setFiles((prev) => [...prev, ...newFiles]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSubmit = async () => {
    const messageText = newMessage.trim();
    if (!messageText && files.length === 0) {
      return;
    }

    setSubmitting(true);
    try {
      const fileList = files.map((f) => f.file);
      await onSendMessage(messageText, fileList.length > 0 ? fileList : undefined);
      setNewMessage('');
      setFiles([]);
      // Сообщения обновятся через onLoadMessages или WebSocket
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const renderMessage = (message: ChatMessage, index: number) => {
    const messageText = message.content || message.message_text || '';
    const senderName = getSenderName ? getSenderName(message) : defaultGetSenderName(message);
    const dateStr = formatDate ? formatDate(message.created_at) : defaultFormatDate(message.created_at);
    
    // Определяем, является ли сообщение "своим" (от текущего пользователя)
    const isOwnMessage = message.is_own !== undefined 
      ? message.is_own 
      : (message.sender_type === 'user' || message.user_id !== undefined);

    // Проверяем, нужно ли показывать имя отправителя
    // Показываем имя, если:
    // 1. Это первое сообщение
    // 2. Предыдущее сообщение от другого отправителя
    // 3. Разница во времени больше 5 минут
    const shouldShowSenderName = (() => {
      if (index === 0) return true;
      
      const prevMessage = messages[index - 1];
      if (!prevMessage) return true;
      
      const prevIsOwn = prevMessage.is_own !== undefined 
        ? prevMessage.is_own 
        : (prevMessage.sender_type === 'user' || prevMessage.user_id !== undefined);
      
      // Если предыдущее сообщение от другого отправителя
      if (prevIsOwn !== isOwnMessage) return true;
      
      // Проверяем разницу во времени (5 минут = 300000 мс)
      const currentTime = new Date(message.created_at).getTime();
      const prevTime = new Date(prevMessage.created_at).getTime();
      const timeDiff = currentTime - prevTime;
      
      if (timeDiff > 5 * 60 * 1000) return true; // Больше 5 минут
      
      return false;
    })();

    // Проверяем, является ли это последним сообщением в группе
    // (для показа треугольника только у последнего сообщения)
    const isLastInGroup = (() => {
      // Если это последнее сообщение в списке
      if (index === messages.length - 1) return true;
      
      const nextMessage = messages[index + 1];
      if (!nextMessage) return true;
      
      const nextIsOwn = nextMessage.is_own !== undefined 
        ? nextMessage.is_own 
        : (nextMessage.sender_type === 'user' || nextMessage.user_id !== undefined);
      
      // Если следующее сообщение от другого отправителя
      if (nextIsOwn !== isOwnMessage) return true;
      
      // Проверяем разницу во времени (5 минут = 300000 мс)
      const currentTime = new Date(message.created_at).getTime();
      const nextTime = new Date(nextMessage.created_at).getTime();
      const timeDiff = nextTime - currentTime;
      
      if (timeDiff > 5 * 60 * 1000) return true; // Больше 5 минут
      
      return false;
    })();

    return (
      <Box
        key={message.id}
        sx={{
          display: 'flex',
          justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
          // Одинаковое маленькое расстояние между всеми сообщениями (как в WhatsApp)
          mb: 0.25,
          px: 1,
        }}
      >
        <Box
          sx={{
            maxWidth: '75%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: isOwnMessage ? 'flex-end' : 'flex-start',
          }}
        >
          {/* Имя отправителя (показываем для всех, если нужно) */}
          {shouldShowSenderName && (
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                mb: 0.25, // Уменьшаем отступ у имени, чтобы расстояние было одинаковым
                px: 1,
                fontSize: '0.75rem',
                fontWeight: 500,
              }}
            >
              {isOwnMessage ? (t('support.you') || 'Вы') : senderName}
            </Typography>
          )}

          {/* Сообщение */}
          <Box
            sx={{
              position: 'relative',
              px: 1.5,
              py: 0.75,
              borderRadius: 2,
              backgroundColor: isOwnMessage ? '#dcf8c6' : '#ffffff',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
              border: isOwnMessage ? 'none' : '1px solid #e5e5e5',
              // Хвостик (tail) как в WhatsApp - только у последнего сообщения в группе
              ...(isLastInGroup && {
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  bottom: 0,
                  width: 0,
                  height: 0,
                  borderStyle: 'solid',
                  ...(isOwnMessage
                    ? {
                        right: '-8px',
                        borderWidth: '0 12px 12px 0',
                        borderColor: 'transparent #dcf8c6 transparent transparent',
                        transform: 'scaleX(-1)',
                      }
                    : {
                        left: '-8px',
                        borderWidth: '0 12px 12px 0',
                        borderColor: 'transparent #ffffff transparent transparent',
                      }),
                },
              }),
            }}
          >
            <Typography
              variant="body2"
              sx={{
                whiteSpace: 'pre-wrap',
                lineHeight: 1.5,
                color: 'text.primary',
                fontSize: '0.9375rem',
                wordBreak: 'break-word',
              }}
            >
              {messageText}
            </Typography>

            {/* Файлы */}
            {message.files && message.files.length > 0 && renderFilePreview && (
              <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {message.files.map((file) => (
                  <Box key={file.id}>
                    {renderFilePreview(file, () => {
                      // Логика скачивания будет в родительском компоненте
                    })}
                  </Box>
                ))}
              </Box>
            )}

            {/* Время и статус */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 0.5,
                mt: 0.5,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.6875rem',
                  opacity: 0.7,
                }}
              >
                {dateStr}
              </Typography>
              {isOwnMessage && (
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {/* Иконка галочек (прочитано) - можно добавить позже */}
                </Box>
              )}
            </Box>
          </Box>

          {/* Статус "решено" */}
          {message.is_resolved && (
            <Chip
              label={t('comments.resolved') || 'Решено'}
              size="small"
              color="success"
              sx={{
                fontSize: '0.6875rem',
                height: 20,
                mt: 0.5,
                '& .MuiChip-label': {
                  px: 1,
                },
              }}
            />
          )}
        </Box>
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth={false}
      sx={{
        '& .MuiDialog-paper': {
          position: 'fixed',
          right: 0,
          top: 0,
          height: '100vh',
          width: 550,
          maxHeight: '100vh',
          margin: 0,
          borderRadius: '8px 0 0 8px',
          zIndex: 1500,
          display: 'flex',
          flexDirection: 'column',
        },
      }}
      TransitionComponent={Slide}
      TransitionProps={{ direction: 'left' } as any}
    >
      {/* Заголовок */}
      <Box sx={{ 
        p: 3, 
        borderBottom: '1px solid', 
        borderColor: 'divider',
        bgcolor: 'background.paper',
        borderRadius: '8px 0 0 0'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
            {showStatusChip && statusChip && (
              <Box sx={{ mt: 0.5 }}>
                {statusChip}
              </Box>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {actionButton}
            <IconButton 
            onClick={onClose} 
            size="small"
            sx={{ 
              bgcolor: 'action.hover',
              '&:hover': { bgcolor: 'action.selected' }
            }}
          >
            <CloseIcon />
          </IconButton>
          </Box>
        </Box>
      </Box>

      {/* Список сообщений */}
      <Box sx={{ 
        flex: 1, 
        overflow: 'auto', 
        p: 1,
        bgcolor: '#ece5dd', // Фон как в WhatsApp
        backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'grid\' width=\'40\' height=\'40\' patternUnits=\'userSpaceOnUse\'%3E%3Cpath d=\'M 40 0 L 0 0 0 40\' fill=\'none\' stroke=\'%23f0f0f0\' stroke-width=\'1\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'100\' height=\'100\' fill=\'url(%23grid)\'/%3E%3C/svg%3E")',
        backgroundSize: '40px 40px',
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '3px',
          '&:hover': {
            background: 'rgba(0, 0, 0, 0.3)',
          },
        },
      }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => {}}>
            {error}
          </Alert>
        )}
        
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <CommentSkeleton />
            <CommentSkeleton />
            <CommentSkeleton />
          </Box>
        ) : messages.length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: 200,
            textAlign: 'center'
          }}>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              {emptyMessage || t('support.no_messages') || 'Нет сообщений'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {emptySubmessage || t('support.be_first') || 'Будьте первым, кто оставит сообщение'}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {messages.map((message, index) => renderMessage(message, index))}
            <div ref={messagesEndRef} />
          </Box>
        )}
      </Box>

      {/* Форма нового сообщения внизу */}
      <Box sx={{ 
        p: 3, 
        borderTop: '1px solid', 
        borderColor: 'divider',
        bgcolor: 'background.paper',
        borderRadius: '0 0 8px 0'
      }}>
        {files.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {files.map((filePreview) => (
              <Box
                key={filePreview.id}
                sx={{
                  position: 'relative',
                  width: 100,
                  height: 100,
                  border: '1px solid #ddd',
                  borderRadius: 1,
                  overflow: 'hidden',
                }}
              >
                <img
                  src={filePreview.preview}
                  alt={filePreview.file.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <IconButton
                  size="small"
                  onClick={() => handleRemoveFile(filePreview.id)}
                  disabled={submitting}
                  sx={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.9)' },
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 2 }}>
          {allowFiles && (
            <>
              <input
                accept={allowedFileTypes.join(',')}
                style={{ display: 'none' }}
                id="chat-file-upload"
                type="file"
                multiple
                onChange={handleFileSelect}
                disabled={submitting}
              />
              <label htmlFor="chat-file-upload">
                <IconButton 
                  component="span" 
                  disabled={submitting}
                  sx={{ 
                    bgcolor: 'action.hover',
                    '&:hover': { bgcolor: 'action.selected' }
                  }}
                >
                  <CloudUploadIcon />
                </IconButton>
              </label>
            </>
          )}
          
          <TextField
            fullWidth
            multiline
            rows={3}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={placeholder || t('support.type_message') || 'Введите сообщение...'}
            disabled={disabled || submitting}
            variant="outlined"
            size="small"
            sx={{ 
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              }
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={submitting ? <CircularProgress size={16} /> : <SendIcon />}
            onClick={handleSubmit}
            disabled={disabled || submitting || (!newMessage.trim() && files.length === 0)}
            sx={{
              borderRadius: 2,
              px: 3,
              py: 1,
              fontWeight: 600,
              textTransform: 'none',
              boxShadow: 2,
              '&:hover': {
                boxShadow: 4,
              }
            }}
          >
            {t('support.send') || 'Отправить'}
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
};

export default ChatDialog;

