import React, { useState, useEffect } from 'react';
import { Menu, Select, Button } from 'antd';
import { observer } from 'mobx-react-lite';
import { authStore } from './stores/auth';
import { referenceStore } from './stores/reference';
import {
  TableOutlined,
  FileDoneOutlined,
  AreaChartOutlined,
  TeamOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons';

const { Option } = Select;

const items = [
  {
    label: 'Project Settings',
    key: 'project_settings',
    icon: <UserOutlined />,
  },
];

const ROLES = {
  ADMIN: 1,
  OPERATOR: 2,
  VIEWER: 3,
};

const MainMenu = observer(({ onMenuClick, onLogout, collapsed }) => {
  const [lastOpenKeys, setLastOpenKeys] = useState(authStore.openKeys);
  const [tempOpenKeys, setTempOpenKeys] = useState(authStore.openKeys);

  useEffect(() => {
    if (!collapsed) {
      authStore.setOpenKeys(lastOpenKeys);
      setTempOpenKeys(lastOpenKeys);
    } else {
      setTempOpenKeys([]);
    }
  }, [collapsed, lastOpenKeys]);

  const handleProjectChange = (projectId) => {
    authStore.setSelectedProjectId(projectId);
    referenceStore.loadReferences();
    authStore.setSelectedPage('document_register'); // Устанавливаем страницу
    onMenuClick({ key: 'document_register' }); // Вызываем загрузку данных
  };

  const handleMenuClick = ({ key }) => {
    authStore.setSelectedPage(key); // Устанавливаем выбранную страницу
    onMenuClick({ key }); // Передаем управление родительскому компоненту
  };

  const handleOpenChange = (keys) => {
    if (!collapsed) {
      authStore.setOpenKeys(keys);
      setLastOpenKeys(keys);
      setTempOpenKeys(keys);
    }
  };

  const isAdmin = authStore.role_id === ROLES.ADMIN;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          padding: '10px 10px 0 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          transition: 'justify-content 0.2s',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {!collapsed && (
          <div style={{ color: 'rgba(255, 255, 255, 0.65)', marginRight: 'auto' }}>
            {authStore.username}
          </div>
        )}
        <Button
          onClick={onLogout}
          icon={<LogoutOutlined />}
          type="primary"
          shape="square"
          size="middle"
          style={{ marginLeft: collapsed ? 0 : 'auto' }}
        />
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255, 255, 255, 0.65) #001529',
        }}
        className="custom-scrollbar"
      >
        <Menu
          theme="dark"
          selectedKeys={[authStore.selectedPage]}
          openKeys={tempOpenKeys}
          mode="inline"
          onClick={handleMenuClick}
          onOpenChange={handleOpenChange}
          style={{ borderRight: 0 }}
        >
          <Menu.Item key="select-project" icon={<UserOutlined />} title="Select Project">
            <Select
              value={authStore.selectedProjectId}
              placeholder="Select Project"
              style={{ width: '100%' }}
              onChange={handleProjectChange}
            >
              {authStore.projects.length > 0 ? (
                authStore.projects.map((project) => (
                  <Option key={project.id} value={project.id}>
                    {project.name}
                  </Option>
                ))
              ) : (
                <Option disabled value={null}>
                  Select Project
                </Option>
              )}
            </Select>
          </Menu.Item>
          <Menu.Item key="document_register" icon={<TableOutlined />}>
            Document Register
          </Menu.Item>
          <Menu.Item key="transmittals" icon={<FileDoneOutlined />}>
            Transmittals
          </Menu.Item>
          <Menu.Item key="reports" icon={<AreaChartOutlined />}>
            Reports
          </Menu.Item>
          {isAdmin && (
            <Menu.Item key="users_manage" icon={<TeamOutlined />}>
              User Settings
            </Menu.Item>
          )}
          {items.map((item) =>
            item.key !== 'users_manage' && (
              <Menu.Item key={item.key} icon={item.icon}>
                {item.label}
              </Menu.Item>
            )
          )}
        </Menu>
      </div>
    </div>
  );
});

export default MainMenu;