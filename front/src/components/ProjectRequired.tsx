import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  Button
} from '@mui/material';
import { observer } from 'mobx-react-lite';
import { projectStore } from '../stores/ProjectStore';

interface ProjectRequiredProps {
  children: React.ReactNode;
}

const ProjectRequired: React.FC<ProjectRequiredProps> = observer(({ children }) => {
  if (!projectStore.hasSelectedProject) {
    return (
      <Box sx={{ width: '100%', p: 3 }}>
        <Card sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
          <CardContent sx={{ textAlign: 'center', p: 4 }}>
            <Alert severity="warning" sx={{ mb: 3 }}>
              Для работы с документами необходимо выбрать проект
            </Alert>
            
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              Выберите проект для продолжения работы
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Все документы, трансмитталы и ревью будут привязаны к выбранному проекту.
              Это поможет избежать ошибок и обеспечить правильную организацию данных.
            </Typography>

            <Button
              variant="contained"
              onClick={() => {
                // Открываем диалог выбора проекта
                const projectSelector = document.querySelector('[data-project-selector]') as HTMLElement;
                if (projectSelector) {
                  projectSelector.click();
                }
              }}
              sx={{ mt: 2 }}
            >
              Выбрать проект
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return <>{children}</>;
});

export default ProjectRequired;
