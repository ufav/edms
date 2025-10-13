import React from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import ProjectTableSkeleton from './ProjectTableSkeleton';

interface ProjectTableProps {
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

export const ProjectTable: React.FC<ProjectTableProps> = ({
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
    return <ProjectTableSkeleton />;
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
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        minHeight: 0,
        marginBottom: 0,
        paddingBottom: 0
      }}>
        <TableContainer component={Paper} sx={{ 
          boxShadow: 2, 
          width: '100%', 
          minWidth: '100%', 
          flex: 1,
          minHeight: 0,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          borderRadius: 0,
        }}>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary">
              {t('projects.no_projects')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('projects.no_projects_hint')}
            </Typography>
          </Box>
        </TableContainer>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      minHeight: 0,
      marginBottom: 0,
      paddingBottom: 0
    }}>
      {/* Заголовок таблицы - зафиксирован */}
      <Box sx={{ 
        borderBottom: '1px solid #f0f0f0',
        backgroundColor: '#f5f5f5',
        boxShadow: 2,
      }}>
        <Table sx={{ tableLayout: 'fixed', width: '100%', minWidth: '100%' }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5', '& .MuiTableCell-root': { padding: '8px 16px' } }}>
              <TableCell sx={{ 
                fontWeight: 'bold',
                fontSize: '0.875rem',
                whiteSpace: 'nowrap',
                width: '20%',
                minWidth: '200px'
              }}>{t('projects.columns.name')}</TableCell>
              <TableCell sx={{ 
                fontWeight: 'bold',
                fontSize: '0.875rem',
                whiteSpace: 'nowrap',
                width: '25%',
                minWidth: '250px'
              }}>{t('projects.columns.description')}</TableCell>
              <TableCell sx={{ 
                fontWeight: 'bold',
                fontSize: '0.875rem',
                whiteSpace: 'nowrap',
                width: '12%',
                minWidth: '120px'
              }}>{t('projects.columns.code')}</TableCell>
              <TableCell sx={{ 
                fontWeight: 'bold',
                fontSize: '0.875rem',
                whiteSpace: 'nowrap',
                width: '10%',
                minWidth: '100px'
              }}>{t('projects.columns.status')}</TableCell>
              <TableCell sx={{ 
                fontWeight: 'bold',
                fontSize: '0.875rem',
                whiteSpace: 'nowrap',
                width: '10%',
                minWidth: '100px'
              }}>{t('projects.columns.start_date')}</TableCell>
              <TableCell sx={{ 
                fontWeight: 'bold',
                fontSize: '0.875rem',
                whiteSpace: 'nowrap',
                width: '10%',
                minWidth: '100px'
              }}>{t('projects.columns.end_date')}</TableCell>
              <TableCell sx={{ 
                fontWeight: 'bold',
                fontSize: '0.875rem',
                whiteSpace: 'nowrap',
                width: '11%',
                minWidth: '110px'
              }}>{t('projects.columns.owner')}</TableCell>
              {!isViewer && (
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  fontSize: '0.875rem',
                  whiteSpace: 'nowrap',
                  width: '12%',
                  minWidth: '120px'
                }}>{t('common.actions')}</TableCell>
              )}
            </TableRow>
          </TableHead>
        </Table>
      </Box>
      
      {/* Тело таблицы - скроллируемое */}
      <TableContainer component={Paper} sx={{ 
        flex: 1,
        minHeight: 0,
        maxHeight: 'calc(48px + 13 * 48px)', // Ограничиваем высоту 13 строками (заголовок + 13 строк)
        overflow: 'auto',
        borderRadius: 0,
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: '#f1f1f1',
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#c1c1c1',
          borderRadius: '4px',
          '&:hover': {
            background: '#a8a8a8',
          },
        },
      }}>
        <Table sx={{ tableLayout: 'fixed', width: '100%', minWidth: '100%' }}>
          <TableBody>
            {projects.map((project) => (
              <TableRow 
                key={project.id} 
                sx={{ 
                  '& .MuiTableCell-root': { padding: '8px 16px' },
                  '&:hover': {
                    backgroundColor: '#f5f5f5',
                  },
                }}
              >
                <TableCell sx={{ 
                  fontSize: '0.875rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  width: '20%',
                  minWidth: '200px'
                }}>
                  <Tooltip title={project.name} arrow>
                    <Typography variant="body2" sx={{ 
                      fontWeight: 'bold',
                      fontSize: '0.875rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {project.name}
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ 
                  fontSize: '0.875rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  width: '25%',
                  minWidth: '250px'
                }}>
                  <Tooltip title={project.description || '-'} arrow>
                    <Typography variant="body2" sx={{ 
                      fontSize: '0.875rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {project.description || '-'}
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ 
                  fontSize: '0.875rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  width: '12%',
                  minWidth: '120px'
                }}>
                  <Tooltip title={project.project_code || '-'} arrow>
                    <Typography variant="body2" sx={{ 
                      fontSize: '0.875rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {project.project_code || '-'}
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ 
                  fontSize: '0.875rem',
                  width: '10%',
                  minWidth: '100px'
                }}>
                  <Chip
                    label={project.status}
                    color={project.status === 'active' ? 'success' : 'default'}
                    size="small"
                    sx={{ fontSize: '0.75rem', height: '24px' }}
                  />
                </TableCell>
                <TableCell sx={{ 
                  fontSize: '0.875rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  width: '10%',
                  minWidth: '100px'
                }}>
                  <Typography variant="body2" sx={{ 
                    fontSize: '0.875rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {project.start_date ? formatDate(project.start_date) : '-'}
                  </Typography>
                </TableCell>
                <TableCell sx={{ 
                  fontSize: '0.875rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  width: '10%',
                  minWidth: '100px'
                }}>
                  <Typography variant="body2" sx={{ 
                    fontSize: '0.875rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {project.end_date ? formatDate(project.end_date) : '-'}
                  </Typography>
                </TableCell>
                <TableCell sx={{ 
                  fontSize: '0.875rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  width: '11%',
                  minWidth: '110px'
                }}>
                  <Tooltip title={project.owner_name || '-'} arrow>
                    <Typography variant="body2" sx={{ 
                      fontSize: '0.875rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {project.owner_name || '-'}
                    </Typography>
                  </Tooltip>
                </TableCell>
                {!isViewer && (
                  <TableCell sx={{ 
                    fontSize: '0.875rem',
                    width: '12%',
                    minWidth: '120px'
                  }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {canEditProject(project) && (
                        <Tooltip title={t('common.edit')}>
                          <IconButton size="small" onClick={() => onEdit(project.id)} sx={{ padding: '4px' }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {canDeleteProject(project) && (
                        <Tooltip title={t('common.delete')}>
                          <IconButton size="small" onClick={() => onDelete(project.id)} sx={{ padding: '4px' }}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
