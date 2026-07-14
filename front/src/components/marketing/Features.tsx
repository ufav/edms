import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import MuiChip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';

import ViewQuiltRoundedIcon from '@mui/icons-material/ViewQuiltRounded';
import ArchitectureRoundedIcon from '@mui/icons-material/ArchitectureRounded';
import AssignmentTurnedInRoundedIcon from '@mui/icons-material/AssignmentTurnedInRounded';
import DevicesRoundedIcon from '@mui/icons-material/DevicesRounded';

import docsScreenshot from '../../assets/docs.png';
import dwgScreenshot from '../../assets/dwg.png';

type FeatureItem = {
  icon: React.ReactElement;
  title: string;
  description: string;
  image: string | null;
  imageAlt: string;
  /** wide screenshots fill the card; illustration keeps original compact size */
  imageLayout: 'wide' | 'illustration' | 'none';
};

const items: FeatureItem[] = [
  {
    icon: <ViewQuiltRoundedIcon />,
    title: 'Document management',
    description:
      'Keep every document version in a single registry with full change history, revisions and fast search.',
    image: docsScreenshot,
    imageAlt: 'Document registry in Docste',
    imageLayout: 'wide',
  },
  {
    icon: <ArchitectureRoundedIcon />,
    title: 'DWG viewer & markups',
    description:
      'Open DWG drawings right in the browser, review layers and leave markups — comments and annotations stay with the revision.',
    image: dwgScreenshot,
    imageAlt: 'DWG viewer with markups in Docste',
    imageLayout: 'wide',
  },
  {
    icon: <AssignmentTurnedInRoundedIcon />,
    title: 'Approvals & workflow',
    description:
      'Configure approval routes, track statuses and automate the release of your documents.',
    image: 'https://mui.com/static/images/templates/templates-images/mobile-light.png',
    imageAlt: 'Approvals and workflow illustration',
    imageLayout: 'illustration',
  },
  {
    icon: <DevicesRoundedIcon />,
    title: 'Available on any device',
    description:
      'Work with documents from a browser on desktop, tablet or phone — your data is always at hand.',
    image: null,
    imageAlt: '',
    imageLayout: 'none',
  },
];

interface ChipProps {
  selected?: boolean;
}

const Chip = styled(MuiChip, {
  shouldForwardProp: (prop) => prop !== 'selected',
})<ChipProps>(({ theme, selected }) => ({
  ...(selected && {
    background:
      'linear-gradient(to bottom right, hsl(210, 98%, 48%), hsl(210, 98%, 35%))',
    color: 'hsl(0, 0%, 100%)',
    borderColor: theme.palette.primary.light,
    '& .MuiChip-label': {
      color: 'hsl(0, 0%, 100%)',
    },
  }),
}));

function FeatureImage({ item }: { item: FeatureItem }) {
  if (!item.image || item.imageLayout === 'none') {
    return null;
  }

  if (item.imageLayout === 'illustration') {
    return (
      <Box
        component="img"
        src={item.image}
        alt={item.imageAlt}
        sx={{
          display: 'block',
          width: 'auto',
          height: 'auto',
          maxWidth: '100%',
          maxHeight: { xs: 320, sm: 460 },
          objectFit: 'contain',
          mx: 'auto',
          my: { xs: 2, sm: 3 },
        }}
      />
    );
  }

  return (
    <Box
      component="img"
      src={item.image}
      alt={item.imageAlt}
      sx={{
        display: 'block',
        width: '100%',
        height: 'auto',
      }}
    />
  );
}

interface MobileLayoutProps {
  selectedItemIndex: number;
  handleItemClick: (index: number) => void;
  selectedFeature: FeatureItem;
}

