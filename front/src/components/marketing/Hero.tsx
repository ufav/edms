import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';
import demoScreenshot from '../../assets/demo.png';

const StyledBox = styled('div')(({ theme }) => ({
  alignSelf: 'center',
  width: '100%',
  marginTop: theme.spacing(8),
  borderRadius: theme.shape.borderRadius,
  outline: '6px solid',
  outlineColor: 'hsla(220, 25%, 80%, 0.2)',
  border: '1px solid',
  borderColor: theme.palette.grey[200],
  boxShadow: '0 0 12px 8px hsla(220, 25%, 80%, 0.2)',
  overflow: 'hidden',
  lineHeight: 0,
  backgroundColor: theme.palette.grey[50],
  [theme.breakpoints.up('sm')]: {
    marginTop: theme.spacing(10),
  },
  '& img': {
    display: 'block',
    width: '100%',
    height: 'auto',
  },
}));

interface HeroProps {
  onDemoLogin?: () => Promise<void>;
  demoError?: string | null;
}

export default function Hero({ onDemoLogin, demoError }: HeroProps) {
  const navigate = useNavigate();
  const [demoLoading, setDemoLoading] = useState(false);

  const handleDemo = async () => {
    if (!onDemoLogin || demoLoading) return;
    setDemoLoading(true);
    try {
      await onDemoLogin();
    } catch {
      // ошибка показывается через demoError из App
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <Box
      id="hero"
      sx={{
        width: '100%',
        backgroundRepeat: 'no-repeat',
        backgroundImage:
          'radial-gradient(ellipse 80% 50% at 50% -20%, hsl(210, 100%, 90%), transparent)',
      }}
    >
      <Container
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pt: { xs: 14, sm: 20 },
          pb: { xs: 8, sm: 12 },
        }}
      >
        <Stack
          spacing={2}
          useFlexGap
          sx={{ alignItems: 'center', width: { xs: '100%', sm: '70%' } }}
        >
          <Typography
            variant="h1"
            sx={{
              textAlign: 'center',
              fontSize: { xs: '2.25rem', sm: '3rem', md: '3.5rem' },
              lineHeight: 1.15,
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}
          >
            Electronic document{' '}
            <Box component="span" sx={{ color: 'primary.main' }}>
              management
            </Box>
          </Typography>
          <Typography
            sx={{
              textAlign: 'center',
              color: 'text.secondary',
              width: { sm: '100%', md: '80%' },
            }}
          >
            Docste is a single platform for managing project documentation:
            versions, approvals, transmittals and audit in one place. Speed up your
            team and never lose a document again.
          </Typography>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            useFlexGap
            sx={{ pt: 2, width: { xs: '100%', sm: '420px' } }}
          >
            <Button
              variant="contained"
              color="primary"
              size="large"
              fullWidth
              onClick={() => navigate('/signin')}
            >
              Sign in
            </Button>
            <Button
              variant="outlined"
              color="primary"
              size="large"
              fullWidth
              disabled={!onDemoLogin || demoLoading}
              onClick={handleDemo}
            >
              {demoLoading ? 'Opening…' : 'Demo'}
            </Button>
          </Stack>
          {demoError && (
            <Alert severity="error" sx={{ width: '100%', maxWidth: 480 }}>
              {demoError}
            </Alert>
          )}
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', textAlign: 'center' }}
          >
            By clicking &quot;Sign in&quot; you agree to our&nbsp;
            <Link href="#" color="primary">
              Terms &amp; Conditions
            </Link>
            .
          </Typography>
        </Stack>
        <StyledBox id="image">
          <img src={demoScreenshot} alt="Docste interface" />
        </StyledBox>
      </Container>
    </Box>
  );
}
