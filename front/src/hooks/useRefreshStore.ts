import { useCallback } from 'react';
import { projectStore } from '../stores/ProjectStore';
import { documentStore } from '../stores/DocumentStore';
import { transmittalStore } from '../stores/TransmittalStore';
import { userStore } from '../stores/UserStore';

export const useRefreshStore = () => {
  const refreshDocuments = useCallback(async () => {
    if (projectStore.selectedProject) {
      await documentStore.refreshDocuments(projectStore.selectedProject.id);
    }
  }, []);

  const refreshProjects = useCallback(async () => {
    await projectStore.loadProjects();
  }, []);

  const refreshTransmittals = useCallback(async () => {
    if (projectStore.selectedProject) {
      await transmittalStore.loadTransmittals(projectStore.selectedProject.id, true);
    }
  }, []);

  const refreshUsers = useCallback(async () => {
    await userStore.loadUsers();
  }, []);

  return {
    refreshDocuments,
    refreshProjects,
    refreshTransmittals,
    refreshUsers,
  };
};
