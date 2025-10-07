import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  CircularProgress,
  Alert,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { observer } from 'mobx-react-lite';
import { projectStore } from '../stores/ProjectStore';
import type { Project } from '../stores/ProjectStore';
import { useTranslation } from 'react-i18next';

interface ProjectSelectorProps {
  onProjectSelect: (project: Project) => void;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = observer(({ onProjectSelect }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleProjectClick = (project: Project) => {
    projectStore.selectProject(project);
    onProjectSelect(project);
    setOpen(false);
  };

  const handleOpenDialog = () => {
    setOpen(true);
  };

  const handleCloseDialog = () => {
    setOpen(false);
  };

  return (
    <>
      {/* Кнопка выбора проекта */}
      <Button
        variant="outlined"
        onClick={() => {
          handleOpenDialog();
        }}
        sx={{
          minWidth: isMobile ? 150 : 200,
          justifyContent: 'flex-start',
          textTransform: 'none',
          backgroundColor: '#ffffff',
          borderColor: '#1976d2',
          color: '#1976d2',
          fontWeight: 'bold',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          fontSize: isMobile ? '0.75rem' : '0.875rem',
          '&:hover': {
            borderColor: '#1565c0',
            backgroundColor: '#f5f5f5',
            boxShadow: '0 4px 8px rgba(0,0,0,0.15)'
          }
        }}
      >
        {projectStore.selectedProject ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              {projectStore.selectedProject.name}
            </Typography>
            <Chip
              label={projectStore.getProjectStatusLabel(projectStore.selectedProject.status)}
              color={projectStore.getProjectStatusColor(projectStore.selectedProject.status) as any}
              size="small"
            />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              {t('projects.select_project')}
            </Typography>
          </Box>
        )}
      </Button>

      {/* Диалог выбора проекта */}
      <Dialog
        open={open}
        onClose={handleCloseDialog}
        maxWidth={isMobile ? "sm" : "md"}
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: { borderRadius: isMobile ? 0 : 2 }
        }}
      >
        <DialogTitle>
          Выбор проекта
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Выберите проект для работы с документами и трансмитталами
          </Typography>
          {projectStore.isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : projectStore.error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {projectStore.error}
            </Alert>
          ) : (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Проектов найдено: {projectStore.projects.length}
              </Typography>
            <List sx={{ pt: 0 }}>
              {projectStore.projects.map((project) => (
                <ListItem key={project.id} disablePadding>
                  <ListItemButton
                    onClick={() => handleProjectClick(project)}
                    sx={{
                      borderRadius: 1,
                      mb: 1,
                      border: '1px solid #e0e0e0',
                      '&:hover': {
                        backgroundColor: 'rgba(25, 118, 210, 0.04)',
                        borderColor: '#1976d2'
                      }
                    }}
                  >
                    <Box sx={{ flex: 1, py: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                          {project.name}
                        </Typography>
                        <Chip
                          label={projectStore.getProjectStatusLabel(project.status)}
                          color={projectStore.getProjectStatusColor(project.status) as any}
                          size="small"
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        {project.description}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Период: {new Date(project.start_date).toLocaleDateString('ru-RU')} - {new Date(project.end_date).toLocaleDateString('ru-RU')}
                      </Typography>
                    </Box>
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={handleCloseDialog} variant="outlined">
            Отмена
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
});

export default ProjectSelector;
