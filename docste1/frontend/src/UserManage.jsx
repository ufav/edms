// UserManage.jsx
import React, { useState, useEffect } from 'react';
import { Table, Spin, Input, Checkbox, Button, Drawer, Form, Select, message, Alert, Card, Popconfirm } from 'antd';
import { EditOutlined, UserAddOutlined, CloseOutlined, PlusOutlined, SaveOutlined, DeleteOutlined } from '@ant-design/icons';
import { getUsers, getRoles, updateUser, getProjects, addUsersProjectAccess, removeUsersProjectAccess, getUserProjectAccess, registerUser, changePassword, deactivateUser } from './Datasources';
import { authStore } from './stores/auth';

const UserManage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roles, setRoles] = useState([]);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [filterText, setFilterText] = useState('');
  const [projects, setProjects] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchProjects();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const usersData = await getUsers();
      setUsers(usersData);
      setLoading(false);
    } catch (error) {
      setError(error);
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const rolesData = await getRoles();
      setRoles(rolesData);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const projectsData = await getProjects();
      setProjects(projectsData);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const handleEdit = async (user) => {
    try {
      setEditingUser(user);
      setIsCreating(false);
      setDrawerVisible(true);
      form.resetFields();
      form.setFieldsValue({
        role_id: user.role_id,
        name: user.name,
        surname: user.surname,
        email: user.email,
      });
      const response = await getUserProjectAccess(user.id);
      const projectIds = response.map((item) => item.project_id);
      setSelectedItems(projectIds);
      const sortedProjects = projects.sort((a, b) => {
        const aSelected = projectIds.includes(a.id);
        const bSelected = projectIds.includes(b.id);
        if (aSelected && !bSelected) return -1;
        if (!aSelected && bSelected) return 1;
        return 0;
      });
      setProjects([...sortedProjects]);
    } catch (error) {
      message.error('Failed to fetch user project access');
    }
  };

  const handleCreate = () => {
    setEditingUser(null);
    setIsCreating(true);
    setDrawerVisible(true);
    form.resetFields();
    setSelectedItems([]);
  };

  const handleDrawerClose = () => {
    setDrawerVisible(false);
    setEditingUser(null);
    setSelectedItems([]);
  };

  const handleSave = async (values) => {
    try {
      let hasChanges = false;
      let userId;

      if (editingUser) {
        userId = editingUser.id;

        if (
          values.role_id !== editingUser.role_id ||
          values.name !== editingUser.name ||
          values.surname !== editingUser.surname ||
          values.email !== editingUser.email
        ) {
          await updateUser(userId, {
            role_id: values.role_id,
            name: values.name,
            surname: values.surname,
            email: values.email,
          });
          hasChanges = true;
        }

        if (values.current_password) {
          if (values.new_password === values.confirm_new_password) {
            await changePassword({
              user_id: userId,
              current_password: values.current_password,
              new_password: values.new_password,
              confirm_new_password: values.confirm_new_password,
            });
            hasChanges = true;
          } else {
            message.error("New passwords do not match");
            return;
          }
        }

        const currentProjectAccess = await getUserProjectAccess(userId);
        const currentProjectIds = currentProjectAccess.map(item => item.project_id);

        const newProjectIds = selectedItems.filter(
          project_id => !currentProjectIds.includes(project_id)
        );

        const removedProjectIds = currentProjectIds.filter(
          project_id => !selectedItems.includes(project_id)
        );

        if (newProjectIds.length > 0) {
          const references = newProjectIds.map(project_id => ({
            user_id: userId,
            project_id,
          }));
          await addUsersProjectAccess(references);
          hasChanges = true;
        }

        if (removedProjectIds.length > 0) {
          await removeUsersProjectAccess(userId, removedProjectIds);
          hasChanges = true;
        }

        if (hasChanges) {
          message.success('User details updated successfully');
          setUsers(users.map(user =>
            user.id === userId ? { ...user, ...values, projects: selectedItems } : user
          ));

          if (userId === authStore.user_id) {
            await authStore.updateUserProjects();
          }
        } else {
          message.info('No changes made');
        }
      } else {
        const userData = {
          username: values.username,
          password: values.password,
          role_id: values.role_id,
          name: values.name,
          surname: values.surname,
          email: values.email,
        };

        const newUser = await registerUser(userData);
        userId = newUser.id;

        if (selectedItems.length > 0) {
          const references = selectedItems.map(project_id => ({
            user_id: userId,
            project_id,
          }));
          await addUsersProjectAccess(references);
        }

        message.success('User created successfully');
        setUsers([...users, { ...userData, id: userId, projects: selectedItems }]);

        if (userId === authStore.user_id) {
          await authStore.updateUserProjects();
        }
      }

      handleDrawerClose();
    } catch (error) {
      message.error(error.response?.data?.detail || 'Failed to save user details');
    }
  };

  const handleSearch = (e) => {
    setFilterText(e.target.value);
  };

  const handleCheckboxChange = (checkedValues) => {
    setSelectedItems(checkedValues);
  };

  const handleDelete = async (user) => {
    try {
      await deactivateUser(user.id);
      message.success('User deactivated successfully');
      fetchUsers();
    } catch (error) {
      message.error('Failed to deactivate user');
      console.log(error);
    }
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(filterText.toLowerCase())
  );

  const columns = [
    { title: '#', key: 'index', render: (text, record, index) => index + 1, width: '4%' },
    { title: 'Username', dataIndex: 'username', key: 'username', width: '15%' },
    { title: 'Role', dataIndex: 'role', key: 'role', width: '15%' },
    { title: 'Name', dataIndex: 'name', key: 'name', width: '15%' },
    { title: 'Surname', dataIndex: 'surname', key: 'surname', width: '15%' },
    { title: 'Email', dataIndex: 'email', key: 'email', width: '20%' },
    {
      title: 'Deactivate',
      key: 'action',
      width: '8%',
      render: (text, record) => (
        <Popconfirm
          title="Are you sure you want to deactivate this user?"
          onConfirm={() => handleDelete(record)}
          okText="Yes"
          cancelText="No"
        >
          <Button icon={<DeleteOutlined style={{ color: "red" }} />} />
        </Popconfirm>
      ),
    },
    {
      title: 'Edit',
      key: 'action',
      width: '8%',
      render: (text, record) => (
        <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
      ),
    },
  ];

  const projectColumns = [
    {
      dataIndex: 'select',
      render: (_, record) => (
        <Checkbox
          checked={selectedItems.includes(record.id)}
          onChange={(e) => handleCheckboxChange(e.target.checked
            ? [...selectedItems, record.id]
            : selectedItems.filter(id => id !== record.id))}
        />
      ),
    },
    { title: 'Number', dataIndex: 'number', key: 'number' },
    { title: 'Name', dataIndex: 'name', key: 'name' },
  ];

  if (loading) return <Spin tip="Loading..." />;
  if (error) return <Alert message="Error" description="Error fetching users" type="error" showIcon />;

  return (
    <div style={{ padding: 10, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Table
        dataSource={users}
        columns={columns}
        rowKey="id"
        pagination={{ pageSize: 10, showSizeChanger: false }}
      />

      <div style={{ textAlign: 'right', marginBottom: 16, marginRight: 8 }}>
        <Button type="primary" icon={<UserAddOutlined />} onClick={handleCreate}>
          Create User
        </Button>
      </div>

      <Drawer
        title={
          <div style={{ position: 'relative' }}>
            {editingUser ? "Edit User" : "Create User"}
            <div style={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)' }}>
              <Button
                type="primary"
                htmlType="submit"
                style={{ marginRight: 8 }}
                icon={editingUser ? <SaveOutlined /> : <PlusOutlined />}
                form="userForm"
              >
                {editingUser ? 'Save' : 'Create'}
              </Button>
              <Button onClick={handleDrawerClose} icon={<CloseOutlined />}>
                Cancel
              </Button>
            </div>
          </div>
        }
        width={600}
        onClose={handleDrawerClose}
        open={drawerVisible}
        style={{ paddingBottom: 80 }}
      >
        <Form
          id="userForm"
          form={form}
          layout="vertical"
          onFinish={handleSave}
          autoComplete="off"
          initialValues={editingUser ? { role_id: editingUser.role_id, name: editingUser.name, surname: editingUser.surname, email: editingUser.email } : {}}
        >
          {!editingUser && (
            <Card title="Username" bordered={false} style={{ marginBottom: 16, borderRadius: 8 }}>
              <Form.Item
                name="username"
                rules={[{ required: true, message: 'Please input the username!' }]}
              >
                <Input placeholder="Username" autoComplete="nope" />
              </Form.Item>
            </Card>
          )}

          {editingUser ? (
            <Card title="Change Password" bordered={false} style={{ marginBottom: 16, borderRadius: 8 }}>
              <Form.Item name="current_password" rules={[]}>
                <Input.Password placeholder="Current Password" autoComplete="nope" />
              </Form.Item>
              <Form.Item
                name="new_password"
                rules={[({ getFieldValue }) => ({
                  required: getFieldValue('current_password') ? true : false,
                  message: 'Please input the new password!',
                })]}
              >
                <Input.Password placeholder="New Password" autoComplete="nope" />
              </Form.Item>
              <Form.Item
                name="confirm_new_password"
                dependencies={['new_password']}
                hasFeedback
                rules={[
                  ({ getFieldValue }) => ({
                    required: getFieldValue('current_password') ? true : false,
                    message: 'Please confirm the new password!',
                  }),
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('new_password') === value) return Promise.resolve();
                      return Promise.reject(new Error('The two passwords do not match!'));
                    },
                  }),
                ]}
              >
                <Input.Password placeholder="Confirm New Password" autoComplete="nope" />
              </Form.Item>
            </Card>
          ) : (
            <Card title="Password" bordered={false} style={{ marginBottom: 16, borderRadius: 8 }}>
              <Form.Item
                name="password"
                rules={[{ required: true, message: 'Please input the password!' }]}
              >
                <Input.Password placeholder="Password" autoComplete="nope" />
              </Form.Item>
              <Form.Item
                name="confirm"
                dependencies={['password']}
                hasFeedback
                rules={[
                  { required: true, message: 'Please confirm the password!' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) return Promise.resolve();
                      return Promise.reject(new Error('The two passwords do not match!'));
                    },
                  }),
                ]}
              >
                <Input.Password placeholder="Confirm Password" autoComplete="nope" />
              </Form.Item>
            </Card>
          )}

          <Card title="Personal Info" bordered={false} style={{ marginBottom: 16, borderRadius: 8 }}>
            <Form.Item
              name="name"
              rules={[{ required: true, message: 'Please input the name!' }]}
            >
              <Input placeholder="Name" autoComplete="nope" />
            </Form.Item>
            <Form.Item
              name="surname"
              rules={[{ required: true, message: 'Please input the surname!' }]}
            >
              <Input placeholder="Surname" autoComplete="nope" />
            </Form.Item>
            <Form.Item
              name="email"
              rules={[
                { required: true, message: 'Please input the email!' },
                { type: 'email', message: 'Please enter a valid email!' },
              ]}
            >
              <Input placeholder="Email" autoComplete="nope" />
            </Form.Item>
          </Card>

          <Card title="Role" bordered={false} style={{ marginBottom: 16, borderRadius: 8 }}>
            <Form.Item
              name="role_id"
              rules={[{ required: true, message: 'Please select a role!' }]}
            >
              <Select placeholder="Please select a role">
                {roles.map(role => (
                  <Select.Option key={role.id} value={role.id}>
                    {role.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Card>

          <Card title="Project Access" bordered={false} style={{ marginBottom: 16, borderRadius: 8 }}>
            <Form.Item>
              <Input.Search
                placeholder="Search projects"
                onChange={handleSearch}
                style={{ marginBottom: 16 }}
              />
              <Table
                dataSource={filteredProjects}
                columns={projectColumns}
                rowKey="id"
                pagination={false}
                size="small"
              />
            </Form.Item>
          </Card>
        </Form>
      </Drawer>
    </div>
  );
};

export default UserManage;