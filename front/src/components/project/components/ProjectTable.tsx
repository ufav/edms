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
  TablePagination,
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
  
  // Пагинация
  page: number;
  rowsPerPage: number;
  rowsPerPageOptions: number[];
  onPageChange: (event: unknown, newPage: number) => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
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
  page,
  rowsPerPage,
  rowsPerPageOptions,
  onPageChange,
  onRowsPerPageChange,
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
      <TableContainer component={Paper} sx={{ 
        boxShadow: 2, 
        width: '100%', 
        minWidth: '100%', 
        minHeight: '400px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center'
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
    );
  }

  return (
    <>
      <TableContainer component={Paper} sx={{ boxShadow: 2, border: '1px solid #e0e0e0', width: '100%' }}>
        <Table sx={{ tableLayout: 'fixed', width: '100%' }}>
        <TableHead>
          <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
            <TableCell sx={{ 
              fontWeight: 'bold',
              width: '20%',
              maxWidth: '300px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>{t('projects.columns.name')}</TableCell>
            <TableCell sx={{ 
              fontWeight: 'bold',
              width: '25%',
              maxWidth: '300px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>{t('projects.columns.description')}</TableCell>
            <TableCell sx={{ 
              fontWeight: 'bold',
              width: '12%',
              maxWidth: '300px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>{t('projects.columns.code')}</TableCell>
            <TableCell sx={{ 
              fontWeight: 'bold',
              width: '10%',
              maxWidth: '300px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>{t('projects.columns.status')}</TableCell>
            <TableCell sx={{ 
              fontWeight: 'bold',
              width: '10%',
              maxWidth: '300px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>{t('projects.columns.start_date')}</TableCell>
            <TableCell sx={{ 
              fontWeight: 'bold',
              width: '10%',
              maxWidth: '300px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>{t('projects.columns.end_date')}</TableCell>
            <TableCell sx={{ 
              fontWeight: 'bold',
              width: '11%',
              maxWidth: '300px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>{t('projects.columns.owner')}</TableCell>
            {!isViewer && (
              <TableCell sx={{ 
                fontWeight: 'bold',
                width: '12%',
                maxWidth: '300px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>{t('common.actions')}</TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {projects.map((project) => (
            <TableRow key={project.id} hover>
              <TableCell sx={{ 
                maxWidth: '300px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                <Tooltip title={project.name} placement="top">
                  <Typography variant="body2" sx={{ 
                    fontWeight: 'bold',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'block'
                  }}>
                    {project.name}
                  </Typography>
                </Tooltip>
              </TableCell>
              <TableCell sx={{ 
                maxWidth: '300px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                <Tooltip title={project.description || '-'} placement="top">
                  <Typography variant="body2" sx={{ 
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'block'
                  }}>
                    {project.description}
                  </Typography>
                </Tooltip>
              </TableCell>
              <TableCell sx={{ 
                maxWidth: '300px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                <Tooltip title={project.project_code || '-'} placement="top">
                  <Typography variant="body2" sx={{ 
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'block'
                  }}>
                    {project.project_code || '-'}
                  </Typography>
                </Tooltip>
              </TableCell>
              <TableCell sx={{ 
                maxWidth: '300px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                <Chip
                  label={project.status}
                  color={project.status === 'active' ? 'success' : 'default'}
                  size="small"
                />
              </TableCell>
              <TableCell sx={{ 
                maxWidth: '300px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                <Typography variant="body2" sx={{ 
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'block'
                }}>
                  {project.start_date ? formatDate(project.start_date) : '-'}
                </Typography>
              </TableCell>
              <TableCell sx={{ 
                maxWidth: '300px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                <Typography variant="body2" sx={{ 
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'block'
                }}>
                  {project.end_date ? formatDate(project.end_date) : '-'}
                </Typography>
              </TableCell>
              <TableCell sx={{ 
                maxWidth: '300px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                <Tooltip title={project.owner_name || '-'} placement="top">
                  <Typography variant="body2" sx={{ 
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'block'
                  }}>
                    {project.owner_name || '-'}
                  </Typography>
                </Tooltip>
              </TableCell>
              {!isViewer && (
                <TableCell sx={{ 
                  maxWidth: '300px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
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
                  </Box>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
    
    {!isLoading && totalCount > 0 && (
      <TablePagination
        rowsPerPageOptions={rowsPerPageOptions}
        component="div"
        count={totalCount}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
        labelRowsPerPage={t('common.rows_per_page')}
        labelDisplayedRows={({ from, to, count }) => 
          `${from}-${to} ${t('common.of')} ${count !== -1 ? count : `${t('common.more_than')} ${to}`}`
        }
        sx={{
          '& .MuiTablePagination-toolbar': {
            paddingLeft: 0,
            paddingRight: 0,
            flexWrap: 'wrap',
          },
          '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
            fontSize: '0.875rem',
          },
        }}
      />
    )}
  </>
  );
};
