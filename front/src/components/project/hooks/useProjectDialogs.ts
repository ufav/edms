import { useState } from 'react';

export interface UseProjectDialogsReturn {
  projectDialogOpen: boolean;
  projectDialogMode: 'create' | 'edit' | 'view';
  editProjectId: number | null;
  setProjectDialogOpen: (open: boolean) => void;
  setProjectDialogMode: (mode: 'create' | 'edit' | 'view') => void;
  setEditProjectId: (id: number | null) => void;
  handleCreate: () => void;
  handleEdit: (projectId: number) => void;
  handleDelete: (projectId: number) => void;
  handleProjectDialogClose: () => void;
}

export const useProjectDialogs = (): UseProjectDialogsReturn => {
  const [projectDialogOpen, setProjectDialogOpen] = useState<boolean>(false);
  const [projectDialogMode, setProjectDialogMode] = useState<'create' | 'edit' | 'view'>('create');
  const [editProjectId, setEditProjectId] = useState<number | null>(null);

  const handleCreate = () => {
    setProjectDialogMode('create');
    setEditProjectId(null);
    setProjectDialogOpen(true);
  };

  const handleEdit = (projectId: number) => {
    setProjectDialogMode('edit');
    setEditProjectId(projectId);
    setProjectDialogOpen(true);
  };

  const handleDelete = (projectId: number) => {
    // Эта функция будет использоваться с useDeleteDialog
    // Здесь оставляем пустой, логика будет в ProjectsPage
  };

  const handleProjectDialogClose = () => {
    setProjectDialogOpen(false);
    setEditProjectId(null);
  };

  return {
    projectDialogOpen,
    projectDialogMode,
    editProjectId,
    setProjectDialogOpen,
    setProjectDialogMode,
    setEditProjectId,
    handleCreate,
    handleEdit,
    handleDelete,
    handleProjectDialogClose,
  };
};
