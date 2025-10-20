import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, theme } from 'antd';
import { observer } from 'mobx-react-lite';
import { authStore } from './stores/auth';
import MainMenu from './MainMenu';
import DocumentPage from './DocumentPage';
import Reports from './reports';
import ProjectPage from './ProjectPage';
import UserManage from './UserManage';
import Transmittals from './transmittals';
import './index.css';

const { Content, Sider } = Layout;

const Main = observer(() => {
  const navigate = useNavigate();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  useEffect(() => {
    const checkToken = async () => {
      if (authStore.isAuthenticated) {
        const isValid = await authStore.verifyToken();
        if (!isValid) {
          navigate('/', { replace: true });
        }
      } else {
        navigate('/', { replace: true });
      }
    };
    checkToken();
  }, [navigate]);

  const handleLogout = () => {
    authStore.clearUser();
    navigate('/', { replace: true });
  };

  const handleMenuClick = ({ key }) => {
    authStore.setSelectedPage(key);
  };

  const renderContent = () => {
    switch (authStore.selectedPage) {
      case 'document_register':
        return (
          <DocumentPage
            colorBgContainer={colorBgContainer}
            borderRadiusLG={borderRadiusLG}
          />
        );
      case 'transmittals':
        return <Transmittals />;
      case 'reports':
        return <Reports />;
      case 'project_settings':
        return <ProjectPage />;
      case 'users_manage':
        return <UserManage />;
      default:
        return <div>Select an option from the menu</div>;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={authStore.sidebarCollapsed}
        onCollapse={(value) => authStore.setSidebarCollapsed(value)}
        width={400}
        style={{ position: 'fixed', height: '100vh', left: 0 }}
      >
        <MainMenu onMenuClick={handleMenuClick} onLogout={handleLogout} collapsed={authStore.sidebarCollapsed} />
      </Sider>
      <Layout style={{ marginLeft: authStore.sidebarCollapsed ? 80 : 400, transition: 'margin-left 0.2s', height: '100vh' }}>
        <Content
          style={{
            overflowX: 'hidden',
            maxWidth: '100vw',
            width: 'auto',
          }}
        >
          {renderContent()}
        </Content>
      </Layout>
    </Layout>
  );
});

export default Main;