import React, { useState, useEffect } from 'react';
import { Table, Spin, Alert, Button, Drawer, Form, Input, message, Card } from 'antd';
import { EditOutlined, PlusOutlined, SaveOutlined, CloseOutlined, FileAddOutlined } from '@ant-design/icons';
import { getProjects, createProject, addUsersProjectAccess } from './Datasources';
import ProjectSettings from './ProjectSettings';
import { authStore } from './stores/auth'; // Импортируем authStore

const ProjectPage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [form] = Form.useForm();

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const projectsData = await getProjects();
      setProjects(projectsData);
      setLoading(false);
    } catch (error) {
      setError(error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleEdit = (record) => {
    setSelectedProject(record);
    setIsModalVisible(true);
  };

  const handleCreate = () => {
    setIsDrawerVisible(true);
  };

  const handleDrawerClose = () => {
    setIsDrawerVisible(false);
    form.resetFields();
  };

  const handleSave = async (values) => {
    try {
      const response = await createProject(values);
      const projectId = response.project_id; // Предполагаем, что backend возвращает project_id
      message.success(response.message);
      await fetchProjects();

      // Назначаем проект текущему пользователю и обновляем список в Sidebar
      if (authStore.user_id) {
        const references = [{ user_id: authStore.user_id, project_id: projectId }];
        await addUsersProjectAccess(references);
        await authStore.updateUserProjects(); // Обновляем проекты в Sidebar
      }

      handleDrawerClose();
    } catch (error) {
      message.error('Failed to create project');
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setSelectedProject(null);
  };

  const columns = [
    {
      title: '#',
      key: 'index',
      render: (text, record, index) => index + 1,
    },
    {
      title: 'Number',
      dataIndex: 'number',
      key: 'number',
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Native Name',
      dataIndex: 'name_native',
      key: 'name_native',
    },
    {
      title: 'Edit',
      key: 'action',
      render: (text, record) => (
        <Button
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        />
      ),
    },
  ];

  if (loading) {
    return <Spin tip="Loading..." />;
  }

  if (error) {
    return <Alert message="Error" description="Error fetching projects" type="error" showIcon />;
  }

  return (
    <div style={{ padding: 10, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Table 
        dataSource={projects} 
        columns={columns} 
        rowKey="id"
        pagination={{ pageSize: 10, showSizeChanger: false }}
      />
      <div style={{ textAlign: 'right', marginBottom: 16, marginRight: 8 }}>
        <Button
          type="primary"
          icon={<FileAddOutlined />}
          onClick={handleCreate}
        >
          Create Project
        </Button>
      </div>
      <Drawer
        title={
          <div style={{ position: 'relative' }}>
            Create Project
            <div style={{
              position: 'absolute',
              right: 24,
              top: '50%',
              transform: 'translateY(-50%)',
            }}>
              <Button
                type="primary"
                style={{ marginRight: 8 }}
                icon={<SaveOutlined />}
                form="projectForm"
                htmlType="submit"
              >
                Save
              </Button>
              <Button
                onClick={handleDrawerClose}
                icon={<CloseOutlined />}
              >
                Cancel
              </Button>
            </div>
          </div>
        }
        width={600}
        onClose={handleDrawerClose}
        open={isDrawerVisible}
        style={{ paddingBottom: 80 }}
      >
        <Form
          id="projectForm"
          layout="vertical"
          onFinish={handleSave}
          form={form}
          autoComplete="off"
        >
          <Card bordered={false} style={{ borderRadius: 8 }}>
            <Form.Item
              name="number"
              rules={[{ required: true, message: 'Please enter the project number' }]}
              label={null}
            >
              <Input placeholder="Project Number" autoComplete="off" />
            </Form.Item>
            <Form.Item
              name="name"
              rules={[{ required: true, message: 'Please enter the project name' }]}
              label={null}
            >
              <Input placeholder="Project Name" autoComplete="off" />
            </Form.Item>
            <Form.Item
              name="name_native"
              label={null}
            >
              <Input placeholder="Project Native Name" autoComplete="off" />
            </Form.Item>
          </Card>
        </Form>
      </Drawer>
      <ProjectSettings
        isModalVisible={isModalVisible}
        selectedProject={selectedProject}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default ProjectPage;