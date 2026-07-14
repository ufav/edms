import { useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Login from './components/Login';
import MarketingPage from './components/marketing/MarketingPage';
import Layout from './components/Layout';
import { SupportFab } from './components/support';
import Dashboard from './components/Dashboard';
import ProjectsPage from './components/ProjectsPage';
import DocumentsPage from './components/DocumentsPage';
import TransmittalsPage from './components/TransmittalsPage';
import ReviewsPage from './components/review/ReviewsPage';
import UsersPage from './components/UsersPage';
import WorkflowPresetsPage from './components/WorkflowPresetsPage';
import AuditLogsPage from './components/AuditLogsPage';
import CompaniesContactsPage from './components/CompaniesContactsPage';
import AdminRoutes from './pages/admin/AdminRoutes';
import { authApi, setAuthToken, removeAuthToken, setUnauthorizedHandler } from './api/client';
import { projectStore } from './stores/ProjectStore';
import { userStore } from './stores/UserStore';
import { settingsStore } from './stores/SettingsStore';
import referenceDataStore from './stores/ReferenceDataStore';
import { usePermissions } from './hooks/usePermissions';
import { ConnectionStatusProvider } from './contexts/ConnectionStatusContext';
import './i18n';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ full_name: string; email: string; role: string } | null>(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [tokenExpiryMs, setTokenExpiryMs] = useState<number | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const activityWindowMs = 5 * 60 * 1000; // 5 минут окна активности
  const refreshThresholdMs = 2 * 60 * 1000; // авто-рефреш за 2 минуты до истечения
  const permissions = usePermissions();

  // Загрузка пользователя при инициализации
  useEffect(() => {
    const checkAuth = async () => {
      // Проверяем, есть ли токен в localStorage
      const token = localStorage.getItem('token');
      if (token && !isAuthenticated) {
        try {
          // Пытаемся загрузить пользователя с существующим токеном
          await userStore.loadCurrentUser();
          if (userStore.currentUser) {
            setIsAuthenticated(true);
            setUser({ 
              full_name: userStore.currentUser.full_name,
              email: userStore.currentUser.email,
              role: userStore.currentUser.role 
            });
            // Загружаем справочные данные после успешной аутентификации
            referenceDataStore.loadAllReferenceData().catch(console.error);
          }
        } catch (error) {
          // Токен недействителен, очищаем его
          removeAuthToken();
          userStore.clearCurrentUser();
        }
      } else if (isAuthenticated) {
        userStore.loadCurrentUser().then(() => {
          setUser({ 
            full_name: userStore.currentUser?.full_name || '',
            email: userStore.currentUser?.email || '',
            role: userStore.currentUser?.role || '' 
          });
        });
      }
    };
    
    checkAuth();
  }, [isAuthenticated]);

  // Трекинг активности пользователя
  useEffect(() => {
    const markActive = () => { lastActivityRef.current = Date.now(); };
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'visibilitychange'];
    events.forEach(e => window.addEventListener(e, markActive, { passive: true }));
    return () => { events.forEach(e => window.removeEventListener(e, markActive)); };
  }, []);

  // Таймер авто-рефреша при активности
  useEffect(() => {
    // Register 401 handler: force logout and show login screen
    setUnauthorizedHandler(() => {
      removeAuthToken();
      setIsAuthenticated(false);
      setUser(null);
      setCurrentPage('dashboard');
      setTokenExpiryMs(null);
      projectStore.projects = [];
      projectStore.selectedProject = null;
      projectStore.error = null;
    });

    if (!isAuthenticated) return;
    const id = setInterval(async () => {
      if (!tokenExpiryMs) return;
      const now = Date.now();
      const timeLeft = tokenExpiryMs - now;
      const isActive = now - lastActivityRef.current <= activityWindowMs;
      if (timeLeft <= refreshThresholdMs && isActive) {
        try {
          const refreshed = await authApi.refresh();
          setAuthToken(refreshed.access_token);
          setTokenExpiryMs(Date.now() + refreshed.expires_in * 1000);
        } catch (err: any) {
          // Проверяем, это сетевая ошибка или реальная проблема с авторизацией
          const isNetworkError = !err?.response && (
            err?.code === 'ERR_NETWORK_IO_SUSPENDED' ||
            err?.code === 'ERR_NETWORK' ||
            err?.message === 'Network Error'
          );
          
          if (!isNetworkError) {
            // Только при реальной проблеме с авторизацией выходим
            handleLogout();
          }
          // При сетевых ошибках просто пропускаем этот refresh
          // Попробуем в следующий раз
        }
      }
    }, 30000); // каждые 30 секунд
    return () => clearInterval(id);
  }, [isAuthenticated, tokenExpiryMs]);

  const handleLogin = async (email: string, password: string) => {
    try {
      setLoginError(null);
      // Попытка входа через API (OAuth2 передаёт email в поле username)
      const response = await authApi.login(email, password);
      
      setAuthToken(response.access_token);
      setTokenExpiryMs(Date.now() + (response as any).expires_in * 1000);
      setIsAuthenticated(true);
      
      // Получаем информацию о пользователе с ролью
      await userStore.loadCurrentUser();
      setUser({ 
        full_name: userStore.currentUser?.full_name || '',
        email: userStore.currentUser?.email || '',
        role: userStore.currentUser?.role || '' 
      });
      
      // Загружаем проекты после успешной аутентификации
      await projectStore.loadProjects();
      
      // Загружаем глобальные настройки пользователя и автовыбираем последний проект
      const appSettings = await settingsStore.loadSettings('app');
      const lastId = appSettings?.last_project_id;
      if (lastId) {
        const found = projectStore.getProjectById(Number(lastId));
        if (found) {
          projectStore.selectProject(found);
        }
      }
      
      // Загружаем справочные данные
      await referenceDataStore.loadAllReferenceData();
      
      // Загружаем настройки пользователя
      await settingsStore.loadSettings('documents');
    } catch (error: any) {
      setLoginError(error?.response?.data?.detail || 'Ошибка входа в систему. Проверьте учетные данные.');
    }
  };

  const handleDemoLogin = async () => {
    try {
      setLoginError(null);
      const response = await authApi.demoLogin();

      setAuthToken(response.access_token);
      setTokenExpiryMs(Date.now() + response.expires_in * 1000);
      setIsAuthenticated(true);
      setCurrentPage('dashboard');

      await userStore.loadCurrentUser();
      setUser({
        full_name: userStore.currentUser?.full_name || '',
        email: userStore.currentUser?.email || '',
        role: userStore.currentUser?.role || '',
      });

      await projectStore.loadProjects(true);
      const demoProject = projectStore.getProjectById(response.project_id);
      if (demoProject) {
        projectStore.selectProject(demoProject);
      }

      await referenceDataStore.loadAllReferenceData();
      await settingsStore.loadSettings('documents');
    } catch (error: any) {
      setLoginError(
        error?.response?.data?.detail || 'Не удалось открыть демо. Попробуйте позже.'
      );
      throw error;
    }
  };

  const handleLogout = () => {
    removeAuthToken();
    setIsAuthenticated(false);
    setUser(null);
    setCurrentPage('dashboard');
    setTokenExpiryMs(null);
    setLoginError(null);

    // Очищаем проекты при выходе через action
    projectStore.clearProjects();
    
    // Очищаем настройки при выходе
    settingsStore.clearSettings();
    
    // Очищаем пользователя при выходе
    userStore.clearCurrentUser();
  };

  const handlePageChange = (page: string) => {
    setCurrentPage(page);
  };

  const handleProjectSelect = () => {
    // Здесь можно добавить дополнительную логику при выборе проекта
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'projects':
        return <ProjectsPage />;
      case 'documents':
        return <DocumentsPage />;
      case 'transmittals':
        return <TransmittalsPage />;
      case 'reviews':
        return <ReviewsPage />;
      case 'workflows':
        return <WorkflowPresetsPage />;
      case 'users':
        return permissions.canViewUsers ? <UsersPage /> : <Dashboard />;
      case 'audit-logs':
        return permissions.canViewAdmin ? <AuditLogsPage /> : <Dashboard />;
      case 'companies-contacts':
        return permissions.canViewAdmin ? <CompaniesContactsPage /> : <Dashboard />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ConnectionStatusProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          {isAuthenticated ? (
            <Routes>
              {/* Админские роуты */}
              <Route path="/admin/*" element={<AdminRoutes />} />

              {/* Основные роуты приложения - используем старую систему */}
              <Route path="/*" element={
                <Layout
                  currentPage={currentPage}
                  onPageChange={handlePageChange}
                  onLogout={handleLogout}
                  user={user}
                  onProjectSelect={handleProjectSelect}
                >
                  {renderPage()}
                </Layout>
              } />
            </Routes>
          ) : (
            <Routes>
              {/* Публичный лендинг */}
              <Route
                path="/"
                element={
                  <MarketingPage
                    onDemoLogin={handleDemoLogin}
                    demoError={loginError}
                  />
                }
              />
              {/* Страница входа */}
              <Route path="/signin" element={<Login onLogin={handleLogin} loginError={loginError} />} />
              {/* Остальные пути ведут на лендинг */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          )}
        </Router>
      </ConnectionStatusProvider>
    </ThemeProvider>
  );
}

export default App
