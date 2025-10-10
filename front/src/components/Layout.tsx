import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Badge,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle,
  Folder as ProjectIcon,
  Description as DocumentIcon,
  Send as TransmittalIcon,
  RateReview as ReviewIcon,
  People as UserIcon,
  Dashboard as DashboardIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  AccountTree as WorkflowIcon,
} from '@mui/icons-material';
import ProjectSelector from './ProjectSelector';
import ProfileDialog from './ProfileDialog';
import { useTranslation } from 'react-i18next';
import { observer } from 'mobx-react-lite';
import { projectStore } from '../stores/ProjectStore';
import { userStore } from '../stores/UserStore';
import { usePermissions } from '../hooks/usePermissions';
import type { Project } from '../stores/ProjectStore';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
  onLogout: () => void;
  user: { username: string; role: string } | null;
  onProjectSelect: (project: Project) => void;
}

const Layout: React.FC<LayoutProps> = observer(({ 
  children, 
  currentPage, 
  onPageChange, 
  onLogout, 
  user,
  onProjectSelect
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { t, i18n } = useTranslation();
  const permissions = usePermissions();

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const menuItems = [
    { id: 'dashboard', label: t('menu.dashboard'), icon: <DashboardIcon /> },
    { id: 'projects', label: t('menu.projects'), icon: <ProjectIcon /> },
    { id: 'documents', label: t('menu.documents'), icon: <DocumentIcon /> },
    { id: 'transmittals', label: t('menu.transmittals'), icon: <TransmittalIcon /> },
    { id: 'reviews', label: t('menu.reviews'), icon: <ReviewIcon /> },
    ...(permissions.canViewWorkflows ? [{ id: 'workflows', label: t('menu.workflows'), icon: <WorkflowIcon /> }] : []),
    ...(permissions.canViewUsers ? [{ id: 'users', label: t('menu.users'), icon: <UserIcon /> }] : []),
    ...(permissions.canViewAdmin ? [
      { id: 'admin', label: 'Админка', icon: <SettingsIcon />, external: true }
    ] : []),
  ];

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Docste
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.id}
            onClick={() => {
              if (item.external) {
                window.location.href = '/admin';
              } else {
                onPageChange(item.id);
              }
              setMobileOpen(false);
            }}
            selected={currentPage === item.id}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          backgroundColor: '#1976d2',
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {t('app.title')}
          </Typography>

          {/* Project Selector */}
          <Box sx={{ mr: 2 }}>
            <ProjectSelector onProjectSelect={onProjectSelect} />
          </Box>

          {/* Desktop Navigation */}
          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 1 }}>
                {menuItems.map((item) => (
                  <Button
                    key={item.id}
                    color="inherit"
                    onClick={() => {
                      if (item.external) {
                        window.location.href = '/admin';
                      } else {
                        onPageChange(item.id);
                      }
                    }}
                    sx={{
                      backgroundColor: currentPage === item.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                      },
                    }}
                  >
                    {item.icon}
                    <Typography sx={{ ml: 1 }}>{item.label}</Typography>
                  </Button>
                ))}
              </Box>
          )}

          {/* User Menu */}
          <Box sx={{ ml: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
            >
              <AccountCircle />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
              PaperProps={{
                sx: { minWidth: 200 }
              }}
            >
              <MenuItem disabled>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    {user?.username || 'Гость'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {userStore.currentUser?.role === 'admin' ? 'Администратор' : 
                     userStore.currentUser?.role === 'operator' ? 'Оператор' : 
                     userStore.currentUser?.role === 'viewer' ? 'Читатель' : 'Пользователь'}
                  </Typography>
                </Box>
              </MenuItem>
              <MenuItem onClick={() => { handleClose(); setProfileOpen(true); }}>
                <ListItemIcon>
                  <AccountCircle fontSize="small" />
                </ListItemIcon>
                <ListItemText>{t('menu.profile')}</ListItemText>
              </MenuItem>
              <Divider />
              <MenuItem onClick={() => {
                handleClose();
                const next = i18n.language === 'ru' ? 'en' : 'ru';
                i18n.changeLanguage(next);
                try { localStorage.setItem('lang', next); } catch {}
              }}>
                <ListItemIcon>
                  <DashboardIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>{t('menu.language')}: {i18n.language === 'ru' ? t('lang.en') : t('lang.ru')}</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => {
                handleClose();
                onLogout();
              }}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>{t('menu.logout')}</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 240 },
          }}
        >
          {drawer}
        </Drawer>
      )}

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: '100%',
          mt: '64px',
          backgroundColor: '#ffffff',
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        {children}
      </Box>

      {/* Profile Dialog */}
      <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} username={user?.username || undefined} />
    </Box>
  );
});

export default Layout;
