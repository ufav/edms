import { useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ProjectsPage from './components/ProjectsPage';
import DocumentsPage from './components/DocumentsPage';
import TransmittalsPage from './components/TransmittalsPage';
import ReviewsPage from './components/ReviewsPage';
import UsersPage from './components/UsersPage';
import WorkflowPresetsPage from './pages/WorkflowPresetsPage';
import AdminRoutes from './pages/admin/AdminRoutes';
import { authApi, setAuthToken, removeAuthToken, setUnauthorizedHandler } from './api/client';
import { projectStore } from './stores/ProjectStore';
import { userStore } from './stores/UserStore';
import { settingsStore } from './stores/SettingsStore';
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
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [tokenExpiryMs, setTokenExpiryMs] = useState<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const activityWindowMs = 5 * 60 * 1000; // 5 минут окна активности
  const refreshThresholdMs = 2 * 60 * 1000; // авто-рефреш за 2 минуты до истечения

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
        } catch (_err) {
          // refresh не удался — выходим из системы
          handleLogout();
        }
      }
    }, 30000); // каждые 30 секунд
    return () => clearInterval(id);
  }, [isAuthenticated, tokenExpiryMs]);

  const handleLogin = async (username: string, password: string) => {
    try {
      // Попытка входа через API
      const response = await authApi.login(username, password);
      
      setAuthToken(response.access_token);
      setTokenExpiryMs(Date.now() + (response as any).expires_in * 1000);
      setIsAuthenticated(true);
      
      // Получаем информацию о пользователе с ролью
      await userStore.loadCurrentUser();
      setUser({ username: userStore.currentUser?.username || '', role: userStore.currentUser?.role || '' });
      
      // Загружаем проекты после успешной аутентификации
      await projectStore.loadProjects();
      
      // Загружаем настройки пользователя
      await settingsStore.loadSettings('documents');
    } catch (error) {
      alert('Ошибка входа в систему. Проверьте, что backend запущен и учетные данные правильные.');
    }
  };

  const handleLogout = () => {
    removeAuthToken();
    setIsAuthenticated(false);
    setUser(null);
    setCurrentPage('dashboard');
    setTokenExpiryMs(null);

    // Очищаем проекты при выходе через action
    projectStore.clearProjects();
    
    // Очищаем настройки при выходе
    settingsStore.clearSettings();
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
        return user?.role === 'superadmin' ? <UsersPage /> : <Dashboard />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
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
          <Login onLogin={handleLogin} />
        )}
      </Router>
    </ThemeProvider>
  );
}

export default App
