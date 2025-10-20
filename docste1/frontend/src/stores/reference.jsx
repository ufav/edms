import { makeAutoObservable, action, runInAction, reaction } from 'mobx';
import {
  getDisciplines,
  getProjectDisciplines,
  getDocumentTypes,
  getProjectDisciplineDocumentTypes,
  getProjectDocumentTypes,
  getRevisionStatuses,
  getRevisionSteps,
  getProjectRevisionSteps,
  getRevisionDescriptions,
  getProjectRevisionDescriptions,
  getProjectRevisionDescriptionRevisionSteps,
  getLanguages,
  getOriginators,
  getCompanies,
  getReviewCodes,
} from '../Datasources';
import { authStore } from './auth';

class ReferenceStore {
  disciplines = [];
  documentTypes = [];
  revisionStatuses = [];
  revisionSteps = [];
  revisionDescriptions = [];
  languages = [];
  originators = [];
  companies = [];
  reviewCodes = [];
  isLoading = false;

  constructor() {
    makeAutoObservable(this);
    this.loadReferences();
    reaction(
      () => authStore.selectedProjectId,
      () => {
        this.loadReferences();
      }
    );
  }

  loadReferences = action(async () => {
    if (this.isLoading) return;

    this.isLoading = true;

    try {
      const [
        disciplinesData,
        documentTypesData,
        revisionStatusesData,
        revisionStepsData,
        revisionDescriptionsData,
        languagesData,
        originatorsData,
        companiesData,
        reviewCodesData,
      ] = await Promise.all([
        authStore.selectedProjectId
          ? getProjectDisciplines(authStore.selectedProjectId)
          : getDisciplines(),
        authStore.selectedProjectId
          ? getProjectDocumentTypes(authStore.selectedProjectId)
          : getDocumentTypes(),
        getRevisionStatuses(),
        authStore.selectedProjectId
          ? getProjectRevisionSteps(authStore.selectedProjectId)
          : getRevisionSteps(),
        authStore.selectedProjectId
          ? getProjectRevisionDescriptions(authStore.selectedProjectId)
          : getRevisionDescriptions(),
        getLanguages(),
        getOriginators(),
        getCompanies(),
        getReviewCodes(),
      ]);

      runInAction(() => {
        this.disciplines = disciplinesData || [];
        this.documentTypes = documentTypesData || [];
        this.revisionStatuses = revisionStatusesData || [];
        this.revisionSteps = revisionStepsData || [];
        this.revisionDescriptions = revisionDescriptionsData || [];
        this.languages = languagesData || [];
        this.originators = originatorsData || [];
        this.companies = companiesData || [];
        this.reviewCodes = reviewCodesData || [];
      });
    } catch (error) {
      throw error;
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  });

  loadProjectDisciplineDocumentTypes = action(async (projectId, disciplineId) => {
    if (!projectId || !disciplineId) {
      const documentTypesData = await getProjectDocumentTypes(projectId);
      runInAction(() => {
        this.documentTypes = documentTypesData || [];
      });
      return;
    }

    try {
      const documentTypesData = await getProjectDisciplineDocumentTypes(projectId, disciplineId);
      runInAction(() => {
        this.documentTypes = documentTypesData || [];
      });
    } catch (error) {
      console.error('Error loading project discipline document types:', error);
      runInAction(() => {
        this.documentTypes = [];
      });
    }
  });

  loadProjectRevisionDescriptionRevisionSteps = action(async (projectId, descriptionId) => {
    if (!projectId || !descriptionId) {
      const revisionStepsData = await getProjectRevisionSteps(projectId);
      runInAction(() => {
        this.revisionSteps = revisionStepsData || [];
      });
      return;
    }

    try {
      const revisionStepsData = await getProjectRevisionDescriptionRevisionSteps(projectId, descriptionId);
      runInAction(() => {
        this.revisionSteps = revisionStepsData || [];
      });
    } catch (error) {
      console.error('Error loading project revision description revision steps:', error);
      runInAction(() => {
        this.revisionSteps = [];
      });
    }
  });
}

export const referenceStore = new ReferenceStore();