export function MobileLayout({
  selectedItemIndex,
  handleItemClick,
  selectedFeature,
}: MobileLayoutProps) {
  if (!items[selectedItemIndex]) {
    return null;
  }

  return (
    <Box
      sx={{
        display: { xs: 'flex', sm: 'none' },
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Box sx={{ display: 'flex', gap: 2, overflow: 'auto' }}>
        {items.map(({ title }, index) => (
          <Chip
            size="medium"
            key={index}
            label={title}
            onClick={() => handleItemClick(index)}
            selected={selectedItemIndex === index}
          />
        ))}
      </Box>
      <Card variant="outlined">
        {selectedFeature.image && selectedFeature.imageLayout !== 'none' && (
          <Box
            sx={{
              borderBottom: '1px solid',
              borderColor: 'divider',
              bgcolor: selectedFeature.imageLayout === 'illustration' ? 'grey.50' : 'transparent',
            }}
          >
            <FeatureImage item={selectedFeature} />
          </Box>
        )}
        <Box sx={{ px: 2, py: 2 }}>
          <Typography
            gutterBottom
            sx={{ color: 'text.primary', fontWeight: 'medium' }}
          >
            {selectedFeature.title}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
            {selectedFeature.description}
          </Typography>
        </Box>
      </Card>
    </Box>
  );
}

export default function Features() {
  const [selectedItemIndex, setSelectedItemIndex] = React.useState(0);

  const handleItemClick = (index: number) => {
    setSelectedItemIndex(index);
  };

  const selectedFeature = items[selectedItemIndex];
  const showPreview = Boolean(selectedFeature.image) && selectedFeature.imageLayout !== 'none';

  return (
    <Container id="features" sx={{ py: { xs: 8, sm: 16 } }}>
      <Box sx={{ width: { sm: '100%', md: '60%' } }}>
        <Typography
          component="h2"
          variant="h4"
          gutterBottom
          sx={{ color: 'text.primary' }}
        >
          Product features
        </Typography>
        <Typography
          variant="body1"
          sx={{ color: 'text.secondary', mb: { xs: 2, sm: 4 } }}
        >
          Everything you need to manage project documentation: from storage and
          versioning to DWG review, markups and approvals.
        </Typography>
      </Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row-reverse' },
          gap: 2,
          alignItems: { md: 'stretch' },
        }}
      >
        <Box sx={{ flex: { md: '0 0 38%' }, minWidth: 0 }}>
          <Box
            sx={{
              display: { xs: 'none', sm: 'flex' },
              flexDirection: 'column',
              gap: 2,
              height: '100%',
            }}
          >
            {items.map(({ icon, title, description }, index) => (
              <Box
                key={index}
                component={Button}
                onClick={() => handleItemClick(index)}
                sx={[
                  (theme) => ({
                    p: 2,
                    height: '100%',
                    width: '100%',
                    '&:hover': {
                      backgroundColor: theme.palette.action.hover,
                    },
                  }),
                  selectedItemIndex === index && {
                    backgroundColor: 'action.selected',
                  },
                ]}
              >
                <Box
                  sx={[
                    {
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: 1,
                      textAlign: 'left',
                      textTransform: 'none',
                      color: 'text.secondary',
                    },
                    selectedItemIndex === index && {
                      color: 'text.primary',
                    },
                  ]}
                >
                  {icon}

                  <Typography variant="h6">{title}</Typography>
                  <Typography variant="body2">{description}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
          <MobileLayout
            selectedItemIndex={selectedItemIndex}
            handleItemClick={handleItemClick}
            selectedFeature={selectedFeature}
          />
        </Box>
        <Box
          sx={{
            display: { xs: 'none', sm: 'flex' },
            flex: { md: '1 1 62%' },
            minWidth: 0,
            minHeight: { sm: 420 },
          }}
        >
          <Card
            variant="outlined"
            sx={{
              width: '100%',
              display: { xs: 'none', sm: 'flex' },
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              bgcolor: 'grey.50',
              pointerEvents: 'none',
            }}
          >
            {showPreview ? <FeatureImage item={selectedFeature} /> : null}
          </Card>
        </Box>
      </Box>
    </Container>
  );
}
