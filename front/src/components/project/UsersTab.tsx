import React, { useState } from 'react';
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

interface UsersTabProps {
  pendingProjectMembers: any[];
  users: any[];
  onDeleteProjectMember: (memberId: number) => void;
  onSaveProjectMember: (member: any) => void;
  getRoleLabel: (role: string) => string;
  getRoleColor: (role: string) => 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
}

const UsersTab: React.FC<UsersTabProps> = ({
  pendingProjectMembers,
  users,
  onDeleteProjectMember,
  onSaveProjectMember,
  getRoleLabel,
  getRoleColor,
}) => {
  const { t } = useTranslation();
  
  const [projectMemberDialogOpen, setProjectMemberDialogOpen] = useState(false);
  const [isEditingProjectMember, setIsEditingProjectMember] = useState(false);
  const [selectedProjectMember, setSelectedProjectMember] = useState<any>(null);
  const [projectMemberFormData, setProjectMemberFormData] = useState({
    user_id: null as number | null,
    role: 'viewer'
  });

  const handleAddProjectMember = () => {
    setProjectMemberFormData({
      user_id: null,
      role: 'viewer'
    });
    setIsEditingProjectMember(false);
    setSelectedProjectMember(null);
    setProjectMemberDialogOpen(true);
  };

  const handleSaveProjectMember = () => {
    if (!projectMemberFormData.user_id) return;
    
    const memberData = {
      ...projectMemberFormData,
      id: selectedProjectMember?.id || Date.now()
    };
    
    onSaveProjectMember(memberData);
    setProjectMemberDialogOpen(false);
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
                      <Chip
                        label={getRoleLabel(member.role)}
                        color={getRoleColor(member.role)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => onDeleteProjectMember(member.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
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
              options={users}
              getOptionLabel={(user) => `${user.full_name} (${user.email})`}
              value={users.find(user => user.id === projectMemberFormData.user_id) || null}
              onChange={(_, newValue) => {
                setProjectMemberFormData(prev => ({
                  ...prev,
                  user_id: newValue ? newValue.id : null
                }));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('createProject.fields.user')}
                  placeholder={t('createProject.placeholders.start_typing_user')}
                />
              )}
              renderOption={(props, user) => (
                <Box component="li" {...props}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {user.full_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {user.email}
                    </Typography>
                  </Box>
                </Box>
              )}
              noOptionsText={t('createProject.messages.no_users_found')}
              clearOnEscape
              selectOnFocus
              handleHomeEndKeys
              disablePortal={true}
              ListboxProps={{
                style: {
                  maxHeight: '200px'
                }
              }}
            />

            <FormControl fullWidth>
              <InputLabel>{t('createProject.fields.role')}</InputLabel>
              <Select
                value={projectMemberFormData.role}
                onChange={(e) => setProjectMemberFormData(prev => ({
                  ...prev,
                  role: e.target.value
                }))}
                label={t('createProject.fields.role')}
                MenuProps={{
                  disablePortal: true
                }}
              >
                <MenuItem value="admin">{t('createProject.roles.admin')}</MenuItem>
                <MenuItem value="manager">{t('createProject.roles.manager')}</MenuItem>
                <MenuItem value="viewer">{t('createProject.roles.viewer')}</MenuItem>
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
            disabled={!projectMemberFormData.user_id}
          >
            {isEditingProjectMember ? t('common.save') : t('createProject.buttons.add')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersTab;
