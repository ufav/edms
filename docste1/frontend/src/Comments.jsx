import React, { useState, useEffect, useRef } from 'react';
import { Avatar, Drawer, Form, Input, Button, message, Popconfirm, Modal } from 'antd';
import { CommentOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { Comment } from '@ant-design/compatible';
import { observer } from 'mobx-react-lite';
import { authStore } from './stores/auth';
import moment from 'moment';
import { getComments, addComment, updateComment, deleteComment } from './Datasources';

const { TextArea } = Input;

const Comments = observer(({ documentId, visible, onClose, onCommentAdded, onCommentDeleted }) => {
  const [comments, setComments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [activeReplyId, setActiveReplyId] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [isDirty, setIsDirty] = useState(false); // Новое состояние для отслеживания изменений
  const [rootForm] = Form.useForm();
  const [replyForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const commentsContainerRef = useRef(null);

  useEffect(() => {
    if (visible && documentId) {
      fetchComments();
    }
  }, [visible, documentId]);

  const fetchComments = async () => {
    if (!authStore.isAuthenticated) {
      message.error('You need to log in to view comments');
      return;
    }
    try {
      const fetchedComments = await getComments(documentId);
      setComments(fetchedComments);
    } catch (error) {
      if (error.response?.status === 401) {
        message.error('Session expired, please log in again');
        authStore.clearUser();
      } else {
        message.error('Failed to load comments');
      }
    }
  };

  const handleSubmit = async (values, parentId = null, formInstance) => {
    if (!authStore.isAuthenticated) {
      message.error('Please log in to comment');
      return;
    }
    setSubmitting(true);
    try {
      const newCommentData = {
        document_id: documentId,
        user_id: authStore.user_id,
        parent_id: parentId,
        content: values.content,
      };
      const response = await addComment(newCommentData);
      const normalizedComment = {
        ...response,
        created: new Date().toISOString(),
      };
      setComments((prevComments) => {
        const updatedComments = [...prevComments, normalizedComment];
        if (!parentId && commentsContainerRef.current) {
          setTimeout(() => {
            commentsContainerRef.current.scrollTo({
              top: commentsContainerRef.current.scrollHeight,
              behavior: 'smooth',
            });
          }, 0);
        }
        return updatedComments;
      });
      setActiveReplyId(null);
      formInstance.resetFields();
      setIsDirty(false); // Сбрасываем флаг изменений после отправки
      message.success('Comment added successfully');
      if (onCommentAdded) onCommentAdded();
    } catch (error) {
      message.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (commentId, values) => {
    setSubmitting(true);
    try {
      const response = await updateComment(commentId, values.content);
      setComments((prevComments) =>
        prevComments.map((c) =>
          c.id === commentId ? { ...c, content: response.content, updated: response.updated } : c
        )
      );
      setEditingCommentId(null);
      editForm.resetFields();
      setIsDirty(false); // Сбрасываем флаг изменений после редактирования
      message.success('Comment updated successfully');
    } catch (error) {
      message.error('Failed to update comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      await deleteComment(commentId);
      setComments((prevComments) => prevComments.filter((c) => c.id !== commentId));
      message.success('Comment deleted successfully');
      if (onCommentDeleted) onCommentDeleted();
    } catch (error) {
      message.error('Failed to delete comment');
    }
  };

  const handleStartEdit = (commentId, content) => {
    setEditingCommentId(commentId);
    editForm.setFieldsValue({ content });
    setIsDirty(true); // Устанавливаем флаг изменений при начале редактирования
  };

  // Отслеживание изменений в формах
  const handleFormChange = () => {
    setIsDirty(true);
  };

  // Обработчик закрытия Drawer с проверкой несохранённых изменений
  const handleClose = () => {
    if (isDirty) {
      Modal.confirm({
        title: 'You have unsaved changes',
        content: 'Are you sure you want to close? All unsaved changes will be lost.',
        onOk: () => {
          // Сбрасываем формы и состояния
          rootForm.resetFields();
          replyForm.resetFields();
          editForm.resetFields();
          setActiveReplyId(null);
          setEditingCommentId(null);
          setIsDirty(false);
          onClose();
        },
        onCancel: () => {
          // Ничего не делаем, оставляем Drawer открытым
        },
      });
    } else {
      // Если нет изменений, просто закрываем
      rootForm.resetFields();
      replyForm.resetFields();
      editForm.resetFields();
      setActiveReplyId(null);
      setEditingCommentId(null);
      onClose();
    }
  };

  const renderComment = (comment) => {
    const children = comments
      .filter((c) => c.parent_id === comment.id)
      .map((child) => renderComment(child));

    const isReplying = activeReplyId === comment.id;
    const isEditing = editingCommentId === comment.id;
    const fullName = `${comment.name || ''} ${comment.surname || ''}`.trim();
    const authorName = comment.user_id === authStore.user_id ? 'You' : fullName || `User ${comment.user_id}`;
    const isOwnComment = comment.user_id === authStore.user_id;

    return (
      <Comment
        key={comment.id}
        actions={
          isOwnComment
            ? [
                <CommentOutlined
                  key="reply"
                  onClick={() => setActiveReplyId(comment.id)}
                  style={{ cursor: 'pointer' }}
                />,
                <EditOutlined
                  key="edit"
                  onClick={() => handleStartEdit(comment.id, comment.content)}
                  style={{ cursor: 'pointer' }}
                />,
                <Popconfirm
                  title="Are you sure you want to delete this comment?"
                  onConfirm={() => handleDelete(comment.id)}
                  okText="Yes"
                  cancelText="No"
                >
                  <DeleteOutlined key="delete" style={{ cursor: 'pointer' }} />
                </Popconfirm>,
              ]
            : [
                <CommentOutlined
                  key="reply"
                  onClick={() => setActiveReplyId(comment.id)}
                  style={{ cursor: 'pointer' }}
                />,
              ]
        }
        author={authorName}
        avatar={<Avatar>{comment.user_id}</Avatar>}
        content={
          isEditing ? (
            <Form
              form={editForm}
              name={`edit-${comment.id}`}
              onFinish={(values) => handleEdit(comment.id, values)}
              style={{ marginTop: 8 }}
              onValuesChange={handleFormChange} // Отслеживаем изменения
            >
              <Form.Item
                name="content"
                rules={[{ required: true, message: 'Please enter your comment' }]}
              >
                <TextArea rows={2} style={{ resize: 'none' }} />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={submitting}>
                  Save
                </Button>
                <Button
                  style={{ margin: '0 8px' }}
                  onClick={() => {
                    setEditingCommentId(null);
                    editForm.resetFields();
                    setIsDirty(false); // Сбрасываем флаг при отмене
                  }}
                >
                  Cancel
                </Button>
              </Form.Item>
            </Form>
          ) : (
            <p>{comment.content}</p>
          )
        }
        datetime={
          <span>
            {moment(comment.created).fromNow()}
            {comment.updated && ` (edited ${moment(comment.updated).fromNow()})`}
          </span>
        }
      >
        {isReplying && (
          <Form
            form={replyForm}
            name={`reply-${comment.id}`}
            onFinish={(values) => handleSubmit(values, comment.id, replyForm)}
            style={{ marginTop: 8 }}
            onValuesChange={handleFormChange} // Отслеживаем изменения
          >
            <Form.Item
              name="content"
              rules={[{ required: true, message: 'Please enter your reply' }]}
            >
              <TextArea rows={2} placeholder="Write a reply..." style={{ resize: 'none' }} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Reply
              </Button>
              <Button
                style={{ margin: '0 8px' }}
                onClick={() => {
                  setActiveReplyId(null);
                  replyForm.resetFields();
                  setIsDirty(false); // Сбрасываем флаг при отмене
                }}
              >
                Cancel
              </Button>
            </Form.Item>
          </Form>
        )}
        {children}
      </Comment>
    );
  };

  return (
    <Drawer
      title={`Comments`}
      placement="right"
      width={800}
      onClose={handleClose} // Используем новый обработчик
      open={visible}
      styles={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      <div
        ref={commentsContainerRef}
        style={{ flex: 1, overflowY: 'auto', padding: '16px' }}
      >
        {comments.filter((c) => !c.parent_id).map((comment) => renderComment(comment))}
      </div>
      <div style={{ padding: '16px', borderTop: '1px solid #f0f0f0', background: '#fff' }}>
        <Form
          form={rootForm}
          name="root-comment"
          onFinish={(values) => handleSubmit(values, null, rootForm)}
          onValuesChange={handleFormChange} // Отслеживаем изменения
        >
          <Form.Item
            name="content"
            rules={[{ required: true, message: 'Please enter your comment' }]}
          >
            <TextArea rows={4} placeholder="Write a comment..." style={{ resize: 'none' }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Add Comment
            </Button>
          </Form.Item>
        </Form>
      </div>
    </Drawer>
  );
});

export default Comments;