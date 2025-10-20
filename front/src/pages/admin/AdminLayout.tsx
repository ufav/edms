import React, { useState } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  useTheme,
  useMediaQuery,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Business as BusinessIcon,
  Description as DescriptionIcon,
  Category as CategoryIcon,
  Settings as SettingsIcon,
  AccountCircle as AccountCircleIcon,
  Notifications as NotificationsIcon,
  Logout as LogoutIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Storage as StorageIcon,
  AccountTree as WorkflowIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { userStore } from '../../stores/UserStore';

const drawerWidth = 280;
const collapsedDrawerWidth = 64;

const menuItems = [
  { 
    text: 'admin.dashboard', 
    icon: <DashboardIcon />, 
    path: '/admin',
    color: '#1976d2'
  },
  { 
    text: 'admin.users', 
    icon: <PeopleIcon />, 
    path: '/admin/users',
    color: '#2e7d32'
  },
  { 
    text: 'admin.projects', 
    icon: <BusinessIcon />, 
    path: '/admin/projects',
    color: '#ed6c02'
  },
  { 
    text: 'admin.documents', 
    icon: <DescriptionIcon />, 
    path: '/admin/documents',
    color: '#9c27b0'
  },
  { 
    text: 'admin.transmittals', 
    icon: <SendIcon />, 
    path: '/admin/transmittals',
    color: '#d32f2f'
  },
  { 
    text: 'admin.workflows', 
    icon: <WorkflowIcon />, 
    path: '/admin/workflows',
    color: '#00695c'
  },
  { 
    text: 'admin.disciplines', 
    icon: <CategoryIcon />, 
    path: '/admin/disciplines',
    color: '#5d4037'
  },
  { 
    text: 'admin.settings', 
    icon: <SettingsIcon />, 
    path: '/admin/settings',
    color: '#424242'
  },
];

const AdminLayout: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [drawerCollapsed, setDrawerCollapsed] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerToggle = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setDrawerCollapsed(!drawerCollapsed);
    }
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    userStore.logout();
    navigate('/login');
  };

  const currentDrawerWidth = isMobile ? drawerWidth : (drawerCollapsed ? collapsedDrawerWidth : drawerWidth);

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo/Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: drawerCollapsed ? 'center' : 'flex-start',
          minHeight: 64,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        {!drawerCollapsed && (
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            EDMS Admin
          </Typography>
        )}
        {drawerCollapsed && (
          <StorageIcon color="primary" sx={{ fontSize: 28 }} />
        )}
      </Box>

      {/* Navigation */}
      <List sx={{ flex: 1, px: 1, py: 2 }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => navigate(item.path)}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  backgroundColor: isActive ? `${item.color}15` : 'transparent',
                  border: isActive ? `1px solid ${item.color}30` : '1px solid transparent',
                  '&:hover': {
                    backgroundColor: `${item.color}10`,
                    border: `1px solid ${item.color}20`,
                  },
                  transition: 'all 0.2s ease-in-out',
                  minHeight: 48,
                  px: drawerCollapsed ? 1.5 : 2,
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: drawerCollapsed ? 'auto' : 40,
                    color: isActive ? item.color : 'text.secondary',
                    justifyContent: 'center',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {!drawerCollapsed && (
                  <ListItemText
                    primary={t(item.text)}
                    sx={{
                      '& .MuiListItemText-primary': {
                        fontWeight: isActive ? 600 : 400,
                        color: isActive ? item.color : 'text.primary',
                        fontSize: '0.9rem',
                      },
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* User Info */}
      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <ListItemButton
          onClick={handleProfileMenuOpen}
          sx={{
            borderRadius: 2,
            p: 1.5,
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        >
          <Avatar
            sx={{
              width: drawerCollapsed ? 32 : 40,
              height: drawerCollapsed ? 32 : 40,
              mr: drawerCollapsed ? 0 : 2,
              bgcolor: 'primary.main',
            }}
          >
            {userStore.currentUser?.username?.charAt(0).toUpperCase()}
          </Avatar>
          {!drawerCollapsed && (
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, truncate: true }}>
                {userStore.currentUser?.full_name || userStore.currentUser?.username}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {userStore.currentUser?.role}
              </Typography>
            </Box>
          )}
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${currentDrawerWidth}px)` },
          ml: { md: `${currentDrawerWidth}px` },
          backgroundColor: 'background.paper',
          color: 'text.primary',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="toggle drawer"
            onClick={handleDrawerToggle}
            edge="start"
            sx={{ mr: 2 }}
          >
            {isMobile ? <MenuIcon /> : (drawerCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />)}
          </IconButton>
          
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            {t('admin.title')}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton color="inherit">
              <Badge badgeContent={3} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
            
            <Chip
              label={t('admin.system_status')}
              color="success"
              size="small"
              sx={{ mr: 1 }}
            />
          </Box>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: currentDrawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={isMobile ? mobileOpen : true}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: currentDrawerWidth,
              borderRight: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'background.paper',
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${currentDrawerWidth}px)` },
          height: '100vh',
          overflow: 'auto',
          backgroundColor: 'grey.50',
        }}
      >
        <Toolbar />
        <Box sx={{ p: 3 }}>
          <Outlet />
        </Box>
      </Box>

      {/* Profile Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleProfileMenuClose}>
          <ListItemIcon>
            <AccountCircleIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('admin.profile')}</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('admin.logout')}</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default AdminLayout;
