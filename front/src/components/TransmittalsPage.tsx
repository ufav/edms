import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Add as AddIcon,
  Send as SendIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { observer } from 'mobx-react-lite';
import { projectStore } from '../stores/ProjectStore';
import { transmittalStore } from '../stores/TransmittalStore';
import ProjectRequired from './ProjectRequired';

const TransmittalsPage: React.FC = observer(() => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Загружаем трансмитталы при монтировании компонента
  useEffect(() => {
    if (projectStore.hasSelectedProject) {
      transmittalStore.loadTransmittals(projectStore.selectedProject!.id);
    }
  }, [projectStore.selectedProject]);

  // Фильтрация трансмитталов
  const filteredTransmittals = transmittalStore.transmittals.filter(t => {
    const statusMatch = filterStatus === 'all' || t.status === filterStatus;
    const projectMatch = filterProject === 'all' || t.project_id.toString() === filterProject;
    const selectedProjectMatch = !projectStore.hasSelectedProject || t.project_id === projectStore.selectedProject?.id;
    const searchMatch = searchTerm === '' || 
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.transmittal_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    return statusMatch && projectMatch && selectedProjectMatch && searchMatch;
  });

  const handleCreate = () => {
    // TODO: Реализовать создание трансмиттала
    console.log('Create transmittal');
  };

  const handleView = (transmittalId: number) => {
    // TODO: Реализовать просмотр трансмиттала
    console.log('View transmittal:', transmittalId);
  };

  const handleSend = (transmittalId: number) => {
    // TODO: Реализовать отправку трансмиттала
    console.log('Send transmittal:', transmittalId);
  };

  const handleReceive = (transmittalId: number) => {
    // TODO: Реализовать подтверждение получения
    console.log('Receive transmittal:', transmittalId);
  };

  const handleDelete = (transmittalId: number) => {
    // TODO: Реализовать удаление трансмиттала
    console.log('Delete transmittal:', transmittalId);
  };

  return (
    <ProjectRequired>
      <Box sx={{ width: '100%', p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Трансмитталы {projectStore.selectedProject && `- ${projectStore.selectedProject.name}`}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreate}
            sx={{ backgroundColor: '#1976d2' }}
          >
            Создать трансмиттал
          </Button>
        </Box>

        {/* Фильтры и поиск */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              placeholder="Поиск трансмитталов..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 300 }}
            />
            
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Статус</InputLabel>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                label="Статус"
              >
                <MenuItem value="all">Все</MenuItem>
                <MenuItem value="draft">Черновик</MenuItem>
                <MenuItem value="sent">Отправлен</MenuItem>
                <MenuItem value="received">Получен</MenuItem>
                <MenuItem value="acknowledged">Подтвержден</MenuItem>
                <MenuItem value="rejected">Отклонен</MenuItem>
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Проект</InputLabel>
              <Select
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                label="Проект"
              >
                <MenuItem value="all">Все</MenuItem>
                {projectStore.projects.map((project) => (
                  <MenuItem key={project.id} value={project.id.toString()}>
                    {project.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Paper>

        {/* Таблица трансмитталов */}
        <TableContainer component={Paper} sx={{ boxShadow: 2, border: '1px solid #e0e0e0' }}>
          {transmittalStore.isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : transmittalStore.error ? (
            <Alert severity="error" sx={{ m: 2 }}>
              {transmittalStore.error}
            </Alert>
          ) : (
            <Table sx={{ tableLayout: 'fixed', width: '100%', minWidth: '100%' }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell sx={{ width: '9%', fontWeight: 'bold' }}>Номер</TableCell>
                  <TableCell sx={{ width: '14%', fontWeight: 'bold' }}>Название</TableCell>
                  <TableCell sx={{ width: '12%', fontWeight: 'bold' }}>Отправитель</TableCell>
                  <TableCell sx={{ width: '12%', fontWeight: 'bold' }}>Получатель</TableCell>
                  <TableCell sx={{ width: '10%', fontWeight: 'bold' }}>Статус</TableCell>
                  <TableCell sx={{ width: '10%', fontWeight: 'bold' }}>Отправка</TableCell>
                  <TableCell sx={{ width: '10%', fontWeight: 'bold' }}>Получение</TableCell>
                  <TableCell sx={{ width: '21%', fontWeight: 'bold' }}>Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTransmittals.map((transmittal, index) => (
                  <TableRow key={transmittal.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {transmittal.transmittal_number}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {transmittal.title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        User {transmittal.sender_id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        User {transmittal.recipient_id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={transmittalStore.getTransmittalStatusLabel(transmittal.status)}
                        color={transmittalStore.getTransmittalStatusColor(transmittal.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {transmittalStore.formatDate(transmittal.sent_date)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {transmittalStore.formatDate(transmittal.received_date)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Просмотр">
                          <IconButton size="small" onClick={() => handleView(transmittal.id)}>
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        {transmittal.status === 'draft' && (
                          <Tooltip title="Отправить">
                            <IconButton size="small" onClick={() => handleSend(transmittal.id)} color="primary">
                              <SendIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        {transmittal.status === 'sent' && (
                          <Tooltip title="Подтвердить получение">
                            <IconButton size="small" onClick={() => handleReceive(transmittal.id)} color="success">
                              <CheckCircleIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Удалить">
                          <IconButton size="small" onClick={() => handleDelete(transmittal.id)} color="error">
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TableContainer>

        {!transmittalStore.isLoading && filteredTransmittals.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary">
              Трансмитталы не найдены
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Попробуйте изменить фильтры или создать новые трансмитталы
            </Typography>
          </Box>
        )}
      </Box>
    </ProjectRequired>
  );
});

export default TransmittalsPage;