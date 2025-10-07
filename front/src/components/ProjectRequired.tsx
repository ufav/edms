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
import { useTranslation } from 'react-i18next';

interface ProjectRequiredProps {
  children: React.ReactNode;
}

const ProjectRequired: React.FC<ProjectRequiredProps> = observer(({ children }) => {
  const { t } = useTranslation();
  
  if (!projectStore.hasSelectedProject) {
    return (
      <Box sx={{ width: '100%', p: 3 }}>
        <Card sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
          <CardContent sx={{ textAlign: 'center', p: 4 }}>
            <Alert severity="warning" sx={{ mb: 3 }}>
              {t('project.required.message')}
            </Alert>
            
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              {t('project.required.subtitle')}
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t('project.required.description')}
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
              {t('project.required.select_button')}
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return <>{children}</>;
});

export default ProjectRequired;
