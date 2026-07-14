import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  DescriptionRounded as DescriptionRoundedIcon,
  Send as TransmittalIcon,
  RateReview as ReviewIcon,
  People as UserIcon,
  Dashboard as DashboardIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  AccountTree as WorkflowIcon,
  History as HistoryIcon,
  Support as SupportIcon,
  Notifications as NotificationsIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import ProjectSelector from './ProjectSelector';
import ProfileDialog from './ProfileDialog';
import NotificationsDialog from './NotificationsDialog';
import { SupportFab, SupportTicketsListDialog, SupportChatDialog, SupportTicketDialog } from './support';
import { notificationsApi } from '../api/client';
import { useTranslation } from 'react-i18next';
import { observer } from 'mobx-react-lite';
import { projectStore } from '../stores/ProjectStore';
import { userStore } from '../stores/UserStore';
import { reviewStore } from '../stores/ReviewStore';
import { usePermissions } from '../hooks/usePermissions';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { TransmittalCartModal, useActiveRevisions } from './transmittal';
import { transmittalCartStore } from '../stores/TransmittalCartStore';
import { transmittalStore } from '../stores/TransmittalStore';
import type { Project } from '../stores/ProjectStore';
import SitemarkIcon from './marketing/SitemarkIcon';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
  onLogout: () => void;
  user: { full_name: string; email: string; role: string } | null;
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
  const [notificationsAnchorEl, setNotificationsAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [supportTicketsOpen, setSupportTicketsOpen] = useState(false);
  const [createTicketOpen, setCreateTicketOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { t, i18n } = useTranslation();
  const permissions = usePermissions();
  const { isViewer } = useCurrentUser();
  const { activeRevisions } = useActiveRevisions();

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleNotificationsMenu = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationsAnchorEl(event.currentTarget);
    setNotificationsOpen(true);
    // Обновляем счетчик при открытии диалога
    notificationsApi.getUnreadCount().then(setUnreadNotificationsCount).catch((error: any) => {
      if (error?.response?.status !== 401) console.error(error);
    });
  };

  // Функция для обновления позиции индикатора
  const updateIndicator = () => {
    if (!menuRef.current) return;

    const activeButton = menuRef.current.querySelector(`[data-page="${currentPage}"]`) as HTMLElement;
    if (activeButton) {
      const menuRect = menuRef.current.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();

      setIndicatorStyle({
        left: buttonRect.left - menuRect.left,
        width: buttonRect.width,
      });
    }
  };

  // Обновляем позицию индикатора при изменении активной страницы
  useEffect(() => {
    updateIndicator();
  }, [currentPage]);

  // Обновляем позицию индикатора при смене языка (меняется ширина пунктов меню)
  useEffect(() => {
    updateIndicator();
  }, [i18n.language]);

  // Обновляем позицию при изменении размера окна
  useEffect(() => {
    const handleResize = () => updateIndicator();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentPage]);

  // Обновляем позицию индикатора при смене проекта
  useEffect(() => {
    updateIndicator();
  }, [projectStore.selectedProject]);

  // Загружаем количество непрочитанных уведомлений
  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 3;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let hasAuthError = false;

    const loadUnreadCount = async () => {
      // Проверяем, есть ли токен перед запросом
      const token = localStorage.getItem('token');
      if (!token) {
        hasAuthError = true;
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        return;
      }

      // Если была ошибка авторизации, не продолжаем опрос
      if (hasAuthError) {
        return;
      }

      try {
        const count = await notificationsApi.getUnreadCount();
        if (isMounted) {
          setUnreadNotificationsCount(count);
          retryCount = 0; // Сбрасываем счетчик при успехе
          hasAuthError = false;
        }
      } catch (error: any) {
        if (!isMounted) return;
        
        const status = error?.response?.status;
        const errorCode = error?.code;
        
        // Если 401 и это не сетевая ошибка, останавливаем опрос
        if (status === 401) {
          // Проверяем, это реальная проблема с авторизацией или сетевая ошибка
          const isNetworkError = errorCode === 'ERR_NETWORK_IO_SUSPENDED' ||
                                errorCode === 'ERR_NETWORK' ||
                                !error.response;
          
          if (!isNetworkError) {
            // Реальная проблема с авторизацией - останавливаем опрос
            hasAuthError = true;
            if (intervalId) {
              clearInterval(intervalId);
              intervalId = null;
            }
            return;
          }
        }
        
        // Для сетевых ошибок - retry с экспоненциальной задержкой
        if (retryCount < maxRetries && (
          errorCode === 'ERR_NETWORK_IO_SUSPENDED' ||
          errorCode === 'ERR_NETWORK' ||
          !error.response
        )) {
          retryCount++;
          const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
          setTimeout(() => {
            if (isMounted && !hasAuthError) {
              loadUnreadCount();
            }
          }, delay);
        } else if (status !== 401) {
          // Логируем только не-401 ошибки
          console.error('Error loading unread notifications count:', error);
        }
      }
    };

    loadUnreadCount();
    
    // Обновляем каждые 30 секунд, но только если нет проблем с авторизацией
    intervalId = setInterval(() => {
      // Проверяем, есть ли токен и нет ли ошибки авторизации перед опросом
      const token = localStorage.getItem('token');
      if (token && !hasAuthError) {
        loadUnreadCount();
      }
    }, 30000);
    
    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  // Обновляем счетчик при открытии диалога уведомлений
  useEffect(() => {
    if (notificationsOpen) {
      notificationsApi.getUnreadCount().then(setUnreadNotificationsCount).catch((error: any) => {
        if (error?.response?.status !== 401) console.error(error);
      });
    }
  }, [notificationsOpen]);

  // Загружаем ревью при изменении проекта
  useEffect(() => {
    if (projectStore.selectedProject?.id) {
      reviewStore.loadReviews(projectStore.selectedProject.id);
    }
  }, [projectStore.selectedProject?.id]);

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const menuItems = useMemo(() => {
    const pendingReviewsCount = reviewStore.reviews.length;
    return [
      { id: 'dashboard', label: t('menu.dashboard'), icon: <DashboardIcon /> },
      { id: 'projects', label: t('menu.projects'), icon: <ProjectIcon /> },
      { id: 'documents', label: t('menu.documents'), icon: <DocumentIcon /> },
      { id: 'transmittals', label: t('menu.transmittals'), icon: <TransmittalIcon /> },
      {
        id: 'reviews',
        label: t('menu.reviews'),
        icon: (
          <Badge badgeContent={pendingReviewsCount > 0 ? pendingReviewsCount : undefined} color="error">
            <ReviewIcon />
          </Badge>
        )
      },
      ...(permissions.canViewWorkflows ? [{ id: 'workflows', label: t('menu.workflows'), icon: <WorkflowIcon /> }] : []),
      ...(permissions.canViewUsers ? [{ id: 'users', label: t('menu.users'), icon: <UserIcon /> }] : []),
      ...(permissions.canViewAdmin ? [
        { id: 'audit-logs', label: t('menu.audit_logs'), icon: <HistoryIcon /> },
        { id: 'companies-contacts', label: t('menu.companies_contacts'), icon: <BusinessIcon /> },
      ] : []),
    ];
  }, [t, reviewStore.reviews.length, permissions.canViewWorkflows, permissions.canViewUsers, permissions.canViewAdmin]);

  // Обновляем заголовок вкладки браузера в зависимости от текущего раздела
  useEffect(() => {
    const currentItem = menuItems.find(item => item.id === currentPage);
    const sectionTitle = currentItem ? currentItem.label : 'Docste';
    document.title = `${sectionTitle} - Docste`;
  }, [currentPage, t]);

  const drawer = (
    <Box>
      <Toolbar>
        <SitemarkIcon />
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.id}
            onClick={() => {
              onPageChange(item.id);
              setMobileOpen(false);
            }}
            selected={currentPage === item.id}
            sx={{
              backgroundColor: currentPage === item.id ? 'primary.main' : 'transparent',
              color: currentPage === item.id ? 'white' : 'inherit',
              '&:hover': {
                backgroundColor: currentPage === item.id ? 'primary.dark' : 'action.hover',
                color: currentPage === item.id ? 'white' : 'inherit',
              },
              '& .MuiListItemIcon-root': {
                color: currentPage === item.id ? 'white' : 'inherit',
              },
              '& .MuiListItemText-primary': {
                fontWeight: currentPage === item.id ? 600 : 400,
              },
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{
      display: 'flex',
      minHeight: '100vh',
      width: '100%',
      minWidth: 0
    }}>
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

          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, minWidth: 0 }}>
            <DescriptionRoundedIcon sx={{ fontSize: 28, mr: 0.75, flexShrink: 0 }} />
            <Typography
              variant="h6"
              component="div"
              noWrap
              sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}
            >
              {t('app.title')}
            </Typography>
          </Box>

          {/* Project Selector */}
          <Box sx={{ mr: 2 }}>
            <ProjectSelector onProjectSelect={onProjectSelect} />
          </Box>

          {/* Desktop Navigation */}
          {!isMobile && (
            <Box
              ref={menuRef}
              sx={{
                display: 'flex',
                gap: 1,
                position: 'relative',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  bottom: 0,
                  left: indicatorStyle.left,
                  width: indicatorStyle.width,
                  height: '3px',
                  backgroundColor: 'white',
                  borderRadius: '2px 2px 0 0',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  zIndex: 1,
                }
              }}
            >
              {menuItems.map((item) => (
                <Button
                  key={item.id}
                  data-page={item.id}
                  color="inherit"
                  onClick={() => {
                    onPageChange(item.id);
                  }}
                  sx={{
                    backgroundColor: currentPage === item.id ? 'rgba(255,255,255,0.2)' : 'transparent',
                    borderRadius: '4px 4px 0 0',
                    fontWeight: currentPage === item.id ? 600 : 400,
                    position: 'relative',
                    zIndex: 2,
                    '&:hover': {
                      backgroundColor: currentPage === item.id ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
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
            {/* Notifications Button */}
            <IconButton
              size="large"
              aria-label="notifications"
              onClick={handleNotificationsMenu}
              color="inherit"
            >
              <Badge badgeContent={unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>

            {/* Profile Button */}
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
                    {(userStore.currentUser?.full_name || user?.full_name || userStore.currentUser?.email || user?.email || 'Гость')}
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
              <MenuItem onClick={() => { handleClose(); setSupportTicketsOpen(true); }}>
                <ListItemIcon>
                  <SupportIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>{t('support.my_tickets') || 'Мои обращения'}</ListItemText>
              </MenuItem>
              {permissions.canViewAdmin && (
                <MenuItem onClick={() => {
                  handleClose();
                  window.open('/admin', '_blank');
                }}>
                  <ListItemIcon>
                    <SettingsIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>{t('admin.title')}</ListItemText>
                </MenuItem>
              )}
              <Divider />
              <MenuItem onClick={() => {
                handleClose();
                const next = i18n.language === 'ru' ? 'en' : 'ru';
                i18n.changeLanguage(next);
                try { localStorage.setItem('lang', next); } catch { }
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
          minWidth: 0,
          mt: '64px',
          backgroundColor: '#ffffff',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {children}
      </Box>

      {/* Profile Dialog */}
      <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />

      {/* Notifications Popover */}
      <NotificationsDialog
        open={notificationsOpen}
        anchorEl={notificationsAnchorEl}
        onClose={() => {
          setNotificationsOpen(false);
          setNotificationsAnchorEl(null);
          // Обновляем счетчик при закрытии
          notificationsApi.getUnreadCount().then(setUnreadNotificationsCount).catch((error: any) => {
            if (error?.response?.status !== 401) console.error(error);
          });
        }}
        onNotificationClick={(notification) => {
          // Если уведомление связано с тикетом, открываем чат с этим тикетом
          if (notification.related_entity_type === 'support_ticket' && notification.related_entity_id) {
            setNotificationsOpen(false);
            setNotificationsAnchorEl(null);
            setSelectedTicketId(notification.related_entity_id);
            setChatOpen(true);
          }
        }}
        onUnreadCountChange={(count) => {
          setUnreadNotificationsCount(count);
        }}
      />

      {/* Support Tickets Dialog */}
      <SupportTicketsListDialog
        open={supportTicketsOpen}
        onClose={() => setSupportTicketsOpen(false)}
        onCreateNew={() => {
          setSupportTicketsOpen(false);
          setCreateTicketOpen(true);
        }}
      />

      {/* Support Ticket Create Dialog */}
      <SupportTicketDialog
        open={createTicketOpen}
        onClose={() => setCreateTicketOpen(false)}
        onSuccess={() => {
          setCreateTicketOpen(false);
          // Обновляем список тикетов, если он открыт
          if (supportTicketsOpen) {
            // Можно добавить обновление списка здесь, если нужно
          }
        }}
      />

      {/* Support Chat Dialog - для открытия конкретного тикета */}
      {selectedTicketId !== null && (
        <SupportChatDialog
          open={chatOpen}
          ticketId={selectedTicketId}
          onClose={() => {
            setChatOpen(false);
            setSelectedTicketId(null);
          }}
        />
      )}

      {/* Support FAB - только для создания нового тикета */}
      <SupportFab />

      {/* Кнопка открытия корзины трансмитталов в правом нижнем углу */}
      {!cartModalOpen && transmittalCartStore.selectedCount > 0 && !isViewer && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 130, // Выше SupportFab (который на bottom: 60)
            right: 24,
            zIndex: 1000,
          }}
        >
          <Badge badgeContent={transmittalCartStore.selectedCount} color="primary">
            <IconButton
              onClick={() => setCartModalOpen(true)}
              sx={{
                backgroundColor: 'primary.main',
                color: 'white',
                width: 56,
                height: 56,
                boxShadow: 3,
                '&:hover': {
                  backgroundColor: 'primary.dark',
                  boxShadow: 6,
                },
              }}
              title={t('documents.open_transmittal_cart')}
            >
              <TransmittalIcon />
            </IconButton>
          </Badge>
        </Box>
      )}

      {/* Модалка корзины трансмитталов */}
      <TransmittalCartModal
        open={cartModalOpen}
        selectedRevisionIds={transmittalCartStore.selectedRevisionIds}
        activeRevisions={activeRevisions || []}
        isLoading={transmittalCartStore.isLoading}
        error={transmittalCartStore.error}
        onClose={() => setCartModalOpen(false)}
        onRemoveRevision={transmittalCartStore.removeRevision}
        onClearAll={transmittalCartStore.clearAll}
        onCreateTransmittal={async (transmittalData) => {
          if (projectStore.selectedProject) {
            await transmittalCartStore.createTransmittal(transmittalData, projectStore.selectedProject.id);
            setCartModalOpen(false);
            // Обновляем список трансмитталов
            await transmittalStore.loadTransmittals(projectStore.selectedProject.id, true);
          }
        }}
        formatFileSize={(bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`}
        formatDate={(date: string) => new Date(date).toLocaleDateString()}
      />
    </Box>
  );
});

export default Layout;
// {/* Support Chat Dialog - для открытия конкретного тикета */}