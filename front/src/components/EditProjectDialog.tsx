import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Grid, FormControl, InputLabel, Select, MenuItem, Alert, Tabs, Tab, Box, Chip, Checkbox, FormControlLabel } from '@mui/material';
import { disciplinesApi, projectsApi } from '../api/client';
import type { Discipline, DocumentType } from '../api/client';

interface EditProjectDialogProps {
  open: boolean;
  projectId: number;
  onClose: () => void;
  onSaved: () => void;
}

const EditProjectDialog: React.FC<EditProjectDialogProps> = ({ open, projectId, onClose, onSaved }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabIndex, setTabIndex] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'planning',
    client: '',
  });
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [selectedDisciplines, setSelectedDisciplines] = useState<number[]>([]);
  const [disciplineDocumentTypes, setDisciplineDocumentTypes] = useState<{ [key: number]: number[] }>({});

  useEffect(() => {
    if (open && projectId) {
      loadAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectId]);

  const loadAll = async () => {
    try {
      setLoading(true);
      setError(null);
      const [project, allDisciplines, allTypes] = await Promise.all([
        projectsApi.getById(projectId),
        disciplinesApi.getAll(),
        disciplinesApi.getDocumentTypes(),
      ]);
      setFormData({
        name: project.name || '',
        description: project.description || '',
        status: project.status || 'planning',
        client: project.client || '',
      });
      setDisciplines(allDisciplines);
      setDocumentTypes(allTypes);
      // Загружаем текущие связи проекта
      const projDisc = await projectsApi.getDisciplines(projectId);
      const discIds = projDisc.map(d => d.id);
      setSelectedDisciplines(discIds);
      const map: { [key: number]: number[] } = {};
      for (const d of discIds) {
        const types = await projectsApi.getDocumentTypes(projectId, d);
        map[d] = types.map(t => t.id);
      }
      setDisciplineDocumentTypes(map);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Не удалось загрузить данные проекта');
    } finally {
      setLoading(false);
    }
  };

  const handleInput = (field: string, value: any) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleDisciplineToggle = (disciplineId: number) => {
    setSelectedDisciplines(prev => {
      const newSelected = prev.includes(disciplineId) ? prev.filter(id => id !== disciplineId) : [...prev, disciplineId];
      if (!newSelected.includes(disciplineId)) {
        setDisciplineDocumentTypes(prevTypes => {
          const copy = { ...prevTypes };
          delete copy[disciplineId];
          return copy;
        });
      }
      return newSelected;
    });
  };

  const handleDocumentTypeToggle = (disciplineId: number, docTypeId: number) => {
    setDisciplineDocumentTypes(prev => {
      const list = prev[disciplineId] || [];
      const next = list.includes(docTypeId) ? list.filter(id => id !== docTypeId) : [...list, docTypeId];
      return { ...prev, [disciplineId]: next };
    });
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      await projectsApi.update(projectId, {
        ...formData,
        selected_disciplines: selectedDisciplines,
        discipline_document_types: disciplineDocumentTypes,
      });
      onSaved();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Не удалось сохранить проект');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Редактирование проекта</DialogTitle>
      <DialogContent sx={{ minHeight: 520 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} sx={{ mb: 2 }}>
          <Tab label="Основное" />
          <Tab label="Дисциплины и типы" />
        </Tabs>

        {tabIndex === 0 && (
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <TextField fullWidth label="Название" value={formData.name} onChange={(e) => handleInput('name', e.target.value)} disabled={loading} />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Статус</InputLabel>
                <Select value={formData.status} label="Статус" onChange={(e) => handleInput('status', e.target.value)} disabled={loading}>
                  <MenuItem value="planning">Планирование</MenuItem>
                  <MenuItem value="active">Активный</MenuItem>
                  <MenuItem value="on_hold">Приостановлен</MenuItem>
                  <MenuItem value="completed">Завершен</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={3} label="Описание" value={formData.description} onChange={(e) => handleInput('description', e.target.value)} disabled={loading} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Клиент" value={formData.client} onChange={(e) => handleInput('client', e.target.value)} disabled={loading} />
            </Grid>
          </Grid>
        )}

        {tabIndex === 1 && (
          <Box>
            {loading ? (
              <Box>Загрузка...</Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {disciplines.map((d) => (
                  <Box key={d.id} sx={{ border: '1px solid #eee', borderRadius: 1, p: 1.5 }}>
                    <FormControlLabel
                      control={<Checkbox checked={selectedDisciplines.includes(d.id)} onChange={() => handleDisciplineToggle(d.id)} />}
                      label={`${d.code} - ${d.name}`}
                    />
                    {selectedDisciplines.includes(d.id) && (
                      <Box sx={{ ml: 4, mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {documentTypes.map((dt) => (
                          <Chip
                            key={dt.id}
                            label={`${dt.code} - ${dt.name}`}
                            variant={(disciplineDocumentTypes[d.id] || []).includes(dt.id) ? 'filled' : 'outlined'}
                            color={(disciplineDocumentTypes[d.id] || []).includes(dt.id) ? 'primary' : 'default'}
                            onClick={() => handleDocumentTypeToggle(d.id, dt.id)}
                          />
                        ))}
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Отмена</Button>
        <Button onClick={handleSave} variant="contained" disabled={loading || !formData.name}>Сохранить</Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditProjectDialog;
