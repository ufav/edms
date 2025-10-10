import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  TextField,
  Chip
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { 
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { type ProjectRole } from '../../api/client';
import { userStore } from '../../stores/UserStore';

interface UsersTabProps {
  pendingProjectMembers: any[];
  users: any[];
  projectRoles: ProjectRole[];
  onDeleteProjectMember: (memberId: number) => void;
  onSaveProjectMember: (member: any) => void;
}

const UsersTab: React.FC<UsersTabProps> = ({
  pendingProjectMembers,
  users,
  projectRoles,
  onDeleteProjectMember,
  onSaveProjectMember,
}) => {
  const { t } = useTranslation();
  
  const [projectMemberDialogOpen, setProjectMemberDialogOpen] = useState(false);
  const [isEditingProjectMember, setIsEditingProjectMember] = useState(false);
  const [selectedProjectMember, setSelectedProjectMember] = useState<any>(null);
  const [projectMemberFormData, setProjectMemberFormData] = useState({
    user_id: null as number | null,
    project_role_id: null as number | null
  });

  // Функция для определения цвета роли
  const getRoleColor = (roleCode: string) => {
    switch (roleCode) {
      case 'owner':
        return 'error'; // Красный для владельца
      case 'manager':
        return 'warning'; // Оранжевый для менеджера
      case 'reviewer':
        return 'info'; // Синий для рецензента
      case 'contributor':
        return 'success'; // Зеленый для участника
      case 'viewer':
        return 'default'; // Серый для наблюдателя
      default:
        return 'default';
    }
  };

  // Функция для фильтрации ролей в зависимости от глобальной роли пользователя
  const getAvailableRoles = (userId: number | null) => {
    if (!userId) return projectRoles;
    
    const user = users.find(u => u.id === userId);
    if (!user) return projectRoles;
    
    // Если пользователь имеет глобальную роль Viewer, показываем только роль viewer
    if (user.role === 'Viewer') {
      return projectRoles.filter(role => role.code === 'viewer');
    }
    
    // Для остальных ролей показываем все роли
    return projectRoles;
  };

  const handleAddProjectMember = () => {
    setProjectMemberFormData({
      user_id: null,
      project_role_id: null
    });
    setIsEditingProjectMember(false);
    setSelectedProjectMember(null);
    setProjectMemberDialogOpen(true);
  };

  const handleSaveProjectMember = () => {
    if (!projectMemberFormData.user_id || !projectMemberFormData.project_role_id) return;
    
    // Проверяем, не добавлен ли уже этот пользователь
    const isUserAlreadyAdded = pendingProjectMembers.some(member => 
      member.user_id === projectMemberFormData.user_id && member.id !== selectedProjectMember?.id
    );
    
    if (isUserAlreadyAdded) {
      alert('Этот пользователь уже добавлен в проект');
      return;
    }

    
    const memberData = {
      ...projectMemberFormData,
      id: selectedProjectMember?.id || Date.now()
    };
    
    onSaveProjectMember(memberData);
    setProjectMemberDialogOpen(false);
  };

  // Обработчик изменения пользователя
  const handleUserChange = (userId: number | null) => {
    const availableRoles = getAvailableRoles(userId);
    const currentRoleId = projectMemberFormData.project_role_id;
    
    // Если текущая выбранная роль недоступна для нового пользователя, сбрасываем её
    if (currentRoleId && !availableRoles.some(role => role.id === currentRoleId)) {
      setProjectMemberFormData(prev => ({
        ...prev,
        user_id: userId,
        project_role_id: null
      }));
    } else {
      setProjectMemberFormData(prev => ({
        ...prev,
        user_id: userId
      }));
    }
  };

  const handleCloseDialog = () => {
    setProjectMemberDialogOpen(false);
    setSelectedProjectMember(null);
    setIsEditingProjectMember(false);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          {t('createProject.sections.users')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddProjectMember}
          size="small"
        >
          {t('createProject.buttons.add_user')}
        </Button>
      </Box>

      {pendingProjectMembers.length > 0 ? (
        <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>{t('createProject.table.user')}</TableCell>
                <TableCell>{t('createProject.table.role')}</TableCell>
                <TableCell>{t('createProject.table.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pendingProjectMembers.map((member) => {
                const user = users.find(u => u.id === member.user_id);
                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {user?.full_name || t('createProject.messages.unknown_user')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {user?.email || t('createProject.messages.no_email')}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const role = projectRoles.find(r => r.id === member.project_role_id);
                        return role ? (
                          <Chip
                            label={role.name_en || role.name}
                            color={getRoleColor(role.code) as any}
                            size="small"
                          />
                        ) : (
                          <Chip
                            label="Не назначена"
                            color="default"
                            size="small"
                          />
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const currentUserId = userStore.currentUser?.id;
                        const isCurrentUser = currentUserId && member.user_id === currentUserId;
                        
                        return (
                          <IconButton
                            size="small"
                            onClick={() => onDeleteProjectMember(member.id)}
                            disabled={isCurrentUser}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        );
                      })()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          gap: 2,
          textAlign: 'center'
        }}>
          <Typography variant="h6" color="text.secondary">
            {t('createProject.messages.no_users')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('createProject.messages.add_users_hint')}
          </Typography>
        </Box>
      )}

      {/* Project Member Dialog */}
      <Dialog
        open={projectMemberDialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            maxHeight: '80vh',
            overflow: 'hidden'
          }
        }}
        aria-labelledby="user-dialog-title"
        aria-describedby="user-dialog-description"
        disablePortal={false}
        keepMounted={false}
        disableAutoFocus={false}
        disableEnforceFocus={false}
        disableRestoreFocus={false}
      >
        <DialogTitle id="user-dialog-title">
          {isEditingProjectMember ? t('createProject.dialogs.edit_user') : t('createProject.dialogs.add_user')}
        </DialogTitle>
        <Box id="user-dialog-description" sx={{ display: 'none' }}>
          {isEditingProjectMember ? t('createProject.messages.edit_user_description') : t('createProject.messages.add_user_description')}
        </Box>
        <DialogContent sx={{ maxHeight: '60vh', overflow: 'auto' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Autocomplete
              options={users.filter(user => 
                !pendingProjectMembers.some(member => member.user_id === user.id)
              )}
              getOptionLabel={(user) => `${user.full_name} (${user.email})`}
              value={users.find(user => user.id === projectMemberFormData.user_id) || null}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              onChange={(_, newValue) => {
                handleUserChange(newValue ? newValue.id : null);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('createProject.fields.user')}
                  variant="standard"
                  placeholder={t('createProject.placeholders.start_typing_user')}
                />
              )}
              renderOption={(props, user) => {
                const { key, ...otherProps } = props;
                return (
                  <Box component="li" key={key} {...otherProps}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {user.full_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {user.email}
                      </Typography>
                    </Box>
                  </Box>
                );
              }}
              noOptionsText={t('createProject.messages.no_users_found')}
              clearOnEscape
              selectOnFocus
              handleHomeEndKeys
              ListboxProps={{
                style: {
                  maxHeight: '300px',
                  overflow: 'auto'
                }
              }}
              slotProps={{
                popper: {
                  placement: 'bottom-start',
                  modifiers: [
                    {
                      name: 'preventOverflow',
                      enabled: false,
                    },
                    {
                      name: 'flip',
                      enabled: false,
                    },
                  ],
                },
              }}
            />

            <FormControl fullWidth variant="standard">
              <InputLabel>{t('createProject.fields.role')}</InputLabel>
              <Select
                value={projectMemberFormData.project_role_id || ''}
                onChange={(e) => setProjectMemberFormData(prev => ({
                  ...prev,
                  project_role_id: e.target.value as number
                }))}
                label={t('createProject.fields.role')}
                MenuProps={{
                  disablePortal: true
                }}
              >
                {getAvailableRoles(projectMemberFormData.user_id).map((role) => (
                  <MenuItem key={role.id} value={role.id}>
                    {role.name_en || role.name} - {role.description}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSaveProjectMember}
            variant="contained"
            disabled={!projectMemberFormData.user_id || !projectMemberFormData.project_role_id}
          >
            {isEditingProjectMember ? t('common.save') : t('createProject.buttons.add')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersTab;
