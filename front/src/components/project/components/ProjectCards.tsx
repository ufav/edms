import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

interface ProjectCardsProps {
  projects: any[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  isViewer: boolean;
  canEditProject: (project: any) => boolean;
  canDeleteProject: (project: any) => boolean;
  onEdit: (projectId: number) => void;
  onDelete: (projectId: number) => void;
  formatDate: (dateString: string) => string;
}

export const ProjectCards: React.FC<ProjectCardsProps> = ({
  projects,
  totalCount,
  isLoading,
  error,
  isViewer,
  canEditProject,
  canDeleteProject,
  onEdit,
  onDelete,
  formatDate,
}) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (totalCount === 0) {
    return (
      <Box sx={{ width: '100%', minWidth: '100%', minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Alert severity="info" sx={{ m: 2, width: '100%' }}>
          {t('projects.no_projects')}
        </Alert>
      </Box>
    );
  }


  return (
    <Box>
      <Grid container spacing={2} sx={{ p: 2 }}>
        {projects.map((project) => (
          <Grid item xs={12} key={project.id}>
            <Card sx={{ boxShadow: 2, border: '1px solid #e0e0e0' }}>
              <CardContent>
                <Typography variant="h6" component="h3" sx={{ mb: 1, fontWeight: 'bold' }}>
                  {project.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {project.description}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  <Chip 
                    label={project.project_code || '-'} 
                    size="small" 
                    variant="outlined" 
                  />
                  <Chip 
                    label={t(`status.${project.status}`)} 
                    size="small" 
                    color={project.status === 'active' ? 'success' : 
                           project.status === 'completed' ? 'primary' : 
                           project.status === 'cancelled' ? 'error' : 'default'} 
                  />
                  <Chip 
                    label={formatDate(project.start_date)} 
                    size="small" 
                    variant="outlined" 
                  />
                  <Chip 
                    label={project.owner_name || '-'} 
                    size="small" 
                    variant="outlined" 
                  />
                </Box>
              </CardContent>
              {!isViewer && (
                <CardActions sx={{ justifyContent: 'flex-end', gap: 1 }}>
                  {canEditProject(project) && (
                    <Tooltip title={t('common.edit')}>
                      <IconButton size="small" onClick={() => onEdit(project.id)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  {canDeleteProject(project) && (
                    <Tooltip title={t('common.delete')}>
                      <IconButton size="small" onClick={() => onDelete(project.id)} sx={{ color: 'grey.600' }}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </CardActions>
              )}
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
