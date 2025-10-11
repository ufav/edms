import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Alert,
  Tabs,
  Tab,
  Autocomplete,
  Chip
} from '@mui/material';
import { disciplinesApi, projectsApi, projectParticipantsApi, rolesApi } from '../../api/client';
import referenceDataStore from '../../stores/ReferenceDataStore';
import { projectDialogStore } from '../../stores/ProjectDialogStore';
import type { Discipline, DocumentType, ProjectParticipant, ProjectParticipantCreate, ProjectMember } from '../../api/client';
import DocumentTypeSelectionDialog from '../DocumentTypeSelectionDialog';
import MainTab from './MainTab';
import DisciplinesTypesTab from './DisciplinesTypesTab';
import { handleExcelImport } from './ExcelImportHandler';
import RevisionsTab from './RevisionsTab';
import WorkflowTab from './WorkflowTab';
import ParticipantsTab from './ParticipantsTab';
import UsersTab from './UsersTab';
import SummaryTab from './SummaryTab';
import { useProjectForm } from './hooks/useProjectForm';
import { useTranslation } from 'react-i18next';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ru } from 'date-fns/locale';

export type ProjectDialogMode = 'create' | 'edit';

interface ProjectDialogProps {
  open: boolean;
  mode: ProjectDialogMode;
  projectId?: number; // Для режима edit
  onClose: () => void;
  onSuccess?: (project: any) => void; // Для режима create
  onSaved?: () => void; // Для режима edit
}

