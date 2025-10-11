import { useState } from 'react';
import { type Document as ApiDocument } from '../../../api/client';

export interface UseDocumentDialogsReturn {
  // Состояния диалогов
  batchUploadOpen: boolean;
  deleteDialogOpen: boolean;
  newRevisionOpen: boolean;
  documentDetailsOpen: boolean;
  compareOpen: boolean;
  workflowOpen: boolean;
  commentsOpen: boolean;
  
  // Состояния для workflow
  selectedDocumentForWorkflow: ApiDocument | null;
  workflowTemplates: any[];
  workflowStatus: any;
  
  // Сеттеры диалогов
  setBatchUploadOpen: (open: boolean) => void;
  setDeleteDialogOpen: (open: boolean) => void;
  setNewRevisionOpen: (open: boolean) => void;
  setDocumentDetailsOpen: (open: boolean) => void;
  setCompareOpen: (open: boolean) => void;
  setWorkflowOpen: (open: boolean) => void;
  setCommentsOpen: (open: boolean) => void;
  
  // Сеттеры для workflow
  setSelectedDocumentForWorkflow: (document: ApiDocument | null) => void;
  setWorkflowStatus: (status: any) => void;
  
  // Обработчики открытия диалогов
  handleOpenBatchUpload: () => void;
  handleOpenDeleteDialog: () => void;
  handleOpenNewRevision: () => void;
  handleOpenDocumentDetails: () => void;
  handleOpenCompare: () => void;
  handleOpenWorkflow: () => void;
  handleOpenComments: () => void;
  
  // Обработчики закрытия диалогов
  handleCloseBatchUpload: () => void;
  handleCloseDeleteDialog: () => void;
  handleCloseNewRevision: () => void;
  handleCloseDocumentDetails: () => void;
  handleCloseCompare: () => void;
  handleCloseWorkflow: () => void;
  handleCloseComments: () => void;
  
  // Обработчики для workflow
  handleCloseWorkflowWithReset: () => void;
}

export const useDocumentDialogs = (): UseDocumentDialogsReturn => {
  // Состояния диалогов
  const [batchUploadOpen, setBatchUploadOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newRevisionOpen, setNewRevisionOpen] = useState(false);
  const [documentDetailsOpen, setDocumentDetailsOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  
  // Состояния для workflow
  const [selectedDocumentForWorkflow, setSelectedDocumentForWorkflow] = useState<ApiDocument | null>(null);
  const [workflowTemplates] = useState<any[]>([]);
  const [workflowStatus, setWorkflowStatus] = useState<any>(null);

  // Обработчики открытия диалогов
  const handleOpenBatchUpload = () => setBatchUploadOpen(true);
  const handleOpenDeleteDialog = () => setDeleteDialogOpen(true);
  const handleOpenNewRevision = () => setNewRevisionOpen(true);
  const handleOpenDocumentDetails = () => setDocumentDetailsOpen(true);
  const handleOpenCompare = () => setCompareOpen(true);
  const handleOpenWorkflow = () => setWorkflowOpen(true);
  const handleOpenComments = () => setCommentsOpen(true);

  // Обработчики закрытия диалогов
  const handleCloseBatchUpload = () => setBatchUploadOpen(false);
  const handleCloseDeleteDialog = () => setDeleteDialogOpen(false);
  const handleCloseNewRevision = () => setNewRevisionOpen(false);
  const handleCloseDocumentDetails = () => setDocumentDetailsOpen(false);
  const handleCloseCompare = () => setCompareOpen(false);
  const handleCloseWorkflow = () => setWorkflowOpen(false);
  const handleCloseComments = () => setCommentsOpen(false);

  // Обработчик закрытия workflow с сбросом состояния
  const handleCloseWorkflowWithReset = () => {
    setWorkflowOpen(false);
    setWorkflowStatus(null);
    setSelectedDocumentForWorkflow(null);
  };

  return {
    // Состояния диалогов
    batchUploadOpen,
    deleteDialogOpen,
    newRevisionOpen,
    documentDetailsOpen,
    compareOpen,
    workflowOpen,
    commentsOpen,
    
    // Состояния для workflow
    selectedDocumentForWorkflow,
    workflowTemplates,
    workflowStatus,
    
    // Сеттеры диалогов
    setBatchUploadOpen,
    setDeleteDialogOpen,
    setNewRevisionOpen,
    setDocumentDetailsOpen,
    setCompareOpen,
    setWorkflowOpen,
    setCommentsOpen,
    
    // Сеттеры для workflow
    setSelectedDocumentForWorkflow,
    setWorkflowStatus,
    
    // Обработчики открытия
    handleOpenBatchUpload,
    handleOpenDeleteDialog,
    handleOpenNewRevision,
    handleOpenDocumentDetails,
    handleOpenCompare,
    handleOpenWorkflow,
    handleOpenComments,
    
    // Обработчики закрытия
    handleCloseBatchUpload,
    handleCloseDeleteDialog,
    handleCloseNewRevision,
    handleCloseDocumentDetails,
    handleCloseCompare,
    handleCloseWorkflow,
    handleCloseComments,
    
    // Обработчики для workflow
    handleCloseWorkflowWithReset,
  };
};
