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
  Autocomplete
} from '@mui/material';
import { disciplinesApi, projectsApi, referencesApi, workflowPresetsApi, projectParticipantsApi } from '../api/client';
import referenceDataStore from '../stores/ReferenceDataStore';
import type { Discipline, DocumentType, ProjectParticipant, ProjectParticipantCreate, ProjectMember } from '../api/client';
import { getRoleLabel, getRoleColor } from '../utils/roleLocalization';
import DocumentTypeSelectionDialog from './DocumentTypeSelectionDialog';
import MainTab from './project/MainTab';
import DisciplinesTypesTab from './project/DisciplinesTypesTab';
import RevisionsTab from './project/RevisionsTab';
import WorkflowTab from './project/WorkflowTab';
import ParticipantsTab from './project/ParticipantsTab';
import UsersTab from './project/UsersTab';
import SummaryTab from './project/SummaryTab';
import { useProjectForm } from '../hooks/useProjectForm';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ru } from 'date-fns/locale';

interface EditProjectDialogProps {
  open: boolean;
  projectId: number;
  onClose: () => void;
  onSaved: () => void;
}

const EditProjectDialog: React.FC<EditProjectDialogProps> = observer(({
  open,
  projectId,
  onClose,
  onSaved,
}) => {
  const { t, i18n } = useTranslation();
  const { formData, setFormData } = useProjectForm();
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

  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [selectedDisciplines, setSelectedDisciplines] = useState<number[]>([]);
  const [disciplineDocumentTypes, setDisciplineDocumentTypes] = useState<{ [key: number]: { documentTypeId: number, drs?: string }[] }>({});
  const [revisionDescriptions, setRevisionDescriptions] = useState<any[]>([]);
  const [revisionSteps, setRevisionSteps] = useState<any[]>([]);
  const [selectedRevisionDescriptions, setSelectedRevisionDescriptions] = useState<number[]>([]);
  const [selectedRevisionSteps, setSelectedRevisionSteps] = useState<number[]>([]);
  const [workflowPresets, setWorkflowPresets] = useState<any[]>([]);
  const [selectedWorkflowPreset, setSelectedWorkflowPreset] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabIndex, setTabIndex] = useState(0);
  const [pendingParticipants, setPendingParticipants] = useState<ProjectParticipant[]>([]);
  
  // Состояние для диалога выбора типа документа
  const [documentTypeSelectionOpen, setDocumentTypeSelectionOpen] = useState(false);
  const [currentDiscipline, setCurrentDiscipline] = useState<Discipline | null>(null);
  const [currentDocumentTypeCode, setCurrentDocumentTypeCode] = useState<string>('');
  const [foundDocumentTypes, setFoundDocumentTypes] = useState<DocumentType[]>([]);
  const [pendingImportPairs, setPendingImportPairs] = useState<Array<{discipline: Discipline, code: string}>>([]);
  // Используем данные из стора
  const { companies, contacts, companyRoles, users } = referenceDataStore;
  const [pendingProjectMembers, setPendingProjectMembers] = useState<ProjectMember[]>([]);
  const [projectMemberDialogOpen, setProjectMemberDialogOpen] = useState(false);
  const [isEditingProjectMember, setIsEditingProjectMember] = useState(false);
  const [selectedProjectMember, setSelectedProjectMember] = useState<ProjectMember | null>(null);
  const [projectMemberFormData, setProjectMemberFormData] = useState({
    user_id: null as number | null,
    role: 'viewer'
  });
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

  // Загружаем данные проекта при открытии диалога
  useEffect(() => {
    if (open && projectId) {
      loadProjectData();
    }
  }, [open, projectId]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Загружаем данные проекта
      const project = await projectsApi.getById(projectId);
      
      // Заполняем основную форму
      setFormData({
        name: project.name || '',
        project_code: project.project_code || '',
        description: project.description || '',
        status: project.status?.toLowerCase() || 'planning',
        start_date: project.start_date ? new Date(project.start_date) : null,
        end_date: project.end_date ? new Date(project.end_date) : null,
        budget: project.budget?.toString() || '',
      });

      // Загружаем справочные данные
      const [disciplinesData, documentTypesData, revisionDescriptionsData, revisionStepsData, workflowPresetsData] = await Promise.all([
        disciplinesApi.getAll(),
        disciplinesApi.getDocumentTypes(),
        referencesApi.getRevisionDescriptions(),
        referencesApi.getRevisionSteps(),
        workflowPresetsApi.getAll()
      ]);
      setDisciplines(disciplinesData);
      setDocumentTypes(documentTypesData);
      setRevisionDescriptions(revisionDescriptionsData);
      setRevisionSteps(revisionStepsData);
      setWorkflowPresets(workflowPresetsData);
      
      // Загружаем справочные данные через стор
      await referenceDataStore.loadAllReferenceData();

      // Загружаем дисциплины проекта
      const projectDisciplines = await projectsApi.getDisciplines(projectId);
      const disciplineIds = projectDisciplines.map(d => d.id);
      setSelectedDisciplines(disciplineIds);

      // Загружаем ревизии проекта
      try {
        const projectRevisions = await projectsApi.getRevisionDescriptions(projectId);
        const revisionIds = projectRevisions.map(r => r.id);
        setSelectedRevisionDescriptions(revisionIds);
      } catch (err) {
        console.log('No revision descriptions found for project');
      }

      // Загружаем шаги ревизий проекта
      try {
        const projectRevisionSteps = await projectsApi.getRevisionSteps(projectId);
        const stepIds = projectRevisionSteps.map(s => s.id);
        setSelectedRevisionSteps(stepIds);
      } catch (err) {
        console.log('No revision steps found for project');
      }

      // Загружаем пресет workflow проекта
      try {
        const projectWorkflow = await projectsApi.getWorkflowPreset(projectId);
        if (projectWorkflow && projectWorkflow.id) {
          setSelectedWorkflowPreset(projectWorkflow.id);
        }
      } catch (err) {
        console.log('No workflow preset found for project');
      }

      // Загружаем типы документов для каждой дисциплины
      const disciplineDocTypes: { [key: number]: { documentTypeId: number, drs?: string }[] } = {};
      for (const disciplineId of disciplineIds) {
        const docTypes = await projectsApi.getDocumentTypes(projectId, disciplineId);
        disciplineDocTypes[disciplineId] = docTypes.map(dt => ({
          documentTypeId: dt.id,
          drs: dt.drs
        }));
      }
      setDisciplineDocumentTypes(disciplineDocTypes);

      // Загружаем участников проекта
      try {
        const participants = await projectParticipantsApi.getAll(projectId);
        setPendingParticipants(participants);
      } catch (err) {
        console.log('No participants found for project');
      }

      // Загружаем участников проекта (пользователей)
      try {
        const members = await projectsApi.members.getAll(projectId);
        setPendingProjectMembers(members);
      } catch (err) {
        console.log('No members found for project');
      }

    } catch (err: any) {
      console.error('Error loading project data:', err);
      setError(`Ошибка загрузки данных проекта: ${err.response?.data?.detail || err.message || 'Неизвестная ошибка'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDisciplineToggle = (disciplineId: number) => {
    setSelectedDisciplines(prev => {
      const newSelected = prev.includes(disciplineId)
        ? prev.filter(id => id !== disciplineId)
        : [...prev, disciplineId];
      
      // Очищаем типы документов для удаленных дисциплин
      if (!newSelected.includes(disciplineId)) {
        setDisciplineDocumentTypes(prevTypes => {
          const newTypes = { ...prevTypes };
          delete newTypes[disciplineId];
          return newTypes;
        });
      }
      
      return newSelected;
    });
  };

  const handleDocumentTypeToggle = (disciplineId: number, documentTypeId: number) => {
    setDisciplineDocumentTypes(prev => {
      const currentTypes = prev[disciplineId] || [];
      const existingIndex = currentTypes.findIndex(item => item.documentTypeId === documentTypeId);
      
      let newTypes;
      if (existingIndex >= 0) {
        // Удаляем существующий тип
        newTypes = currentTypes.filter((_, index) => index !== existingIndex);
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
    setSelectedRevisionDescriptions(prev => 
      prev.includes(revisionDescriptionId)
        ? prev.filter(id => id !== revisionDescriptionId)
        : [...prev, revisionDescriptionId]
    );
  };

  const handleRevisionStepToggle = (revisionStepId: number) => {
    setSelectedRevisionSteps(prev => 
      prev.includes(revisionStepId)
        ? prev.filter(id => id !== revisionStepId)
        : [...prev, revisionStepId]
    );
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
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
        status: statusMapping[formData.status as keyof typeof statusMapping] || 'ACTIVE',
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
      };

      // Обновляем проект
      await projectsApi.update(projectId, projectData as any);
      
      onSaved();
      handleClose();
    } catch (err: any) {
      console.error('Ошибка обновления проекта:', err);
      setError(err.response?.data?.detail || t('createProject.messages.project_create_error'));
    } finally {
      setLoading(false);
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
    setPendingParticipants(updatedParticipants);
  };

  const handleSaveParticipant = (participantData?: any) => {
    if (participantData) {
      const selectedCompany = companies.find(c => c.id === participantData.company_id);

      const newParticipant: ProjectParticipant = {
        id: participantData.id || Date.now(),
        project_id: projectId,
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
        setPendingParticipants(updatedParticipants);
      } else {
        // Добавление
        setPendingParticipants([...pendingParticipants, newParticipant]);
      }
    } else {
      const selectedCompany = companies.find(c => c.id === participantFormData.company_id);

      const newParticipant: ProjectParticipant = {
        id: Date.now(),
        project_id: projectId,
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
        setPendingParticipants(updatedParticipants);
      } else {
        // Добавление
        setPendingParticipants([...pendingParticipants, newParticipant]);
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
    setPendingProjectMembers(updatedMembers);
  };

  const handleSaveProjectMember = (memberData?: any) => {
    if (memberData) {
      const newMember: ProjectMember = {
        id: memberData.id,
        project_id: projectId,
        user_id: memberData.user_id,
        role: memberData.role,
        joined_at: new Date().toISOString()
      };

      if (selectedProjectMember) {
        // Редактирование
        const updatedMembers = pendingProjectMembers.map(m => 
          m.id === selectedProjectMember.id ? newMember : m
        );
        setPendingProjectMembers(updatedMembers);
      } else {
        // Добавление
        const updatedMembers = [...pendingProjectMembers, newMember];
        setPendingProjectMembers(updatedMembers);
      }
    } else {
      if (!projectMemberFormData.user_id) {
        return;
      }

      const newMember: ProjectMember = {
        id: Date.now(),
        project_id: projectId,
        user_id: projectMemberFormData.user_id,
        role: projectMemberFormData.role,
        joined_at: new Date().toISOString()
      };

      if (selectedProjectMember) {
        // Редактирование
        const updatedMembers = pendingProjectMembers.map(m => 
          m.id === selectedProjectMember.id ? newMember : m
        );
        setPendingProjectMembers(updatedMembers);
      } else {
        // Добавление
        setPendingProjectMembers([...pendingProjectMembers, newMember]);
      }
    }

    setProjectMemberFormData({
      user_id: null,
      role: 'viewer'
    });
    setProjectMemberDialogOpen(false);
    setIsEditingProjectMember(false);
    setSelectedProjectMember(null);
    setError(null);
  };

  const getRoleLabelLocalized = (role: string): string => {
    return getRoleLabel(role, t);
  };

  const getRoleColorLocalized = (role: string): "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    return getRoleColor(role);
  };

  const handleClose = () => {
    setFormData({
      name: '',
      project_code: '',
      description: '',
      status: 'planning',
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
    setFoundDocumentTypes([]);
    setPendingImportPairs([]);
    
    // Очищаем валидацию кода проекта
    setCodeValidation({
      isChecking: false,
      exists: false,
      message: ''
    });
    
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
      const foundTypes = await disciplinesApi.searchDocumentTypesByCode(pair.discipline.id, pair.code);
      setFoundDocumentTypes(foundTypes);
      setDocumentTypeSelectionOpen(true);
    } catch (error) {
      console.error('Error searching document types:', error);
      setFoundDocumentTypes([]);
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
    
    setDisciplineDocumentTypes(prev => {
      const arr = prev[disciplineId] || [];
      const existingIds = arr.map(item => item.documentTypeId);
      const newTypeIds = documentTypes.map(dt => dt.id).filter(id => !existingIds.includes(id));
      const newItems = newTypeIds.map(id => ({ documentTypeId: id, drs: undefined }));
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
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      // Наборы для отслеживания
      const processedRows = new Set<string>();
      const missingDisciplines: string[] = [];
      const missingDocumentTypes: string[] = [];
      const mismatchedNames: string[] = [];
      let processedCount = 0;
      let matchedCount = 0;

      // Карта для быстрого поиска дисциплин по коду
      const codeToDiscipline: Record<string, Discipline> = {};
      disciplines.forEach(d => { codeToDiscipline[(d.code || '').trim().toUpperCase()] = d; });

      // Карта для быстрого поиска типов документов по коду + название
      const codeNameToDocumentType: Record<string, DocumentType> = {};
      documentTypes.forEach(dt => { 
        const cleanName = (dt.name_en || dt.name || '').trim().replace(/\s+/g, ' ').toLowerCase();
        const key = `${(dt.code || '').trim().toUpperCase()}__${cleanName}`;
        codeNameToDocumentType[key] = dt;
      });

      for (const row of rows) {
        const dCodeRaw = row['discipline_code'];
        const tCodeRaw = row['document_type_code'];
        const tNameRaw = row['document_type_name'];
        const drsRaw = row['drs'];
        
        if (dCodeRaw === undefined && tCodeRaw === undefined && tNameRaw === undefined) {
          continue;
        }
        
        const dCode = String(dCodeRaw || '').trim().toUpperCase();
        const tCode = String(tCodeRaw || '').trim().toUpperCase();
        const tName = String(tNameRaw || '').trim();
        const drs = String(drsRaw || '').trim();
        
        if (!dCode || !tCode || !tName) {
          continue;
        }

        const rowKey = `${dCode}__${tCode}__${tName.toLowerCase()}`;
        if (processedRows.has(rowKey)) {
          continue;
        }
        processedRows.add(rowKey);
        processedCount++;

        const discipline = codeToDiscipline[dCode];
        if (!discipline) {
          if (!missingDisciplines.includes(dCode)) {
            missingDisciplines.push(dCode);
          }
          continue;
        }

        const cleanExcelName = tName.trim().replace(/\s+/g, ' ').toLowerCase();
        const searchKey = `${tCode}__${cleanExcelName}`;
        const documentType = codeNameToDocumentType[searchKey];
        
        if (!documentType) {
          const typesWithSameCode = documentTypes.filter(dt => 
            (dt.code || '').trim().toUpperCase() === tCode
          );
          
          if (typesWithSameCode.length === 0) {
            if (!missingDocumentTypes.includes(tCode)) {
              missingDocumentTypes.push(tCode);
            }
          } else {
            const mismatchInfo = `${tCode} (${tName}) - в БД: ${typesWithSameCode.map(dt => dt.name_en || dt.name).join(', ')}`;
            if (!mismatchedNames.includes(mismatchInfo)) {
              mismatchedNames.push(mismatchInfo);
            }
          }
          continue;
        }

        matchedCount++;
        setSelectedDisciplines(prev => {
          if (!prev.includes(discipline.id)) {
            return [...prev, discipline.id];
          }
          return prev;
        });
        
        setDisciplineDocumentTypes(prev => {
          const arr = prev[discipline.id] || [];
          const existingItem = arr.find(item => item.documentTypeId === documentType.id);
          if (!existingItem) {
            return { ...prev, [discipline.id]: [...arr, { documentTypeId: documentType.id, drs: drs || undefined }] };
          }
          return prev;
        });
      }

      const warnings: string[] = [];
      if (missingDisciplines.length > 0) {
        warnings.push(`Не найдены дисциплины: ${missingDisciplines.join(', ')}`);
      }
      if (missingDocumentTypes.length > 0) {
        warnings.push(`Не найдены типы документов: ${missingDocumentTypes.join(', ')}`);
      }
      if (mismatchedNames.length > 0) {
        warnings.push(`Несовпадение названий: ${mismatchedNames.join('; ')}`);
      }
      
      setImportWarnings(warnings);
      
    } catch (e: any) {
      setError(t('createProject.messages.import_error'));
    }
  };

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
        aria-labelledby="edit-project-dialog-title"
        aria-describedby="edit-project-dialog-description"
        disablePortal={false}
        keepMounted={false}
        disableAutoFocus={false}
        disableEnforceFocus={false}
        disableRestoreFocus={false}
      >
        <DialogTitle id="edit-project-dialog-title">{t('project.edit')}</DialogTitle>
        <Box id="edit-project-dialog-description" sx={{ display: 'none' }}>
          {t('createProject.messages.dialog_description')}
        </Box>
        <DialogContent sx={{ 
          height: 700,
          p: isMobile ? 1 : 3
        }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {typeof error === 'string' ? error : JSON.stringify(error)}
            </Alert>
          )}
          
          {/* Tabs header */}
          <Tabs
            value={tabIndex}
            onChange={(_, v) => setTabIndex(v)}
            sx={{ 
              borderBottom: 1, 
              borderColor: 'divider', 
              mb: 2,
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

          {/* Tab 0: Основное */}
        {tabIndex === 0 && (
            <MainTab 
              formData={formData}
              setFormData={setFormData}
              codeValidation={{ isChecking: false, exists: false, message: '' }}
              setCodeValidation={() => {}} // Отключаем валидацию при редактировании
            />
          )}

          {/* Tab 1: Дисциплины и типы */}
          {tabIndex === 1 && (
            <DisciplinesTypesTab
              disciplines={disciplines}
              documentTypes={documentTypes}
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
              revisionDescriptions={revisionDescriptions}
              revisionSteps={revisionSteps}
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
              workflowPresets={workflowPresets}
              selectedWorkflowPreset={selectedWorkflowPreset}
              onWorkflowPresetChange={setSelectedWorkflowPreset}
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
              onDeleteProjectMember={handleDeleteProjectMember}
              onSaveProjectMember={handleSaveProjectMember}
              getRoleLabel={getRoleLabelLocalized}
              getRoleColor={getRoleColorLocalized}
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
              disciplines={disciplines}
              documentTypes={documentTypes}
              workflowPresets={workflowPresets}
              companies={companies}
              contacts={contacts}
              companyRoles={companyRoles}
              users={users}
              getRoleLabel={getRoleLabelLocalized}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>{t('common.cancel')}</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || !formData.name || selectedDisciplines.length === 0}
          >
            {loading ? t('createProject.creating') : t('common.save')}
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
            <FormControl fullWidth required>
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

            <FormControl fullWidth required>
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

            <FormControl fullWidth required>
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

            <FormControl fullWidth>
              <InputLabel>{t('createProject.fields.role')}</InputLabel>
              <Select
                value={projectMemberFormData.role}
                onChange={(e) => setProjectMemberFormData(prev => ({ ...prev, role: e.target.value }))}
                label={t('createProject.fields.role')}
              >
                <MenuItem value="admin">{t('createProject.roles.admin')}</MenuItem>
                <MenuItem value="operator">{t('createProject.roles.operator')}</MenuItem>
                <MenuItem value="viewer">{t('createProject.roles.viewer')}</MenuItem>
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
              role: 'viewer'
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
          documentTypes={foundDocumentTypes}
        />
    </LocalizationProvider>
  );
});

export default EditProjectDialog;