const ProjectDialog: React.FC<ProjectDialogProps> = observer(({
  open,
  mode,
  projectId,
  onClose,
  onSuccess,
  onSaved,
}) => {
  const { t, i18n } = useTranslation();
  const { formData, setFormData: originalSetFormData } = useProjectForm();
  
  // Обертка для setFormData с отслеживанием изменений
  const setFormData = (newData: any) => {
    originalSetFormData(newData);
    if (mode === 'edit' && isInitialized) {
      setHasChanges(true);
    }
  };
  
  // Обертки для отслеживания изменений в других состояниях
  const setSelectedDisciplinesWithTracking = (newData: any) => {
    setSelectedDisciplines(newData);
    if (mode === 'edit' && isInitialized) {
      setHasChanges(true);
    }
  };
  
  const setPendingParticipantsWithTracking = (newData: any) => {
    setPendingParticipants(newData);
    if (mode === 'edit' && isInitialized) {
      setHasChanges(true);
    }
  };
  
  const setPendingProjectMembersWithTracking = (newData: any) => {
    setPendingProjectMembers(newData);
    if (mode === 'edit' && isInitialized) {
      setHasChanges(true);
    }
  };

  const setSelectedWorkflowPresetWithTracking = (newData: any) => {
    setSelectedWorkflowPreset(newData);
    if (mode === 'edit' && isInitialized) {
      setHasChanges(true);
    }
  };

  const setSelectedRevisionDescriptionsWithTracking = (newData: any) => {
    setSelectedRevisionDescriptions(newData);
    if (mode === 'edit' && isInitialized) {
      setHasChanges(true);
    }
  };

  const setSelectedRevisionStepsWithTracking = (newData: any) => {
    setSelectedRevisionSteps(newData);
    if (mode === 'edit' && isInitialized) {
      setHasChanges(true);
    }
  };

  const setDisciplineDocumentTypesWithTracking = (newData: any) => {
    setDisciplineDocumentTypes(newData);
    if (mode === 'edit' && isInitialized) {
      setHasChanges(true);
    }
  };
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [isMobile] = useState(false);
  const [codeValidation, setCodeValidation] = useState<{
    isChecking: boolean;
    exists: boolean;
    message: string;
    owner?: string;
    project_name?: string;
    is_deleted?: boolean;
  }>({
    isChecking: false,
    exists: false,
    message: ''
  });

  const clearWarnings = () => {
    setImportWarnings([]);
  };

  const [selectedDisciplines, setSelectedDisciplines] = useState<number[]>([]);
  const [disciplineDocumentTypes, setDisciplineDocumentTypes] = useState<{ [key: number]: { documentTypeId: number, drs?: string }[] }>({});
  const [selectedRevisionDescriptions, setSelectedRevisionDescriptions] = useState<number[]>([]);
  const [selectedRevisionSteps, setSelectedRevisionSteps] = useState<number[]>([]);
  const [selectedWorkflowPreset, setSelectedWorkflowPreset] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabIndex, setTabIndex] = useState(0);
  const [pendingParticipants, setPendingParticipants] = useState<ProjectParticipant[]>([]);
  
  // Состояние для диалога выбора типа документа
  const [documentTypeSelectionOpen, setDocumentTypeSelectionOpen] = useState(false);
  const [currentDiscipline, setCurrentDiscipline] = useState<Discipline | null>(null);
  const [currentDocumentTypeCode, setCurrentDocumentTypeCode] = useState<string>('');
  const [pendingImportPairs, setPendingImportPairs] = useState<Array<{discipline: Discipline, code: string}>>([]);
  // Используем данные из стора
  const { companies, contacts, companyRoles, users } = referenceDataStore;
  const [pendingProjectMembers, setPendingProjectMembers] = useState<ProjectMember[]>([]);
  const [projectMemberDialogOpen, setProjectMemberDialogOpen] = useState(false);
  const [isEditingProjectMember, setIsEditingProjectMember] = useState(false);
  const [selectedProjectMember, setSelectedProjectMember] = useState<ProjectMember | null>(null);
  const [projectMemberFormData, setProjectMemberFormData] = useState({
    user_id: null as number | null,
    project_role_id: null as number | null
  });
  const [projectRoles, setProjectRoles] = useState<any[]>([]);
  const [participantDialogOpen, setParticipantDialogOpen] = useState(false);
  const [isEditingParticipant, setIsEditingParticipant] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<ProjectParticipant | null>(null);
  const [participantFormData, setParticipantFormData] = useState({
    company_id: null as any,
    contact_id: null as any,
    company_role_id: null as any,
    is_primary: false,
    notes: ''
  });


  // Загружаем данные при открытии диалога
  useEffect(() => {
    if (open) {
      if (mode === 'create') {
        // Сброс состояния для создания
        setFormData({
          name: '',
          project_code: '',
          description: '',
          status: '',
          start_date: null,
          end_date: null,
          budget: '',
        });
        setSelectedDisciplines([]);
        setDisciplineDocumentTypes({});
        setSelectedRevisionDescriptions([]);
        setSelectedRevisionSteps([]);
        setError(null);
        clearWarnings();
        setPendingParticipantsWithTracking([]);
        setPendingProjectMembersWithTracking([]);
        setProjectMemberDialogOpen(false);
        setIsEditingProjectMember(false);
        setSelectedProjectMember(null);
        setProjectMemberFormData({
          user_id: null,
          project_role_id: null
        });
        setParticipantDialogOpen(false);
        setIsEditingParticipant(false);
        setSelectedParticipant(null);
        setParticipantFormData({
          company_id: null as any,
          contact_id: null as any,
          company_role_id: null as any,
          is_primary: false,
          notes: ''
        });
        setTabIndex(0);
        loadData();
      } else if (mode === 'edit' && projectId) {
        // Загрузка данных для редактирования
        loadProjectData();
      }
      
      // Загружаем роли проектов
      loadProjectRoles();
    }
  }, [open, mode, projectId]);

  const loadProjectRoles = async () => {
    try {
      const roles = await rolesApi.getProjectRoles();
      setProjectRoles(roles);
    } catch (error) {
      // Ошибка загрузки ролей проектов
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Загружаем данные через кэшированный стор
      await Promise.all([
        projectDialogStore.loadAllData(),
        referenceDataStore.loadAllReferenceData()
      ]);

      // Перезагружаем workflow presets для получения новых пресетов пользователя
      await projectDialogStore.reloadWorkflowPresets();
    } catch (err: any) {
      setError(`Ошибка загрузки данных: ${err.response?.data?.detail || err.message || 'Неизвестная ошибка'}`);
    } finally {
      setLoading(false);
    }
  };

  const loadProjectData = async () => {
    try {
      setLoading(true);
      setError(null);
      setHasChanges(false);
      
      // Загружаем данные проекта
      const project = await projectsApi.getById(projectId!);
      
      // Заполняем основную форму
      setFormData({
        name: project.name || '',
        project_code: project.project_code || '',
        description: project.description || '',
        status: project.status?.toLowerCase() || '',
        start_date: project.start_date ? new Date(project.start_date) : null,
        end_date: project.end_date ? new Date(project.end_date) : null,
        budget: project.budget?.toString() || '',
      });

      // Загружаем справочные данные через кэшированный стор (только если не загружены)
      await Promise.all([
        projectDialogStore.loadAllData(),
        referenceDataStore.loadAllReferenceData()
      ]);

      // Перезагружаем workflow presets для получения новых пресетов пользователя
      await projectDialogStore.reloadWorkflowPresets();

      // Загружаем данные проекта через кэшированный стор
      const projectData = await projectDialogStore.loadProjectData(projectId!);

      // Устанавливаем данные из кэша
      const disciplineIds = projectData.disciplines.map(d => d.id);
      setSelectedDisciplines(disciplineIds);

      const revisionIds = projectData.revisionDescriptions.map(r => r.id);
      setSelectedRevisionDescriptions(revisionIds);

      const stepIds = projectData.revisionSteps.map(s => s.id);
      setSelectedRevisionSteps(stepIds);

      if (projectData.workflowPreset && projectData.workflowPreset.id) {
        setSelectedWorkflowPreset(projectData.workflowPreset.id);
      }

      // Обрабатываем типы документов
      const disciplineDocTypes: { [key: number]: { documentTypeId: number, drs?: string }[] } = {};
      for (const [disciplineId, docTypes] of Object.entries(projectData.documentTypes)) {
        disciplineDocTypes[parseInt(disciplineId)] = docTypes.map(dt => ({
          documentTypeId: dt.id,
          drs: (dt as any).drs // Временное решение, пока не обновлен тип
        }));
      }
      setDisciplineDocumentTypesWithTracking(disciplineDocTypes);

      setPendingParticipantsWithTracking(projectData.participants);
      setPendingProjectMembersWithTracking(projectData.members);

    } catch (err: any) {
      setError(`Ошибка загрузки данных проекта: ${err.response?.data?.detail || err.message || 'Неизвестная ошибка'}`);
    } finally {
      setLoading(false);
      setIsInitialized(true);
    }
  };

  const handleDisciplineToggle = (disciplineId: number) => {
    setSelectedDisciplinesWithTracking((prev: number[]) => {
      const newSelected = prev.includes(disciplineId)
        ? prev.filter((id: number) => id !== disciplineId)
        : [...prev, disciplineId];
      
      // Очищаем типы документов для удаленных дисциплин
      if (!newSelected.includes(disciplineId)) {
        setDisciplineDocumentTypesWithTracking((prevTypes: any) => {
          const newTypes = { ...prevTypes };
          delete newTypes[disciplineId];
          return newTypes;
        });
      }
      
      return newSelected;
    });
  };

  const handleDocumentTypeToggle = (disciplineId: number, documentTypeId: number) => {
    setDisciplineDocumentTypesWithTracking((prev: any) => {
      const currentTypes = prev[disciplineId] || [];
      const existingIndex = currentTypes.findIndex((item: any) => item.documentTypeId === documentTypeId);
      
      let newTypes;
      if (existingIndex >= 0) {
        // Удаляем существующий тип
        newTypes = currentTypes.filter((_: any, index: any) => index !== existingIndex);
      } else {
        // Добавляем новый тип
        newTypes = [...currentTypes, { documentTypeId, drs: undefined }];
      }
      
      return {
        ...prev,
        [disciplineId]: newTypes,
      };
    });
  };

  const handleRevisionDescriptionToggle = (revisionDescriptionId: number) => {
    setSelectedRevisionDescriptionsWithTracking((prev: any) => 
      prev.includes(revisionDescriptionId)
        ? prev.filter((id: any) => id !== revisionDescriptionId)
        : [...prev, revisionDescriptionId]
    );
  };

  const handleRevisionStepToggle = (revisionStepId: number) => {
    setSelectedRevisionStepsWithTracking((prev: any) => 
      prev.includes(revisionStepId)
        ? prev.filter((id: any) => id !== revisionStepId)
        : [...prev, revisionStepId]
    );
  };

  const handleSubmit = async () => {
    // Защита от двойного вызова
    if (saving) {
      return;
    }
    
    // Валидируем код проекта перед отправкой (только для режима create)
    if (mode === 'create' && formData.project_code && formData.project_code.trim().length >= 3) {
      try {
        setCodeValidation({ ...codeValidation, isChecking: true });
        const result = await projectsApi.checkCode(formData.project_code.trim());
        setCodeValidation({
          isChecking: false,
          exists: result.exists,
          message: result.exists ? result.message : '',
          owner: result.owner,
          project_name: result.project_name,
          is_deleted: result.is_deleted || false
        });
        
        // Если код уже существует, прерываем создание
        if (result.exists) {
          setError('Код проекта уже используется');
          return;
        }
      } catch (error) {
        setCodeValidation({
          isChecking: false,
          exists: false,
          message: '',
          is_deleted: false
        });
      }
    }

    try {
      setSaving(true);
      setError(null);

      // Преобразуем статус в enum формат
      const statusMapping = {
        'planning': 'PLANNING',
        'active': 'ACTIVE', 
        'on_hold': 'ON_HOLD',
        'completed': 'COMPLETED',
        'cancelled': 'CANCELLED'
      };

      const { budget, ...formDataWithoutBudget } = formData;
      const projectData = {
        ...formDataWithoutBudget,
        status: statusMapping[formData.status as keyof typeof statusMapping] || 'PLANNING',
        start_date: formData.start_date?.toISOString().split('T')[0] || null,
        end_date: formData.end_date?.toISOString().split('T')[0] || null,
        selected_disciplines: selectedDisciplines,
        discipline_document_types: Object.keys(disciplineDocumentTypes).reduce((acc, disciplineId) => {
          acc[parseInt(disciplineId)] = disciplineDocumentTypes[parseInt(disciplineId)].map(item => ({
            documentTypeId: item.documentTypeId,
            drs: item.drs
          }));
          return acc;
        }, {} as { [key: number]: Array<{ documentTypeId: number, drs?: string }> }),
        selected_revision_descriptions: selectedRevisionDescriptions,
        selected_revision_steps: selectedRevisionSteps,
        workflow_preset_id: selectedWorkflowPreset,
        members: pendingProjectMembers.map(member => ({
          user_id: member.user_id,
          project_role_id: member.project_role_id
        })),
        participants: pendingParticipants.map(participant => ({
          company_id: participant.company_id,
          contact_id: participant.contact_id,
          company_role_id: participant.company_role_id,
          is_primary: participant.is_primary,
          notes: participant.notes
        })),
      };


      if (mode === 'create') {
        // Создание проекта
        const newProject = await projectsApi.create(projectData as any);
        
        // Добавляем участников проекта (компании), если они есть
        if (pendingParticipants.length > 0) {
          try {
            for (const participant of pendingParticipants) {
              const participantData: ProjectParticipantCreate = {
                company_id: participant.company_id,
                contact_id: participant.contact_id || undefined,
                company_role_id: participant.company_role_id || undefined,
                is_primary: participant.is_primary,
                notes: participant.notes || undefined
              };
              await projectParticipantsApi.create(newProject.id, participantData);
            }
          } catch (err: any) {
            // Не прерываем создание проекта из-за ошибки с участниками
          }
        }

        // Добавляем участников проекта (пользователи), если они есть
        if (pendingProjectMembers.length > 0) {
          try {
            for (const member of pendingProjectMembers) {
              await projectsApi.members.add(newProject.id, {
                user_id: member.user_id,
                project_role_id: member.project_role_id
              });
            }
          } catch (err: any) {
            // Не прерываем создание проекта из-за ошибки с участниками
          }
        }
        
        onSuccess?.(newProject);
      } else {
        // Редактирование проекта
        await projectsApi.update(projectId!, projectData as any);
        onSaved?.();
      }
      
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || t('createProject.messages.project_create_error'));
    } finally {
      setSaving(false);
    }
  };

  // Функции для работы с участниками
  const handleCompanyChange = (companyId: number | null) => {
    setParticipantFormData(prev => ({
      ...prev,
      company_id: companyId,
      contact_id: null // Сбрасываем выбранный контакт при смене компании
    }));
  };

  const handleDeleteParticipant = (participantId: number) => {
    const updatedParticipants = pendingParticipants.filter(p => p.id !== participantId);
    setPendingParticipantsWithTracking(updatedParticipants);
  };

  const handleSaveParticipant = (participantData?: any) => {
    if (participantData) {
      // Данные переданы из ParticipantsTab
      
      const selectedCompany = companies.find(c => c.id === participantData.company_id);

      const newParticipant: ProjectParticipant = {
        id: participantData.id || Date.now(),
        project_id: mode === 'edit' ? projectId! : 0,
        company_id: participantData.company_id,
        company_name: selectedCompany?.name || t('createProject.messages.unknown_company'),
        contact_id: participantData.contact_id,
        company_role_id: participantData.company_role_id,
        is_primary: participantData.is_primary,
        notes: participantData.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      if (selectedParticipant) {
        // Редактирование
        const updatedParticipants = pendingParticipants.map(p => 
          p.id === selectedParticipant.id ? newParticipant : p
        );
        setPendingParticipantsWithTracking(updatedParticipants);
      } else {
        // Добавление
        setPendingParticipantsWithTracking([...pendingParticipants, newParticipant]);
      }
    } else {
      // Старая логика для совместимости

      const selectedCompany = companies.find(c => c.id === participantFormData.company_id);

      const newParticipant: ProjectParticipant = {
        id: Date.now(),
        project_id: mode === 'edit' ? projectId! : 0,
        company_id: participantFormData.company_id,
        company_name: selectedCompany?.name || t('createProject.messages.unknown_company'),
        contact_id: participantFormData.contact_id,
        company_role_id: participantFormData.company_role_id,
        is_primary: participantFormData.is_primary,
        notes: participantFormData.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (selectedParticipant) {
        // Редактирование
        const updatedParticipants = pendingParticipants.map(p => 
          p.id === selectedParticipant.id ? newParticipant : p
        );
        setPendingParticipantsWithTracking(updatedParticipants);
      } else {
        // Добавление
        setPendingParticipantsWithTracking([...pendingParticipants, newParticipant]);
      }

      setParticipantFormData({
        company_id: null,
        contact_id: null,
        company_role_id: null,
        is_primary: false,
        notes: ''
      });
      setParticipantDialogOpen(false);
    }
    setIsEditingParticipant(false);
    setSelectedParticipant(null);
    setError(null);
  };

  // Функции для управления участниками проекта (пользователями)
  const handleDeleteProjectMember = (memberId: number) => {
    const updatedMembers = pendingProjectMembers.filter(m => m.id !== memberId);
    setPendingProjectMembersWithTracking(updatedMembers);
  };

  const handleSaveProjectMember = (memberData?: any) => {
    if (memberData) {
      // Данные переданы из UsersTab
      const newMember: ProjectMember = {
        id: memberData.id,
        project_id: mode === 'edit' ? projectId! : 0, // Будет установлен после создания проекта
        user_id: memberData.user_id,
        project_role_id: memberData.project_role_id || undefined,
        joined_at: new Date().toISOString()
      };

      if (selectedProjectMember) {
        // Редактирование
        const updatedMembers = pendingProjectMembers.map(m => 
          m.id === selectedProjectMember.id ? newMember : m
        );
        setPendingProjectMembersWithTracking(updatedMembers);
      } else {
        // Добавление
        const updatedMembers = [...pendingProjectMembers, newMember];
        setPendingProjectMembersWithTracking(updatedMembers);
      }
    } else {
      // Старая логика для совместимости
      if (!projectMemberFormData.user_id) {
        return;
      }

      const newMember: ProjectMember = {
        id: Date.now(), // Временный ID
        project_id: mode === 'edit' ? projectId! : 0, // Будет установлен после создания проекта
        user_id: projectMemberFormData.user_id,
        project_role_id: projectMemberFormData.project_role_id || undefined,
        joined_at: new Date().toISOString()
      };

      if (selectedProjectMember) {
        // Редактирование
        const updatedMembers = pendingProjectMembers.map(m => 
          m.id === selectedProjectMember.id ? newMember : m
        );
        setPendingProjectMembersWithTracking(updatedMembers);
      } else {
        // Добавление
        setPendingProjectMembersWithTracking([...pendingProjectMembers, newMember]);
      }
    }

    setProjectMemberFormData({
      user_id: null,
      project_role_id: null
    });
    setProjectMemberDialogOpen(false);
    setIsEditingProjectMember(false);
    setSelectedProjectMember(null);
    setError(null);
  };



  const handleClose = () => {
    setFormData({
      name: '',
      project_code: '',
      description: '',
      status: '',
      start_date: null,
      end_date: null,
      budget: '',
    });
    setSelectedDisciplines([]);
    setDisciplineDocumentTypes({});
    setSelectedRevisionDescriptions([]);
    setSelectedRevisionSteps([]);
    setSelectedWorkflowPreset(null);
    setError(null);
    clearWarnings();
    setTabIndex(0);
    
    // Сброс состояния диалога выбора типа документа
    setDocumentTypeSelectionOpen(false);
    setCurrentDiscipline(null);
    setCurrentDocumentTypeCode('');
    setPendingImportPairs([]);
    
    // Очищаем валидацию кода проекта
    setCodeValidation({
      isChecking: false,
      exists: false,
      message: ''
    });
    
    // Очищаем кэш проекта при закрытии диалога
    if (projectId) {
      projectDialogStore.clearProjectCache(projectId);
    }
    
    setHasChanges(false);
    setIsInitialized(false);
    onClose();
  };

  // Обработка неоднозначностей при импорте
  const handleNextAmbiguousPair = async () => {
    if (pendingImportPairs.length === 0) {
      return;
    }

    const pair = pendingImportPairs[0];
    setCurrentDiscipline(pair.discipline);
    setCurrentDocumentTypeCode(pair.code);

    try {
      await disciplinesApi.searchDocumentTypesByCode(pair.discipline.id, pair.code);
      setDocumentTypeSelectionOpen(true);
    } catch (error) {
      setDocumentTypeSelectionOpen(true);
    }
  };

  const handleDocumentTypeSelect = (documentTypes: DocumentType[]) => {
    // Добавляем выбранные типы документов к дисциплине
    const disciplineId = currentDiscipline!.id;
    setSelectedDisciplines(prev => {
      if (!prev.includes(disciplineId)) {
        return [...prev, disciplineId];
      }
      return prev;
    });
    
    setDisciplineDocumentTypesWithTracking((prev: any) => {
      const arr = prev[disciplineId] || [];
      const existingIds = arr.map((item: any) => item.documentTypeId);
      const newTypeIds = documentTypes.map((dt: any) => dt.id).filter((id: any) => !existingIds.includes(id));
      const newItems = newTypeIds.map((id: any) => ({ documentTypeId: id, drs: undefined }));
      return { ...prev, [disciplineId]: [...arr, ...newItems] };
    });

    // Убираем обработанную пару и переходим к следующей
    setPendingImportPairs(prev => prev.slice(1));
    setDocumentTypeSelectionOpen(false);
    
    // Если есть еще неоднозначности, обрабатываем следующую
    if (pendingImportPairs.length > 1) {
      setTimeout(() => handleNextAmbiguousPair(), 100);
    }
  };

  const handleImportExcel = async (file: File) => {
    clearWarnings();
    
    const result = await handleExcelImport(file, {
      disciplines: projectDialogStore.disciplines,
      documentTypes: projectDialogStore.documentTypes
    }, t);

    if (!result.success) {
      setError(result.error || t('createProject.messages.import_error'));
      return;
    }

    // Добавляем дисциплины
    if (result.disciplinesToAdd.length > 0) {
      setSelectedDisciplines(prev => {
        const newDisciplines = [...prev];
        result.disciplinesToAdd.forEach(disciplineId => {
          if (!newDisciplines.includes(disciplineId)) {
            newDisciplines.push(disciplineId);
          }
        });
        return newDisciplines;
      });
    }

    // Добавляем связи дисциплина-тип документа
    if (result.documentTypesToAdd.length > 0) {
      setDisciplineDocumentTypesWithTracking((prev: any) => {
        const newDisciplineDocumentTypes = { ...prev };
        result.documentTypesToAdd.forEach((item: any) => {
          const arr = newDisciplineDocumentTypes[item.disciplineId] || [];
          const existingItem = arr.find((dt: any) => dt.documentTypeId === item.documentTypeId);
          if (!existingItem) {
            newDisciplineDocumentTypes[item.disciplineId] = [
              ...arr, 
              { documentTypeId: item.documentTypeId, drs: item.drs }
            ];
          } else {
            // Обновляем существующий элемент, сохраняя его drs если новый drs пустой
            const updatedItem = {
              documentTypeId: item.documentTypeId,
              drs: item.drs || existingItem.drs // Используем новый drs или сохраняем существующий
            };
            const index = arr.findIndex((dt: any) => dt.documentTypeId === item.documentTypeId);
            arr[index] = updatedItem;
            newDisciplineDocumentTypes[item.disciplineId] = arr;
          }
        });
        return newDisciplineDocumentTypes;
      });
    }

    if (result.warnings.length > 0) {
      setImportWarnings(result.warnings);
    }
  };

  const dialogTitle = mode === 'create' 
    ? t('project.create_new') 
    : t('project.edit');
  
  const submitButtonText = mode === 'create' 
    ? (saving ? t('createProject.creating') : t('project.create'))
    : (saving ? t('common.saving') : t('common.save'));
  
  const submitButtonDisabled = loading || saving || !formData.name || selectedDisciplines.length === 0 || (mode === 'create' && codeValidation.exists) || (mode === 'edit' && !hasChanges);

  
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth={isMobile ? "sm" : "lg"}
        fullWidth
        scroll="paper"
        PaperProps={{ 
          sx: { 
            minWidth: isMobile ? 'auto' : 1000,
            '&:focus': {
              outline: 'none',
            },
            '&:focus-visible': {
              outline: 'none',
            }
          } 
        }}
        fullScreen={isMobile}
        aria-labelledby={`${mode}-project-dialog-title`}
        aria-describedby={`${mode}-project-dialog-description`}
        disablePortal={false}
        keepMounted={false}
        disableAutoFocus={false}
        disableEnforceFocus={false}
        disableRestoreFocus={false}
      >
        <DialogTitle id={`${mode}-project-dialog-title`}>{dialogTitle}</DialogTitle>
        <Box id={`${mode}-project-dialog-description`} sx={{ display: 'none' }}>
          {t('createProject.messages.dialog_description')}
        </Box>
        <DialogContent sx={{ 
          height: 700,
          p: 0,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {error && (
            <Alert severity="error" sx={{ m: isMobile ? 1 : 3, mb: 2 }}>
              {typeof error === 'string' ? error : JSON.stringify(error)}
            </Alert>
          )}

          {/* Fixed Tabs header */}
          <Box sx={{ 
            position: 'sticky',
            top: 0,
            zIndex: 1,
            backgroundColor: 'background.paper',
            borderBottom: 1,
            borderColor: 'divider',
            px: isMobile ? 1 : 3,
            pt: isMobile ? 1 : 3
          }}>
            <Tabs
              value={tabIndex}
              onChange={(_, v) => setTabIndex(v)}
              sx={{ 
                '& .MuiTab-root': {
                  '&:focus': {
                    outline: 'none !important',
                    boxShadow: 'none !important',
                  },
                  '&.Mui-selected': {
                    outline: 'none !important',
                    boxShadow: 'none !important',
                  },
                  '&:focus-visible': {
                    outline: 'none !important',
                    boxShadow: 'none !important',
                  }
                }
              }}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab label={t('createProject.tabs.main')} />
              <Tab label={t('createProject.tabs.disciplines_types')} />
              <Tab label={t('createProject.tabs.revisions')} />
              <Tab label={t('createProject.tabs.workflow')} />
              <Tab label={t('createProject.tabs.participants')} />
              <Tab label={t('createProject.tabs.users')} />
              <Tab label={t('createProject.tabs.summary')} />
            </Tabs>
          </Box>

          {/* Scrollable content area */}
          <Box sx={{ 
            flex: 1,
            overflow: 'auto',
            p: isMobile ? 1 : 3,
            pt: 2
          }}>

          {/* Tab 0: Основное */}
          {tabIndex === 0 && (
            <MainTab 
              formData={formData}
              setFormData={setFormData}
              codeValidation={mode === 'create' ? codeValidation : { isChecking: false, exists: false, message: '' }}
              setCodeValidation={mode === 'create' ? setCodeValidation : () => {}}
              mode={mode}
            />
          )}

          {/* Tab 1: Дисциплины и типы */}
          {tabIndex === 1 && (
            <DisciplinesTypesTab
              disciplines={projectDialogStore.disciplines}
              documentTypes={projectDialogStore.documentTypes}
              selectedDisciplines={selectedDisciplines}
              disciplineDocumentTypes={disciplineDocumentTypes}
              importWarnings={importWarnings}
              onDisciplineToggle={handleDisciplineToggle}
              onDocumentTypeToggle={handleDocumentTypeToggle}
              onImportExcel={handleImportExcel}
              onClearWarnings={clearWarnings}
              getDisciplineDescription={(d) => (i18n.language === 'en' && d.description_en) ? d.description_en : d.description}
            />
          )}

          {/* Tab 2: Ревизии */}
          {tabIndex === 2 && (
            <RevisionsTab
              revisionDescriptions={projectDialogStore.revisionDescriptions}
              revisionSteps={projectDialogStore.revisionSteps}
              selectedRevisionDescriptions={selectedRevisionDescriptions}
              selectedRevisionSteps={selectedRevisionSteps}
              onRevisionDescriptionToggle={handleRevisionDescriptionToggle}
              onRevisionStepToggle={handleRevisionStepToggle}
              getRevisionDescriptionName={(rd) => rd.description_native || rd.description}
              getRevisionStepName={(rs) => rs.description_native || rs.description}
            />
          )}

          {/* Tab 3: Workflow */}
          {tabIndex === 3 && (
            <WorkflowTab
              workflowPresets={projectDialogStore.workflowPresets}
              selectedWorkflowPreset={selectedWorkflowPreset}
              onWorkflowPresetChange={setSelectedWorkflowPresetWithTracking}
            />
          )}

          {/* Tab 4: Участники */}
          {tabIndex === 4 && (
            <ParticipantsTab
              pendingParticipants={pendingParticipants}
              companies={referenceDataStore.companies}
              contacts={referenceDataStore.contacts}
              companyRoles={referenceDataStore.companyRoles}
              onDeleteParticipant={handleDeleteParticipant}
              onSaveParticipant={handleSaveParticipant}
              onCompanyChange={handleCompanyChange}
              getCompanyName={(company) => referenceDataStore.getCompanyName(company.id)}
              getContactName={(contact) => referenceDataStore.getContactName(contact.id)}
              getRoleName={(role) => (i18n.language === 'en' && role.name_en) ? role.name_en : role.name}
            />
          )}

          {/* Tab 5: Доступ */}
          {tabIndex === 5 && (
            <UsersTab
              pendingProjectMembers={pendingProjectMembers}
              users={users}
              projectRoles={projectRoles}
              onDeleteProjectMember={handleDeleteProjectMember}
              onSaveProjectMember={handleSaveProjectMember}
            />
          )}

          {/* Tab 6: Итоги */}
          {tabIndex === 6 && (
            <SummaryTab
              formData={formData}
              selectedDisciplines={selectedDisciplines}
              disciplineDocumentTypes={disciplineDocumentTypes}
              selectedRevisionDescriptions={selectedRevisionDescriptions}
              selectedRevisionSteps={selectedRevisionSteps}
              selectedWorkflowPreset={selectedWorkflowPreset}
              pendingParticipants={pendingParticipants}
              pendingProjectMembers={pendingProjectMembers}
              disciplines={projectDialogStore.disciplines}
              documentTypes={projectDialogStore.documentTypes}
              workflowPresets={projectDialogStore.workflowPresets}
              companies={companies}
              contacts={contacts}
              companyRoles={companyRoles}
              users={users}
              revisionDescriptions={projectDialogStore.revisionDescriptions}
              revisionSteps={projectDialogStore.revisionSteps}
            />
          )}
          </Box>

          {/* Fixed bottom area for selected disciplines and types */}
          {tabIndex === 1 && selectedDisciplines.length > 0 && (
            <Box sx={{ 
              position: 'sticky',
              bottom: 0,
              zIndex: 1,
              backgroundColor: 'background.paper',
              borderTop: 1,
              borderColor: 'divider',
              p: isMobile ? 1 : 2,
              mt: 'auto'
            }}>
              <Typography variant="subtitle2" gutterBottom sx={{ mb: 1 }}>
                {t('createProject.selected_disciplines')}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {selectedDisciplines.map((disciplineId) => {
                  const discipline = projectDialogStore.disciplines.find(d => d.id === disciplineId);
                  const selectedTypes = disciplineDocumentTypes[disciplineId] || [];
                  return (
                    <Chip
                      key={disciplineId}
                      label={`${discipline?.code} (${selectedTypes.length} ${t('common.types')})`}
                      color="primary"
                      variant="filled"
                    />
                  );
                })}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitButtonDisabled}
          >
            {submitButtonText}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Participant Dialog */}
      <Dialog open={participantDialogOpen} onClose={() => {
        setParticipantDialogOpen(false);
        setIsEditingParticipant(false);
        setSelectedParticipant(null);
      }} maxWidth="sm" fullWidth>
        <DialogTitle>
          {isEditingParticipant ? t('createProject.buttons.edit_participant') : t('createProject.buttons.add_participant')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth required variant="standard">
              <InputLabel>{t('createProject.fields.company')}</InputLabel>
              <Select
                value={participantFormData.company_id || ''}
                onChange={(e) => handleCompanyChange(e.target.value as number)}
                label={t('createProject.fields.company')}
              >
                {companies.map((company) => (
                  <MenuItem key={company.id} value={company.id}>
                    {company.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth required variant="standard">
              <InputLabel>{t('createProject.fields.contact_person')}</InputLabel>
                <Select
                value={participantFormData.contact_id || ''}
                onChange={(e) => setParticipantFormData(prev => ({ ...prev, contact_id: e.target.value as number }))}
                label={t('createProject.fields.contact_person')}
                disabled={!participantFormData.company_id || contacts.length === 0}
              >
                {contacts.map((contact) => (
                  <MenuItem key={contact.id} value={contact.id}>
                    {contact.full_name} {contact.position ? `- ${contact.position}` : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth required variant="standard">
              <InputLabel>{t('createProject.fields.company_role')}</InputLabel>
              <Select
                value={participantFormData.company_role_id || ''}
                onChange={(e) => setParticipantFormData(prev => ({ ...prev, company_role_id: e.target.value as number }))}
                label={t('createProject.fields.company_role')}
              >
                {companyRoles.map((role) => (
                  <MenuItem key={role.id} value={role.id}>
                    {role.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
            <FormControlLabel
              control={
                <Checkbox
                  checked={participantFormData.is_primary}
                  onChange={(e) => setParticipantFormData(prev => ({ ...prev, is_primary: e.target.checked }))}
                />
              }
              label={t('createProject.fields.primary_participant')}
            />

            <TextField
              fullWidth
              label={t('createProject.fields.notes')}
              multiline
              variant="standard"
              rows={3}
              value={participantFormData.notes}
              onChange={(e) => setParticipantFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
                                </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setParticipantDialogOpen(false);
            setIsEditingParticipant(false);
            setSelectedParticipant(null);
            setParticipantFormData({
              company_id: null,
              contact_id: null,
              company_role_id: null,
              is_primary: false,
              notes: ''
            });
            setError(null);
          }}>
            {t('createProject.buttons.cancel')}
          </Button>
          <Button onClick={handleSaveParticipant} variant="contained">
            {isEditingParticipant ? t('createProject.buttons.save') : t('createProject.buttons.add')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог добавления/редактирования участника проекта */}
      <Dialog 
        open={projectMemberDialogOpen} 
        onClose={() => {
          setProjectMemberDialogOpen(false);
          setIsEditingProjectMember(false);
          setSelectedProjectMember(null);
        }}
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          {isEditingProjectMember ? t('createProject.buttons.edit_user') : t('createProject.buttons.add_user')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            
            <Autocomplete
              options={users}
              getOptionLabel={(user) => `${user.full_name} (${user.email})`}
              value={users.find(user => user.id === projectMemberFormData.user_id) || null}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              onChange={(_, newValue) => {
                setProjectMemberFormData(prev => ({ 
                  ...prev, 
                  user_id: newValue ? newValue.id : null 
                }));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('createProject.fields.user')}
                  placeholder={t('createProject.messages.start_typing_user')}
                  variant="standard"
                />
              )}
              renderOption={(props, user) => {
                const { key, ...otherProps } = props;
                return (
                  <Box component="li" key={key} {...otherProps}>
                          <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {user.full_name}
                            </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {user.email}
                                  </Typography>
                            </Box>
                          </Box>
                        );
              }}
              noOptionsText={t('createProject.messages.users_not_found')}
              clearOnEscape
              selectOnFocus
              handleHomeEndKeys
              ListboxProps={{
                style: {
                  maxHeight: '300px',
                  overflow: 'auto'
                }
              }}
              slotProps={{
                popper: {
                  placement: 'bottom-start',
                  modifiers: [
                    {
                      name: 'preventOverflow',
                      enabled: false,
                    },
                    {
                      name: 'flip',
                      enabled: false,
                    },
                  ],
                },
              }}
            />

            <FormControl fullWidth variant="standard">
              <InputLabel>{t('createProject.fields.role')}</InputLabel>
              <Select
                value={projectMemberFormData.project_role_id || ''}
                onChange={(e) => setProjectMemberFormData(prev => ({ 
                  ...prev, 
                  project_role_id: e.target.value as number
                }))}
                label={t('createProject.fields.role')}
              >
                {projectRoles.map((role) => (
                  <MenuItem key={role.id} value={role.id}>
                    {role.name_en || role.name} - {role.description}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
                        </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setProjectMemberDialogOpen(false);
            setIsEditingProjectMember(false);
            setSelectedProjectMember(null);
            setProjectMemberFormData({
              user_id: null,
              project_role_id: null
            });
            setError(null);
          }}>
            {t('createProject.buttons.cancel')}
          </Button>
          <Button onClick={handleSaveProjectMember} variant="contained">
            {isEditingProjectMember ? t('createProject.buttons.save') : t('createProject.buttons.add')}
          </Button>
        </DialogActions>
      </Dialog>

        {/* Диалог выбора типа документа */}
        <DocumentTypeSelectionDialog
          open={documentTypeSelectionOpen}
          onClose={() => setDocumentTypeSelectionOpen(false)}
          onSelect={handleDocumentTypeSelect}
          discipline={currentDiscipline}
          documentTypeCode={currentDocumentTypeCode}
          documentTypes={projectDialogStore.documentTypes}
        />
    </LocalizationProvider>
  );
});

export default ProjectDialog;
