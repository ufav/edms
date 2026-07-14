import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Drawer from '@mui/material/Drawer';
import MenuIcon from '@mui/icons-material/Menu';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import Sitemark from './SitemarkIcon';

const StyledToolbar = styled(Toolbar)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexShrink: 0,
  borderRadius: `calc(${theme.shape.borderRadius}px + 8px)`,
  border: '1px solid',
  borderColor: theme.palette.divider,
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[1],
  padding: '8px 12px',
}));

const navItems = [
  { label: 'Features', id: 'features' },
  { label: 'Highlights', id: 'highlights' },
];

export default function AppAppBar({
  onDemoLogin,
}: {
  onDemoLogin?: () => Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const [demoLoading, setDemoLoading] = React.useState(false);
  const navigate = useNavigate();

  const toggleDrawer = (newOpen: boolean) => () => {
    setOpen(newOpen);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
    setOpen(false);
  };

  const goToSignIn = () => {
    setOpen(false);
    navigate('/signin');
  };

  const handleDemo = async () => {
    if (!onDemoLogin || demoLoading) return;
    setDemoLoading(true);
    try {
      setOpen(false);
      await onDemoLogin();
    } catch {
      // ошибка показывается в Hero
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <AppBar
      position="fixed"
      enableColorOnDark
      sx={{
        boxShadow: 0,
        bgcolor: 'transparent',
        backgroundImage: 'none',
        mt: 'calc(var(--template-frame-height, 0px) + 28px)',
      }}
    >
      <Container maxWidth="lg">
        <StyledToolbar variant="dense" disableGutters>
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', px: 0 }}>
            <Sitemark />
            <Box
              sx={{
                display: { xs: 'none', md: 'flex' },
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              {navItems.map((item) => (
                <Button
                  key={item.id}
                  variant="text"
                  color="info"
                  size="small"
                  onClick={() => scrollToSection(item.id)}
                  sx={{ minWidth: 0, py: 0.75, lineHeight: 1.2 }}
                >
                  {item.label}
                </Button>
              ))}
            </Box>
          </Box>
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              gap: 1,
              alignItems: 'center',
            }}
          >
            <Button
              color="primary"
              variant="outlined"
              size="small"
              disabled={!onDemoLogin || demoLoading}
              onClick={handleDemo}
            >
              {demoLoading ? '…' : 'Demo'}
            </Button>
            <Button color="primary" variant="contained" size="small" onClick={goToSignIn}>
              Sign in
            </Button>
          </Box>
          <Box sx={{ display: { xs: 'flex', md: 'none' }, gap: 1 }}>
            <IconButton aria-label="Menu button" onClick={toggleDrawer(true)}>
              <MenuIcon />
            </IconButton>
            <Drawer
              anchor="top"
              open={open}
              onClose={toggleDrawer(false)}
              PaperProps={{
                sx: {
                  top: 'var(--template-frame-height, 0px)',
                },
              }}
            >
              <Box sx={{ p: 2, backgroundColor: 'background.default' }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                  }}
                >
                  <IconButton onClick={toggleDrawer(false)}>
                    <CloseRoundedIcon />
                  </IconButton>
                </Box>

                {navItems.map((item) => (
                  <MenuItem key={item.id} onClick={() => scrollToSection(item.id)}>
                    {item.label}
                  </MenuItem>
                ))}
                <Divider sx={{ my: 3 }} />
                <MenuItem>
                  <Button
                    color="primary"
                    variant="outlined"
                    fullWidth
                    disabled={!onDemoLogin || demoLoading}
                    onClick={handleDemo}
                  >
                    {demoLoading ? 'Opening…' : 'Demo'}
                  </Button>
                </MenuItem>
                <MenuItem>
                  <Button color="primary" variant="contained" fullWidth onClick={goToSignIn}>
                    Sign in
                  </Button>
                </MenuItem>
              </Box>
            </Drawer>
          </Box>
        </StyledToolbar>
      </Container>
    </AppBar>
  );
}
