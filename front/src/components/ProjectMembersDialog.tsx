import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { projectsApi, usersApi, type ProjectMember, type User } from '../api/client';
import AddMemberDialog from './AddMemberDialog';
import ConfirmDialog from './ConfirmDialog';

interface ProjectMembersDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: number;
  projectName: string;
}

const ProjectMembersDialog: React.FC<ProjectMembersDialogProps> = ({
  open,
  onClose,
  projectId,
  projectName
}) => {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingRemoveUserId, setPendingRemoveUserId] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      loadMembers();
      loadUsers();
    }
  }, [open]);

  const loadMembers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const membersData = await projectsApi.members.getAll(projectId);
      setMembers(membersData);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Ошибка загрузки участников');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const usersData = await usersApi.getAll();
      setUsers(usersData);
    } catch (error) {
    }
  };

  const askRemoveMember = (userId: number) => {
    setPendingRemoveUserId(userId);
    setConfirmOpen(true);
  };

  const confirmRemoveMember = async () => {
    if (pendingRemoveUserId == null) return;
    try {
      await projectsApi.members.remove(projectId, pendingRemoveUserId);
      await loadMembers();
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Ошибка удаления участника');
    } finally {
      setConfirmOpen(false);
      setPendingRemoveUserId(null);
    }
  };

  const handleAddMember = () => {
    setAddMemberDialogOpen(true);
  };

  const handleCloseAddMemberDialog = () => {
    setAddMemberDialogOpen(false);
  };

  const handleMemberAdded = () => {
    loadMembers(); // Перезагружаем список участников
    setAddMemberDialogOpen(false);
  };

  const getUserName = (userId: number): string => {
    const user = users.find(u => u.id === userId);
    return user ? `${user.username} (${user.full_name})` : `User ${userId}`;
  };

  const getRoleLabel = (role: string): string => {
    const roleMap: { [key: string]: string } = {
      'admin': 'Администратор',
      'operator': 'Оператор',
      'viewer': 'Читатель'
    };
    return roleMap[role] || role;
  };

  const getRoleColor = (role: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    const colorMap: { [key: string]: "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" } = {
      'admin': 'error',
      'operator': 'warning',
      'viewer': 'info'
    };
    return colorMap[role] || 'default';
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon />
            Участники проекта "{projectName}"
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {error && <Alert severity="error">{error}</Alert>}
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">
                Список участников ({members.length})
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddMember}
                size="small"
              >
                Добавить участника
              </Button>
            </Box>

            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Пользователь</TableCell>
                      <TableCell>Роль</TableCell>
                      <TableCell>Дата добавления</TableCell>
                      <TableCell align="center">Действия</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <Typography variant="body2">
                            {getUserName(member.user_id)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getRoleLabel(member.role)}
                            color={getRoleColor(member.role)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {member.joined_at ? formatDate(member.joined_at) : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Удалить участника">
                            <IconButton
                              size="small"
                              onClick={() => askRemoveMember(member.user_id)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {!isLoading && members.length === 0 && (
              <Box sx={{ textAlign: 'center', p: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Участники не найдены
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог добавления участника */}
      <AddMemberDialog
        open={addMemberDialogOpen}
        onClose={handleCloseAddMemberDialog}
        projectId={projectId}
        projectName={projectName}
        onMemberAdded={handleMemberAdded}
        existingMembers={members}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Удалить участника?"
        content="Вы уверены, что хотите удалить этого участника из проекта?"
        confirmText="Удалить"
        onConfirm={confirmRemoveMember}
        onClose={() => setConfirmOpen(false)}
      />
    </>
  );
};

export default ProjectMembersDialog;
