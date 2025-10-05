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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Alert
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { 
  Add as AddIcon,
  Delete as DeleteIcon,
  Business as CompanyIcon
} from '@mui/icons-material';

interface ParticipantsTabProps {
  pendingParticipants: any[];
  companies: any[];
  contacts: any[];
  companyRoles: any[];
  onDeleteParticipant: (participantId: number) => void;
  onSaveParticipant: (participant: any) => void;
  onCompanyChange: (companyId: number) => void;
  getCompanyName: (company: any) => string;
  getContactName: (contact: any) => string;
  getRoleName: (role: any) => string;
}

const ParticipantsTab: React.FC<ParticipantsTabProps> = ({
  pendingParticipants,
  companies,
  contacts,
  companyRoles,
  onDeleteParticipant,
  onSaveParticipant,
  onCompanyChange,
  getCompanyName,
  getContactName,
  getRoleName,
}) => {
  const { t } = useTranslation();
  
  // Фильтруем компании, исключая уже добавленные
  const availableCompanies = companies.filter(company => 
    !pendingParticipants.some(participant => participant.company_id === company.id)
  );
  
  const [participantDialogOpen, setParticipantDialogOpen] = useState(false);
  const [isEditingParticipant, setIsEditingParticipant] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<any>(null);
  const [participantFormData, setParticipantFormData] = useState({
    company_id: '',
    contact_id: '',
    company_role_id: '',
    is_primary: false,
    notes: ''
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const validateForm = () => {
    const errors: string[] = [];
    
    if (!participantFormData.company_id) {
      errors.push(t('createProject.messages.company_required'));
    }
    
    if (!participantFormData.contact_id) {
      errors.push(t('createProject.messages.contact_required'));
    }
    
    if (!participantFormData.company_role_id) {
      errors.push(t('createProject.messages.role_required'));
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleAddParticipant = () => {
    setParticipantFormData({
      company_id: '',
      contact_id: '',
      company_role_id: '',
      is_primary: false,
      notes: ''
    });
    setSelectedParticipant(null);
    setIsEditingParticipant(false);
    setValidationErrors([]);
    setParticipantDialogOpen(true);
  };


  const handleSaveParticipant = () => {
    if (!validateForm()) {
      return; // Не сохраняем, если есть ошибки валидации
    }
    
    const participantData = {
      ...participantFormData,
      company_id: parseInt(participantFormData.company_id),
      contact_id: participantFormData.contact_id ? parseInt(participantFormData.contact_id) : null,
      company_role_id: participantFormData.company_role_id ? parseInt(participantFormData.company_role_id) : null,
      id: selectedParticipant?.id || Date.now(),
      project_id: 0,
      company_name: availableCompanies.find(c => c.id === parseInt(participantFormData.company_id))?.name || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    onSaveParticipant(participantData);
    setParticipantDialogOpen(false);
  };

  const handleCompanyChange = (companyId: number) => {
    setParticipantFormData(prev => ({ ...prev, company_id: companyId.toString(), contact_id: '' }));
    onCompanyChange(companyId);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          {t('createProject.sections.participants')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddParticipant}
          size="small"
        >
          {t('createProject.buttons.add_participant')}
        </Button>
      </Box>

      {pendingParticipants.length > 0 ? (
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('createProject.table.company')}</TableCell>
                  <TableCell>{t('createProject.table.contact_person')}</TableCell>
                  <TableCell>{t('createProject.table.role')}</TableCell>
                  <TableCell>{t('createProject.table.primary')}</TableCell>
                  <TableCell>{t('createProject.table.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingParticipants.map((participant) => (
                  <TableRow key={participant.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CompanyIcon fontSize="small" />
                        {participant.company_name}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const contact = contacts.find(c => c.id === participant.contact_id);
                        return contact?.full_name || '-';
                      })()}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const role = companyRoles.find(r => r.id === participant.company_role_id);
                        return role ? getRoleName(role) : t('createProject.table.not_specified');
                      })()}
                    </TableCell>
                    <TableCell>
                      {participant.is_primary ? t('createProject.table.yes') : t('createProject.table.no')}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => onDeleteParticipant(participant.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
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
            {t('createProject.messages.no_participants')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('createProject.messages.add_participants_hint')}
          </Typography>
        </Box>
      )}

      <Dialog
        open={participantDialogOpen}
        onClose={() => {
          setParticipantDialogOpen(false);
          setSelectedParticipant(null);
          setIsEditingParticipant(false);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            maxHeight: '80vh',
            overflow: 'hidden'
          }
        }}
        aria-labelledby="participant-dialog-title"
        aria-describedby="participant-dialog-description"
        disablePortal={false}
        keepMounted={false}
        disableAutoFocus={false}
        disableEnforceFocus={false}
        disableRestoreFocus={false}
      >
        <DialogTitle id="participant-dialog-title">
          {isEditingParticipant ? t('createProject.dialogs.edit_participant') : t('createProject.dialogs.add_participant')}
        </DialogTitle>
        <Box id="participant-dialog-description" sx={{ display: 'none' }}>
          {isEditingParticipant ? t('createProject.messages.edit_participant_description') : t('createProject.messages.add_participant_description')}
        </Box>
        <DialogContent sx={{ maxHeight: '60vh', overflow: 'auto' }}>
          {validationErrors.length > 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {validationErrors.map((error, index) => (
                <Box key={index}>{error}</Box>
              ))}
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>{t('createProject.fields.company')}</InputLabel>
              <Select
                value={participantFormData.company_id}
                onChange={(e) => {
                  const companyId = parseInt(e.target.value);
                  handleCompanyChange(companyId);
                  
                  // Сбрасываем контакт, если он не относится к выбранной компании
                  if (participantFormData.contact_id) {
                    const selectedContact = contacts.find(c => c.id === participantFormData.contact_id);
                    if (selectedContact && selectedContact.company_id !== companyId) {
                      setParticipantFormData(prev => ({ ...prev, contact_id: '' }));
                    }
                  }
                }}
                label={t('createProject.fields.company')}
                MenuProps={{
                  disablePortal: true,
                  PaperProps: {
                    style: {
                      maxHeight: '200px'
                    }
                  }
                }}
              >
                <MenuItem value="">
                  <em>{t('createProject.placeholders.select_company')}</em>
                </MenuItem>
                {availableCompanies.map((company) => (
                  <MenuItem key={company.id} value={company.id.toString()}>
                    {getCompanyName(company)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>{t('createProject.fields.contact_person')}</InputLabel>
              <Select
                value={(() => {
                  const contactId = participantFormData.contact_id || '';
                  // Проверяем, что выбранный контакт существует в списке
                  const contactExists = contacts.some(contact => contact.id.toString() === contactId);
                  return contactExists ? contactId : '';
                })()}
                onChange={(e) => setParticipantFormData(prev => ({ ...prev, contact_id: e.target.value }))}
                label={t('createProject.fields.contact_person')}
                disabled={!participantFormData.company_id}
                MenuProps={{
                  disablePortal: true,
                  PaperProps: {
                    style: {
                      maxHeight: '200px'
                    }
                  }
                }}
              >
                <MenuItem value="">
                  <em>{t('createProject.placeholders.select_contact')}</em>
                </MenuItem>
                {contacts
                  .filter(contact => contact.company_id === parseInt(participantFormData.company_id))
                  .map((contact) => (
                    <MenuItem key={contact.id} value={contact.id.toString()}>
                      {getContactName(contact)}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>{t('createProject.fields.role')}</InputLabel>
              <Select
                value={participantFormData.company_role_id || ''}
                onChange={(e) => setParticipantFormData(prev => ({ ...prev, company_role_id: e.target.value }))}
                label={t('createProject.fields.role')}
                MenuProps={{
                  disablePortal: true,
                  PaperProps: {
                    style: {
                      maxHeight: '200px'
                    }
                  }
                }}
              >
                <MenuItem value="">
                  <em>{t('createProject.placeholders.select_role')}</em>
                </MenuItem>
                {companyRoles.map((role) => (
                  <MenuItem key={role.id} value={role.id.toString()}>
                    {getRoleName(role)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label={t('createProject.fields.notes')}
              multiline
              rows={2}
              value={participantFormData.notes}
              onChange={(e) => setParticipantFormData(prev => ({ ...prev, notes: e.target.value }))}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={participantFormData.is_primary}
                  onChange={(e) => setParticipantFormData(prev => ({ ...prev, is_primary: e.target.checked }))}
                />
              }
              label={t('createProject.fields.is_primary')}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setParticipantDialogOpen(false);
            setSelectedParticipant(null);
            setIsEditingParticipant(false);
          }}>{t('common.cancel')}</Button>
          <Button
            onClick={handleSaveParticipant}
            variant="contained"
            disabled={!participantFormData.company_id}
          >
            {isEditingParticipant ? t('common.save') : t('createProject.buttons.add')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ParticipantsTab;