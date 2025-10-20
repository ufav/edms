import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Typography, message } from 'antd';
import { getToken } from './Datasources';
import { observer } from 'mobx-react-lite';
import { authStore } from './stores/auth';
import './index.css';

const { Title } = Typography;

const LoginPage = observer(() => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    const { username, password } = values;

    try {
      const data = await getToken(username, password);
      authStore.setUser({
        token: data.access_token,
        username,
        user_id: data.id,
        role_id: data.role_id,
        expires_in: data.expires_in
      });
      console.log('Token saved:', localStorage.getItem('access_token'));
      navigate('/main');
      message.success('Login successful');
    } catch (error) {
      if (error.response && error.response.data && error.response.data.detail) {
        message.error(error.response.data.detail);
      } else {
        message.error('An error occurred. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Form
        name="login"
        onFinish={onFinish}
        layout="horizontal"
        className="login-form"
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 18 }}
      >
        <Title level={2} style={{ textAlign: 'center', width: '100%' }}>
          Login
        </Title>
        <Form.Item
          name="username"
          label="Username"
          rules={[{ required: true, message: 'Please enter your username!' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="password"
          label="Password"
          rules={[{ required: true, message: 'Please enter your password!' }]}
        >
          <Input.Password />
        </Form.Item>
        <Form.Item wrapperCol={{ offset: 6, span: 18 }}>
          <Button type="primary" htmlType="submit" loading={loading} block>
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
});

export default LoginPage;