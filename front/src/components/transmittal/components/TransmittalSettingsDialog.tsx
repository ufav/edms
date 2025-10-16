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
  Tabs,
  Tab,
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
import { TransmittalImportSettings } from './TransmittalImportSettings';

export interface TransmittalColumnVisibility {
  number: boolean;
  title: boolean;
  direction: boolean;
  counterparty: boolean;
  status: boolean;
  date: boolean;
  created_by: boolean;
  actions: boolean;
}

export type TransmittalColumnKey = keyof TransmittalColumnVisibility;

export interface TransmittalColumnOrder {
  column: TransmittalColumnKey;
  order: number;
}

// Компонент для перетаскиваемого элемента
const SortableColumnItem: React.FC<{
  column: TransmittalColumnOrder;
  visibleCols: TransmittalColumnVisibility;
  onColumnVisibilityChange: (column: TransmittalColumnKey, visible: boolean) => void;
  t: (key: string) => string;
}> = ({ column, visibleCols, onColumnVisibilityChange, t }) => {
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

  const getColumnLabel = (columnKey: TransmittalColumnKey) => {
    switch (columnKey) {
      case 'number': return t('transmittals.columns.number');
      case 'title': return t('transmittals.columns.title');
      case 'direction': return t('transmittals.columns.direction');
      case 'counterparty': return t('transmittals.columns.counterparty');
      case 'status': return t('transmittals.columns.status');
      case 'date': return t('transmittals.columns.date');
      case 'created_by': return t('transmittals.columns.created_by');
      case 'actions': return t('common.actions');
      default: return columnKey;
    }
  };

  // Не показываем actions в списке для перетаскивания
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

export interface TransmittalSettingsDialogProps {
  open: boolean;
  visibleCols: TransmittalColumnVisibility;
  columnOrder: TransmittalColumnOrder[];
  onClose: () => void;
  onColumnVisibilityChange: (column: TransmittalColumnKey, visible: boolean) => void;
  onColumnOrderChange: (newOrder: TransmittalColumnOrder[]) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`transmittal-settings-tabpanel-${index}`}
      aria-labelledby={`transmittal-settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export const TransmittalSettingsDialog: React.FC<TransmittalSettingsDialogProps> = ({
  open,
  visibleCols,
  columnOrder,
  onClose,
  onColumnVisibilityChange,
  onColumnOrderChange,
}) => {
  const { t } = useTranslation();
  const [tabValue, setTabValue] = React.useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = columnOrder.findIndex((item) => item.column === active.id);
      const newIndex = columnOrder.findIndex((item) => item.column === over?.id);

      const newOrder = arrayMove(columnOrder, oldIndex, newIndex);
      
      // Обновляем порядок
      const updatedOrder = newOrder.map((item, index) => ({
        ...item,
        order: index + 1,
      }));

      onColumnOrderChange(updatedOrder);
    }
  };

  const sortableColumns = columnOrder.filter(col => col.column !== 'actions');

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      scroll="paper"
    >
      <DialogTitle>{t('transmittals.settings.title')}</DialogTitle>

      <Box sx={{ 
        position: 'sticky',
        top: 0,
        zIndex: 1,
        backgroundColor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
        px: 3,
        pt: 3
      }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
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
          <Tab 
            label={t('transmittals.settings.fields_tab')} 
            id="transmittal-settings-tab-0"
            aria-controls="transmittal-settings-tabpanel-0"
          />
          <Tab 
            label={t('transmittals.import_settings.title')} 
            id="transmittal-settings-tab-1"
            aria-controls="transmittal-settings-tabpanel-1"
          />
        </Tabs>
      </Box>

      <DialogContent sx={{ 
        height: 700,
        p: 0,
        display: 'flex',
        flexDirection: 'column',
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
        {/* Вкладка 1: Настройки полей */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Фиксированные колонки */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                {t('transmittals.settings.fixed_columns')}
              </Typography>
              <FormGroup>
                <FormControlLabel 
                  control={
                    <Checkbox 
                      checked={visibleCols.actions ?? true} 
                      onChange={(e) => onColumnVisibilityChange('actions', e.target.checked)} 
                    />
                  } 
                  label={t('transmittals.settings.actions_column')} 
                />
              </FormGroup>
            </Box>

            <Divider />

            {/* Перетаскиваемые колонки */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                {t('transmittals.settings.sortable_columns')}
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
        </TabPanel>

        {/* Вкладка 2: Настройки импорта трансмитталов */}
        <TabPanel value={tabValue} index={1}>
          <TransmittalImportSettings onClose={onClose} />
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
      </DialogActions>
    </Dialog>
  );
};