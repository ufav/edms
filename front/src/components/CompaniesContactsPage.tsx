import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { contactsApi, referencesApi, type Company, type Contact } from '../api/client';

type CompanyForm = {
  name: string;
  name_native?: string;
  is_active: boolean;
};

type ContactForm = {
  company_id: number;
  full_name: string;
  position?: string;
  email?: string;
  phone?: string;
  notes?: string;
  is_primary: boolean;
};

const emptyCompanyForm: CompanyForm = {
  name: '',
  name_native: '',
  is_active: true,
};

const emptyContactForm: ContactForm = {
  company_id: 0,
  full_name: '',
  position: '',
  email: '',
  phone: '',
  notes: '',
  is_primary: false,
};

const CompaniesContactsPage: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyForm, setCompanyForm] = useState<CompanyForm>(emptyCompanyForm);

  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [contactForm, setContactForm] = useState<ContactForm>(emptyContactForm);

  const companiesById = useMemo(() => {
    const m = new Map<number, Company>();
    companies.forEach((c) => m.set(c.id, c));
    return m;
  }, [companies]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [companiesData, contactsData] = await Promise.all([
        referencesApi.getCompanies(),
        contactsApi.getAll(),
      ]);
      setCompanies(companiesData);
      setContacts(contactsData);
    } catch (e: any) {
      setError(e?.response?.data?.detail || t('companiesContacts.load_error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateCompany = () => {
    setEditingCompany(null);
    setCompanyForm(emptyCompanyForm);
    setCompanyDialogOpen(true);
  };

  const openEditCompany = (company: Company) => {
    setEditingCompany(company);
    setCompanyForm({
      name: company.name || '',
      name_native: company.name_native || '',
      is_active: company.is_active ?? true,
    });
    setCompanyDialogOpen(true);
  };

  const saveCompany = async () => {
    if (!companyForm.name.trim()) {
      setError(t('companiesContacts.company_name_required'));
      return;
    }
    try {
      if (editingCompany) {
        await referencesApi.updateCompany(editingCompany.id, companyForm);
      } else {
        await referencesApi.createCompany(companyForm);
      }
      setCompanyDialogOpen(false);
      await loadData();
    } catch (e: any) {
      setError(e?.response?.data?.detail || t('companiesContacts.save_error'));
    }
  };

  const removeCompany = async (company: Company) => {
    if (!window.confirm(t('companiesContacts.company_delete_confirm', { name: company.name }))) return;
    try {
      await referencesApi.deleteCompany(company.id);
      await loadData();
    } catch (e: any) {
      setError(e?.response?.data?.detail || t('companiesContacts.delete_error'));
    }
  };

  const openCreateContact = () => {
    setEditingContact(null);
    setContactForm({
      ...emptyContactForm,
      company_id: companies[0]?.id || 0,
    });
    setContactDialogOpen(true);
  };

  const openEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setContactForm({
      company_id: contact.company_id,
      full_name: contact.full_name || '',
      position: contact.position || '',
      email: contact.email || '',
      phone: contact.phone || '',
      notes: contact.notes || '',
      is_primary: !!contact.is_primary,
    });
    setContactDialogOpen(true);
  };

  const saveContact = async () => {
    if (!contactForm.company_id) {
      setError(t('companiesContacts.company_required'));
      return;
    }
    if (!contactForm.full_name.trim()) {
      setError(t('companiesContacts.contact_name_required'));
      return;
    }
    try {
      if (editingContact) {
        await contactsApi.update(editingContact.id, contactForm);
      } else {
        await contactsApi.create(contactForm.company_id, contactForm);
      }
      setContactDialogOpen(false);
      await loadData();
    } catch (e: any) {
      setError(e?.response?.data?.detail || t('companiesContacts.save_error'));
    }
  };

  const removeContact = async (contact: Contact) => {
    if (!window.confirm(t('companiesContacts.contact_delete_confirm', { name: contact.full_name }))) return;
    try {
      await contactsApi.delete(contact.id);
      await loadData();
    } catch (e: any) {
      setError(e?.response?.data?.detail || t('companiesContacts.delete_error'));
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>{t('companiesContacts.title')}</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '460px 1fr' },
          gap: 3,
          alignItems: 'start',
        }}
      >
        <Paper sx={{ p: 2, width: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="h6">{t('companiesContacts.companies')}</Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateCompany} disabled={loading}>
              {t('common.add')}
            </Button>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('companiesContacts.columns.name')}</TableCell>
                  <TableCell>{t('companiesContacts.columns.status')}</TableCell>
                  <TableCell align="right">{t('common.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {companies.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell sx={{ maxWidth: 220 }}>{c.name}</TableCell>
                    <TableCell>{c.is_active ? t('companiesContacts.active') : t('companiesContacts.inactive')}</TableCell>
                    <TableCell align="right">
                      <Tooltip title={t('common.edit')}>
                        <IconButton size="small" onClick={() => openEditCompany(c)}><EditIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title={t('common.delete')}>
                        <IconButton size="small" onClick={() => removeCompany(c)}><DeleteIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Paper sx={{ p: 2, width: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="h6">{t('companiesContacts.contacts')}</Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateContact} disabled={loading || companies.length === 0}>
              {t('common.add')}
            </Button>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('companiesContacts.columns.company')}</TableCell>
                  <TableCell>{t('companiesContacts.columns.contact')}</TableCell>
                  <TableCell>{t('companiesContacts.columns.email')}</TableCell>
                  <TableCell>{t('companiesContacts.columns.phone')}</TableCell>
                  <TableCell>{t('companiesContacts.columns.position')}</TableCell>
                  <TableCell>{t('companiesContacts.columns.primary')}</TableCell>
                  <TableCell align="right">{t('common.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {contacts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{companiesById.get(c.company_id)?.name || c.company_name || '-'}</TableCell>
                    <TableCell>{c.full_name}</TableCell>
                    <TableCell>{c.email || '-'}</TableCell>
                    <TableCell>{c.phone || '-'}</TableCell>
                    <TableCell>{c.position || '-'}</TableCell>
                    <TableCell>{c.is_primary ? t('common.yes') : t('common.no')}</TableCell>
                    <TableCell align="right">
                      <Tooltip title={t('common.edit')}>
                        <IconButton size="small" onClick={() => openEditContact(c)}><EditIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title={t('common.delete')}>
                        <IconButton size="small" onClick={() => removeContact(c)}><DeleteIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>

      <Dialog open={companyDialogOpen} onClose={() => setCompanyDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingCompany ? t('common.edit') : t('common.add')}</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label={t('companiesContacts.columns.name')} value={companyForm.name} onChange={(e) => setCompanyForm((s) => ({ ...s, name: e.target.value }))} />
          <FormControlLabel
            control={<Checkbox checked={companyForm.is_active} onChange={(e) => setCompanyForm((s) => ({ ...s, is_active: e.target.checked }))} />}
            label={t('companiesContacts.columns.status')}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompanyDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button onClick={saveCompany} variant="contained">{t('common.save')}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={contactDialogOpen} onClose={() => setContactDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingContact ? t('common.edit') : t('common.add')}</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Select
            value={contactForm.company_id}
            onChange={(e) => setContactForm((s) => ({ ...s, company_id: Number(e.target.value) }))}
          >
            {companies.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </Select>
          <TextField label={t('companiesContacts.columns.contact')} value={contactForm.full_name} onChange={(e) => setContactForm((s) => ({ ...s, full_name: e.target.value }))} />
          <TextField label={t('companiesContacts.columns.email')} value={contactForm.email || ''} onChange={(e) => setContactForm((s) => ({ ...s, email: e.target.value }))} />
          <TextField label={t('companiesContacts.columns.phone')} value={contactForm.phone || ''} onChange={(e) => setContactForm((s) => ({ ...s, phone: e.target.value }))} />
          <TextField label={t('companiesContacts.columns.position')} value={contactForm.position || ''} onChange={(e) => setContactForm((s) => ({ ...s, position: e.target.value }))} />
          <TextField label={t('companiesContacts.columns.notes')} value={contactForm.notes || ''} onChange={(e) => setContactForm((s) => ({ ...s, notes: e.target.value }))} multiline rows={3} />
          <FormControlLabel
            control={<Checkbox checked={contactForm.is_primary} onChange={(e) => setContactForm((s) => ({ ...s, is_primary: e.target.checked }))} />}
            label={t('companiesContacts.columns.primary')}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setContactDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button onClick={saveContact} variant="contained">{t('common.save')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CompaniesContactsPage;
