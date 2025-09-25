import { useState } from 'react';
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
import type { Project } from './stores/ProjectStore';
import { authApi, setAuthToken, removeAuthToken } from './api/client';
import { projectStore } from './stores/ProjectStore';

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

  const handleLogin = async (username: string, password: string) => {
    console.log('🔐 Attempting login with:', username);
    try {
      // Попытка входа через API
      console.log('📡 Making API login call...');
      const response = await authApi.login(username, password);
      console.log('✅ Login successful, token received');
      
      setAuthToken(response.access_token);
      setIsAuthenticated(true);
      
      // Получаем информацию о пользователе с ролью
      console.log('👤 Getting current user info...');
      const currentUser = await authApi.getCurrentUser();
      setUser({ username: currentUser.username, role: currentUser.role });
      console.log('✅ User authenticated:', { username: currentUser.username, role: currentUser.role });
      
      // Загружаем проекты после успешной аутентификации
      console.log('📋 Loading projects after authentication...');
      await projectStore.loadProjects();
      console.log('✅ Projects loaded successfully');
    } catch (error) {
      console.error('❌ Login failed:', error);
      alert('Ошибка входа в систему. Проверьте, что backend запущен и учетные данные правильные.');
    }
  };

  const handleLogout = () => {
    removeAuthToken();
    setIsAuthenticated(false);
    setUser(null);
    setCurrentPage('dashboard');
    
    // Очищаем проекты при выходе
    projectStore.projects = [];
    projectStore.selectedProject = null;
    projectStore.error = null;
  };

  const handlePageChange = (page: string) => {
    setCurrentPage(page);
  };

  const handleProjectSelect = (project: Project) => {
    console.log('Выбран проект:', project);
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
      case 'users':
        return <UsersPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {isAuthenticated ? (
        <Layout
          currentPage={currentPage}
          onPageChange={handlePageChange}
          onLogout={handleLogout}
          user={user}
          onProjectSelect={handleProjectSelect}
        >
          {renderPage()}
        </Layout>
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </ThemeProvider>
  );
}

export default App
