import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  Slide,
  Skeleton,
} from '@mui/material';
import {
  Send as SendIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as ResolveIcon,
  ChatBubbleOutline as ReplyIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { documentCommentsApi, type DocumentComment } from '../../api/client';
import { userStore } from '../../stores/UserStore';

interface DocumentCommentsProps {
  open: boolean;
  documentId: number | null;
  documentNumber?: string;
  onClose: () => void;
}

const DocumentComments: React.FC<DocumentCommentsProps> = observer(({
  open,
  documentId,
  documentNumber,
  onClose,
}) => {
  const { t } = useTranslation();
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [menuAnchor, setMenuAnchor] = useState<{ element: HTMLElement; commentId: number } | null>(null);

  // Загружаем комментарии при открытии
  useEffect(() => {
    if (open && documentId) {
      loadComments();
    }
  }, [open, documentId]);

  const loadComments = async () => {
    if (!documentId) return;
    
    setLoading(true);
    setError(null);
    try {
      const commentsData = await documentCommentsApi.getComments(documentId);
      setComments(commentsData);
    } catch (err) {
      setError(t('comments.load_error'));
      console.error('Error loading comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!documentId || !newComment.trim()) return;

    setSubmitting(true);
    try {
      await documentCommentsApi.createComment(documentId, newComment.trim());
      setNewComment('');
      await loadComments(); // Перезагружаем комментарии
    } catch (err) {
      setError(t('comments.create_error'));
      console.error('Error creating comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentCommentId: number) => {
    if (!documentId || !replyText.trim()) return;

    setSubmitting(true);
    try {
      await documentCommentsApi.createComment(documentId, replyText.trim(), parentCommentId);
      setReplyText('');
      setReplyingTo(null);
      await loadComments(); // Перезагружаем комментарии
    } catch (err) {
      setError(t('comments.reply_error'));
      console.error('Error creating reply:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditComment = async (commentId: number) => {
    if (!editText.trim()) return;

    setSubmitting(true);
    try {
      await documentCommentsApi.updateComment(commentId, editText.trim());
      setEditingComment(null);
      setEditText('');
      await loadComments(); // Перезагружаем комментарии
    } catch (err) {
      setError(t('comments.update_error'));
      console.error('Error updating comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await documentCommentsApi.deleteComment(commentId);
      await loadComments(); // Перезагружаем комментарии
    } catch (err) {
      setError(t('comments.delete_error'));
      console.error('Error deleting comment:', err);
    }
  };

  const handleToggleResolve = async (commentId: number) => {
    try {
      await documentCommentsApi.toggleResolve(commentId);
      await loadComments(); // Перезагружаем комментарии
    } catch (err) {
      setError(t('comments.status_error'));
      console.error('Error toggling resolve:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  };

  const canEditComment = (comment: DocumentComment) => {
    return comment.user_id === userStore.currentUser?.id;
  };

  const CommentSkeleton = () => (
    <Box sx={{ mb: 1, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Skeleton variant="text" width={120} height={20} />
          <Skeleton variant="text" width={80} height={16} />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Skeleton variant="circular" width={24} height={24} />
          <Skeleton variant="circular" width={24} height={24} />
        </Box>
      </Box>
      <Skeleton variant="text" width="100%" height={16} />
      <Skeleton variant="text" width="80%" height={16} />
    </Box>
  );

  const renderCommentWithReplies = (comment: DocumentComment, isReply = false, level = 0) => (
    <React.Fragment key={comment.id}>
      {renderComment(comment, isReply, level)}
      
      {/* Рекурсивно отображаем ответы на этот комментарий */}
      {comment.replies && comment.replies.map((reply) => 
        renderCommentWithReplies(reply, true, level + 1)
      )}
      
      {/* Форма ответа на этот комментарий */}
      {replyingTo === comment.id && (
        <Box sx={{ 
          ml: isReply ? (level + 1) * 4 : 4, 
          p: 2, 
          bgcolor: 'background.paper', 
          borderRadius: 2
        }}>
          <TextField
            fullWidth
            multiline
            rows={2}
            placeholder={isReply ? t('comments.reply_to_reply_placeholder') : t('comments.reply_placeholder')}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            variant="outlined"
            size="small"
            sx={{ mb: 1 }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                setReplyingTo(null);
                setReplyText('');
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={() => handleSubmitReply(comment.id)}
              disabled={!replyText.trim() || submitting}
              startIcon={submitting ? <CircularProgress size={16} /> : <SendIcon />}
            >
              {t('comments.reply')}
            </Button>
          </Box>
        </Box>
      )}
    </React.Fragment>
  );

  const renderComment = (comment: DocumentComment, isReply = false, level = 0) => (
    <Box 
      key={comment.id} 
      sx={{ 
        mb: 1,
        ml: isReply ? level * 4 : 0,
        p: 2,
        bgcolor: 'background.paper',
        borderRadius: 1,
        borderLeft: comment.is_resolved ? '4px solid' : '4px solid transparent',
        borderLeftColor: comment.is_resolved ? 'success.main' : 'transparent',
        '&:hover': {
          bgcolor: 'action.hover',
        }
      }}
    >
      {/* Заголовок комментария */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle2" fontWeight="600" color="primary">
            {comment.user_name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatDate(comment.created_at)}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {comment.is_resolved && (
            <Chip
              label={t('comments.resolved')}
              size="small"
              color="success"
              icon={<ResolveIcon />}
              sx={{ fontSize: '0.75rem' }}
            />
          )}
          <IconButton
            size="small"
            onClick={() => {
              setReplyingTo(comment.id);
              setReplyText('');
            }}
            title={t('comments.reply')}
            sx={{ 
              bgcolor: 'action.hover',
              '&:hover': { bgcolor: 'action.selected' }
            }}
          >
            <ReplyIcon fontSize="small" />
          </IconButton>
          {canEditComment(comment) && (
            <IconButton
              size="small"
              onClick={(e) => setMenuAnchor({ element: e.currentTarget, commentId: comment.id })}
              sx={{ 
                bgcolor: 'action.hover',
                '&:hover': { bgcolor: 'action.selected' }
              }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Содержимое комментария */}
      <Box>
        {editingComment === comment.id ? (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <TextField
              fullWidth
              multiline
              rows={3}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              variant="outlined"
              size="small"
              sx={{ 
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                }
              }}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                size="small"
                variant="contained"
                onClick={() => handleEditComment(comment.id)}
                disabled={submitting}
                sx={{ borderRadius: 2 }}
              >
                {t('comments.save')}
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  setEditingComment(null);
                  setEditText('');
                }}
                sx={{ borderRadius: 2 }}
              >
                {t('common.cancel')}
              </Button>
            </Box>
          </Box>
        ) : (
          <Typography 
            variant="body2" 
            sx={{ 
              whiteSpace: 'pre-wrap',
              lineHeight: 1.6,
              color: 'text.primary'
            }}
          >
            {comment.content}
          </Typography>
        )}
      </Box>
    </Box>
  );

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
      TransitionProps={{ direction: 'left' }}
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
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {t('comments.header')} {documentNumber && `- ${documentNumber}`}
          </Typography>
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

      {/* Список комментариев */}
      <Box sx={{ 
        flex: 1, 
        overflow: 'auto', 
        p: 2,
        bgcolor: 'grey.50'
      }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <CommentSkeleton />
            <CommentSkeleton />
            <CommentSkeleton />
          </Box>
        ) : comments.length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: 200,
            textAlign: 'center'
          }}>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              {t('comments.no_comments')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('comments.be_first')}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {comments.map((comment) => renderCommentWithReplies(comment))}
          </Box>
        )}
      </Box>

      {/* Форма нового комментария внизу */}
      <Box sx={{ 
        p: 3, 
        borderTop: '1px solid', 
        borderColor: 'divider',
        bgcolor: 'background.paper',
        borderRadius: '0 0 8px 0'
      }}>
        <TextField
          fullWidth
          multiline
          rows={3}
          placeholder={t('comments.write_placeholder')}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          variant="outlined"
          size="small"
          sx={{ 
            mb: 2,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
            }
          }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={submitting ? <CircularProgress size={16} /> : <SendIcon />}
            onClick={handleSubmitComment}
            disabled={!newComment.trim() || submitting}
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
            {t('comments.send')}
          </Button>
        </Box>
      </Box>

      {/* Меню действий с комментарием */}
      <Menu
        anchorEl={menuAnchor?.element}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem
          onClick={() => {
            const comment = comments.find(c => c.id === menuAnchor?.commentId);
            if (comment) {
              setEditingComment(comment.id);
              setEditText(comment.content);
            }
            setMenuAnchor(null);
          }}
        >
          <EditIcon sx={{ mr: 1 }} />
          {t('comments.edit')}
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuAnchor?.commentId) {
              handleToggleResolve(menuAnchor.commentId);
            }
            setMenuAnchor(null);
          }}
        >
          <ResolveIcon sx={{ mr: 1 }} />
          {t('comments.mark_resolved')}
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuAnchor?.commentId) {
              handleDeleteComment(menuAnchor.commentId);
            }
            setMenuAnchor(null);
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} />
          {t('comments.delete')}
        </MenuItem>
      </Menu>
    </Dialog>
  );
});

export default DocumentComments;
