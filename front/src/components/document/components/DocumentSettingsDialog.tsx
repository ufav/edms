import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Button,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
} from '@mui/material';
import {
  DragIndicator as DragIndicatorIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface ColumnVisibility {
  title: boolean;
  number: boolean;
  file: boolean;
  size: boolean;
  revision: boolean;
  status: boolean;
  language: boolean;
  drs: boolean;
  date: boolean;
  updated_at: boolean;
  created_by: boolean;
  discipline: boolean;
  document_type: boolean;
  actions: boolean;
}

export type ColumnKey = keyof ColumnVisibility;

export interface ColumnOrder {
  column: ColumnKey;
  order: number;
}

interface SortableColumnItemProps {
  column: ColumnOrder;
  visibleCols: ColumnVisibility;
  onColumnVisibilityChange: (column: keyof ColumnVisibility, checked: boolean) => void;
  t: (key: string) => string;
}

const SortableColumnItem: React.FC<SortableColumnItemProps> = ({ 
  column, 
  visibleCols, 
  onColumnVisibilityChange, 
  t 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.column });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getColumnLabel = (columnKey: ColumnKey) => {
    switch (columnKey) {
      case 'title': return t('documents.columns.title');
      case 'number': return t('documents.columns.number');
      case 'file': return t('documents.columns.file');
      case 'size': return t('documents.columns.size');
      case 'revision': return t('documents.columns.revision');
      case 'status': return t('documents.columns.status');
      case 'language': return t('documents.columns.language');
      case 'drs': return 'DRS';
      case 'date': return t('documents.columns.created_at');
      case 'updated_at': return t('documents.columns.updated_at');
      case 'created_by': return t('documents.columns.created_by');
      case 'discipline': return t('documents.columns.discipline');
      case 'document_type': return t('documents.columns.document_type');
      case 'actions': return t('common.actions');
      default: return columnKey;
    }
  };

  // Не показываем actions и checkbox в списке для перетаскивания
  if (column.column === 'actions') {
    return null;
  }

  return (
    <ListItem
      ref={setNodeRef}
      style={style}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        mb: 1,
        bgcolor: 'background.paper',
        '&:hover': {
          bgcolor: 'action.hover',
        },
      }}
    >
      <IconButton
        {...attributes}
        {...listeners}
        size="small"
        sx={{ mr: 1, cursor: 'grab' }}
      >
        <DragIndicatorIcon />
      </IconButton>
      <ListItemText primary={getColumnLabel(column.column)} />
      <ListItemSecondaryAction>
        <FormControlLabel
          control={
            <Checkbox
              checked={visibleCols[column.column] ?? true}
              onChange={(e) => onColumnVisibilityChange(column.column, e.target.checked)}
            />
          }
          label=""
        />
      </ListItemSecondaryAction>
    </ListItem>
  );
};

export interface DocumentSettingsDialogProps {
  // Состояние диалога
  open: boolean;
  
  // Настройки колонок
  visibleCols: ColumnVisibility;
  columnOrder: ColumnOrder[];
  
  // Обработчики
  onClose: () => void;
  onColumnVisibilityChange: (column: keyof ColumnVisibility, checked: boolean) => void;
  onColumnOrderChange: (newOrder: ColumnOrder[]) => void;
}

export const DocumentSettingsDialog: React.FC<DocumentSettingsDialogProps> = ({
  open,
  visibleCols,
  columnOrder,
  onClose,
  onColumnVisibilityChange,
  onColumnOrderChange,
}) => {
  const { t } = useTranslation();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = columnOrder.findIndex(item => item.column === active.id);
      const newIndex = columnOrder.findIndex(item => item.column === over.id);

      const newOrder = arrayMove(columnOrder, oldIndex, newIndex);
      
      // Обновляем порядок в массиве
      const updatedOrder = newOrder.map((item, index) => ({
        ...item,
        order: index + 1
      }));

      onColumnOrderChange(updatedOrder);
    }
  };

  // Фильтруем колонки, исключая actions (он всегда справа)
  const sortableColumns = columnOrder.filter(col => col.column !== 'actions');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{t('documents.settings') || 'Настройки таблицы'}</DialogTitle>
      <DialogContent sx={{
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: '#f1f1f1',
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#c1c1c1',
          borderRadius: '4px',
          '&:hover': {
            background: '#a8a8a8',
          },
        },
      }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Фиксированные колонки */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              {t('documents.settings.fixed_columns')}
            </Typography>
            <FormGroup>
              <FormControlLabel 
                control={
                  <Checkbox 
                    checked={true} 
                    disabled
                  />
                } 
                label={t('documents.settings.checkbox_column')} 
                sx={{ opacity: 0.7 }}
              />
              <FormControlLabel 
                control={
                  <Checkbox 
                    checked={visibleCols.actions ?? true} 
                    onChange={(e) => onColumnVisibilityChange('actions', e.target.checked)} 
                  />
                } 
                label={t('documents.settings.actions_column')} 
              />
            </FormGroup>
          </Box>

          <Divider />

          {/* Перетаскиваемые колонки */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              {t('documents.settings.sortable_columns')}
            </Typography>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortableColumns.map(col => col.column)}
                strategy={verticalListSortingStrategy}
              >
                <List>
                  {sortableColumns.map((column) => (
                    <SortableColumnItem
                      key={column.column}
                      column={column}
                      visibleCols={visibleCols}
                      onColumnVisibilityChange={onColumnVisibilityChange}
                      t={t}
                    />
                  ))}
                </List>
              </SortableContext>
            </DndContext>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
      </DialogActions>
    </Dialog>
  );
};
