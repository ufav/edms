import { useState } from 'react';

export interface UseDeleteDialogReturn {
  // Состояние диалога
  isOpen: boolean;
  isLoading: boolean;
  
  // Данные для удаления
  itemToDelete: any;
  
  // Сеттеры
  setIsOpen: (open: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setItemToDelete: (item: any) => void;
  
  // Обработчики
  openDeleteDialog: (item: any) => void;
  closeDeleteDialog: () => void;
  confirmDelete: (onConfirm: (item: any) => Promise<void> | void) => Promise<void>;
  
  // Пропсы для ConfirmDialog
  getDialogProps: (config: {
    title: string;
    content: string;
    confirmText?: string;
    cancelText?: string;
  }) => {
    open: boolean;
    title: string;
    content: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => Promise<void>;
    onClose: () => void;
    loading: boolean;
  };
}

export const useDeleteDialog = (): UseDeleteDialogReturn => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);

  const openDeleteDialog = (item: any) => {
    setItemToDelete(item);
    setIsOpen(true);
  };

  const closeDeleteDialog = () => {
    setIsOpen(false);
    setItemToDelete(null);
    setIsLoading(false);
  };

  const confirmDelete = async (onConfirm: (item: any) => Promise<void> | void) => {
    if (!itemToDelete) return;
    
    setIsLoading(true);
    try {
      await onConfirm(itemToDelete);
      closeDeleteDialog();
    } catch (error) {
      console.error('Error during delete:', error);
      // Не закрываем диалог при ошибке, чтобы пользователь мог повторить попытку
    } finally {
      setIsLoading(false);
    }
  };

  const getDialogProps = (config: {
    title: string;
    content: string;
    confirmText?: string;
    cancelText?: string;
  }) => ({
    open: isOpen,
    title: config.title,
    content: config.content,
    confirmText: config.confirmText || 'Удалить',
    cancelText: config.cancelText || 'Отмена',
    onConfirm: () => confirmDelete(() => {}), // Будет переопределено при использовании
    onClose: closeDeleteDialog,
    loading: isLoading,
  });

  return {
    isOpen,
    isLoading,
    itemToDelete,
    setIsOpen,
    setIsLoading,
    setItemToDelete,
    openDeleteDialog,
    closeDeleteDialog,
    confirmDelete,
    getDialogProps,
  };
};
