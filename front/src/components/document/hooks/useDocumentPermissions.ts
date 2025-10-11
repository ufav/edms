import { canEditDocument } from '../../../hooks/usePermissions';
import type { Document as ApiDocument } from '../../../api/client';

interface UseDocumentPermissionsProps {
  document: ApiDocument | null;
}

export const useDocumentPermissions = ({
  document
}: UseDocumentPermissionsProps) => {
  
  // Проверка прав на редактирование документа
  const canEditCurrentDocument = () => {
    if (!document) return false;
    return canEditDocument(document);
  };

  // Проверка прав на отмену ревизии
  const canCancelRevision = (revision: any) => {
    if (!document) return false;
    
    // Только для последней активной ревизии
    const isLatestActive = revision.revision_status_id === 1;
    if (!isLatestActive) return false;
    
    // Проверяем права на редактирование документа
    return canEditCurrentDocument();
  };

  // Проверка прав на скачивание ревизии
  const canDownloadRevision = () => {
    // Все пользователи могут скачивать ревизии
    return true;
  };

  // Проверка прав на сравнение ревизий
  const canCompareRevisions = () => {
    // Все пользователи могут сравнивать ревизии
    return true;
  };

  // Проверка прав на создание новой ревизии
  const canCreateNewRevision = () => {
    if (!document) return false;
    return canEditCurrentDocument();
  };

  // Проверка прав на просмотр комментариев
  const canViewComments = () => {
    // Все пользователи могут просматривать комментарии
    return true;
  };

  // Проверка прав на создание комментариев
  const canCreateComments = () => {
    if (!document) return false;
    return canEditCurrentDocument();
  };

  return {
    // Функции проверки прав
    canEditCurrentDocument,
    canCancelRevision,
    canDownloadRevision,
    canCompareRevisions,
    canCreateNewRevision,
    canViewComments,
    canCreateComments,
  };
};
