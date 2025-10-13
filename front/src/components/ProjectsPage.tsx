import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  useTheme,
  useMediaQuery,
  TablePagination,
} from '@mui/material';
import {
  Add as AddIcon,
} from '@mui/icons-material';
import { observer } from 'mobx-react-lite';
import { projectStore } from '../stores/ProjectStore';
import { projectsApi } from '../api/client';
import ProjectDialog from './project/ProjectDialog';
import ConfirmDialog from './ConfirmDialog';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { userStore } from '../stores/UserStore';
import { usePermissions } from '../hooks/usePermissions';
import { useDeleteDialog } from '../hooks/useDeleteDialog';
import { useTranslation } from 'react-i18next';
import NotificationSnackbar from './NotificationSnackbar';
import { useProjectFilters, useProjectPagination, useProjectActions, useProjectDialogs } from './project/hooks';
import { ProjectFilters, ProjectCards, ProjectTable } from './project/components';

const ProjectsPage: React.FC = observer(() => {
  const { canEditProject, canDeleteProject, isAdmin, isOperator, isViewer } = useCurrentUser();
  const permissions = usePermissions();
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const deleteDialog = useDeleteDialog();
  
  const {
    filterStatus,
    searchTerm,
    setFilterStatus,
    setSearchTerm,
    filteredProjects,
  } = useProjectFilters();

  const {
    page,
    rowsPerPage,
    handleChangePage,
    handleChangeRowsPerPage,
    paginatedProjects,
    totalCount,
    rowsPerPageOptions,
  } = useProjectPagination({
    filteredProjects,
    dependencies: [filterStatus, searchTerm]
  });

  const {
    successNotification,
    setSuccessNotification,
    handleCreateSuccess,
    handleDeleteProject,
    handleProjectSaved,
    handleCloseNotification,
  } = useProjectActions({ t });

  const {
    projectDialogOpen,
    projectDialogMode,
    editProjectId,
    handleCreate,
    handleEdit,
    handleProjectDialogClose,
  } = useProjectDialogs();

  // Загружаем проекты при монтировании компонента
  useEffect(() => {
    projectStore.loadProjects();
  }, []);

  const handleDelete = (projectId: number) => {
    deleteDialog.openDeleteDialog(projectId);
  };


  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  };

  return (
    <Box sx={{ 
      width: '100%', 
      minWidth: 0, 
      pt: 3, // padding только сверху
      px: 3, // padding только по бокам
      pb: 0, // убираем padding снизу
      height: !isMobile ? 'calc(100vh - 117px)' : '100vh', // Всегда вычитаем высоту пагинации для десктопа
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden', // Убираем прокрутку страницы
    }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'flex-start' : 'center', 
        mb: 3,
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 2 : 0
      }}>
        <Typography variant={isMobile ? "h5" : "h4"} component="h1">
          {t('menu.projects')}
        </Typography>
        {permissions.canCreateProjects && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreate}
            sx={{ backgroundColor: '#1976d2', width: isMobile ? '100%' : 'auto' }}
          >
            {t('project.create')}
          </Button>
        )}
      </Box>

      <ProjectFilters
        searchTerm={searchTerm}
        filterStatus={filterStatus}
        onSearchChange={setSearchTerm}
        onStatusChange={setFilterStatus}
      />

      <Box sx={{ flex: 1, minHeight: 0 }}>
        {isMobile ? (
          <ProjectCards
            projects={paginatedProjects}
            totalCount={totalCount}
            isLoading={projectStore.isLoading}
            error={projectStore.error}
            isViewer={isViewer}
            canEditProject={canEditProject}
            canDeleteProject={canDeleteProject}
            onEdit={handleEdit}
            onDelete={handleDelete}
            formatDate={formatDate}
          />
        ) : (
          <ProjectTable
            projects={paginatedProjects}
            totalCount={totalCount}
            isLoading={projectStore.isLoading}
            error={projectStore.error}
            isViewer={isViewer}
            canEditProject={canEditProject}
            canDeleteProject={canDeleteProject}
            onEdit={handleEdit}
            onDelete={handleDelete}
            formatDate={formatDate}
          />
        )}
      </Box>

      {/* Фиксированная пагинация внизу экрана */}
      {!isMobile && !projectStore.isLoading && (
        <Box sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          borderTop: '1px solid #e0e0e0',
          boxShadow: '0 -2px 8px rgba(0,0,0,0.1)',
          zIndex: 1000,
          paddingLeft: '240px', // Отступ для бокового меню
          '@media (max-width: 900px)': {
            paddingLeft: 0, // На мобильных устройствах без отступа
          },
          backgroundColor: 'white',
        }}>
          <TablePagination
            rowsPerPageOptions={rowsPerPageOptions}
            component="div"
            count={totalCount}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage={t('common.rows_per_page')}
            labelDisplayedRows={({ from, to, count }) => 
              `${from}-${to} ${t('common.of')} ${count !== -1 ? count : `${t('common.more_than')} ${to}`}`
            }
            sx={{
              '& .MuiTablePagination-toolbar': {
                paddingLeft: 2,
                paddingRight: 2,
                flexWrap: 'wrap',
                justifyContent: 'flex-end', // Выравниваем пагинацию справа
              },
              '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                fontSize: '0.875rem',
              },
            }}
          />
        </Box>
      )}



      {/* Унифицированный диалог проекта */}
      <ProjectDialog
        open={projectDialogOpen}
        mode={projectDialogMode}
        projectId={editProjectId || undefined}
        onClose={handleProjectDialogClose}
        onSuccess={handleCreateSuccess}
        onSaved={handleProjectSaved}
      />

      {/* Диалог подтверждения удаления */}
      <ConfirmDialog
        open={deleteDialog.isOpen}
        title={t('projects.delete_confirm_title')}
        content={t('projects.delete_confirm_content')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={() => deleteDialog.confirmDelete(handleDeleteProject)}
        onClose={deleteDialog.closeDeleteDialog}
        loading={deleteDialog.isLoading}
      />

      {/* Уведомление об успешном создании проекта */}
      <NotificationSnackbar
        open={successNotification.open}
        message={successNotification.message}
        severity="success"
        onClose={handleCloseNotification}
      />
    </Box>
  );
});

export default ProjectsPage;