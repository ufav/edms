import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Card,
  CardContent,
  CardHeader
} from '@mui/material';
import { useTranslation } from 'react-i18next';

interface RevisionsTabProps {
  revisionDescriptions: any[];
  revisionSteps: any[];
  selectedRevisionDescriptions: number[];
  selectedRevisionSteps: number[];
  onRevisionDescriptionToggle: (id: number) => void;
  onRevisionStepToggle: (id: number) => void;
  getRevisionDescriptionName: (rd: any) => string;
  getRevisionStepName: (rs: any) => string;
}

const RevisionsTab: React.FC<RevisionsTabProps> = ({
  revisionDescriptions,
  revisionSteps,
  selectedRevisionDescriptions,
  selectedRevisionSteps,
  onRevisionDescriptionToggle,
  onRevisionStepToggle,
  getRevisionDescriptionName,
  getRevisionStepName
}) => {
  const { t } = useTranslation();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Revision Descriptions */}
      <Card variant="outlined">
        <CardHeader
          title={t('createProject.sections.revision_descriptions')}
        />
        <CardContent>
          <Box sx={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: 1, 
            maxHeight: 200, 
            overflow: 'auto',
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
            {revisionDescriptions
              .sort((a, b) => a.code.localeCompare(b.code))
              .map((revisionDescription) => (
              <Chip
                key={revisionDescription.id}
                label={`${revisionDescription.code} - ${getRevisionDescriptionName(revisionDescription)}`}
                variant={
                  selectedRevisionDescriptions.includes(revisionDescription.id)
                    ? 'filled'
                    : 'outlined'
                }
                color={
                  selectedRevisionDescriptions.includes(revisionDescription.id)
                    ? 'primary'
                    : 'default'
                }
                onClick={() => onRevisionDescriptionToggle(revisionDescription.id)}
                clickable
              />
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Revision Steps */}
      <Card variant="outlined">
        <CardHeader
          title={t('createProject.sections.revision_steps')}
        />
        <CardContent>
          <Box sx={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: 1, 
            maxHeight: 200, 
            overflow: 'auto',
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
            {revisionSteps.map((revisionStep) => (
              <Chip
                key={revisionStep.id}
                label={`${revisionStep.code} - ${getRevisionStepName(revisionStep)}`}
                variant={
                  selectedRevisionSteps.includes(revisionStep.id)
                    ? 'filled'
                    : 'outlined'
                }
                color={
                  selectedRevisionSteps.includes(revisionStep.id)
                    ? 'primary'
                    : 'default'
                }
                onClick={() => onRevisionStepToggle(revisionStep.id)}
                clickable
              />
            ))}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default RevisionsTab;
