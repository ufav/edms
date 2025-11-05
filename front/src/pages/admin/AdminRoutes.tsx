import React, { useEffect } from 'react';

const AdminRoutes: React.FC = () => {
  useEffect(() => {
    // Берём базовый URL API из env (как в api/client.ts)
    const apiBase = (import.meta as any)?.env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
    // Обрезаем /api/v1 → берём корень бэкенда
    const backendRoot = apiBase.replace(/\/?api\/v1\/?$/, '');
    const adminUrl = `${backendRoot}/admin`;
    window.location.href = adminUrl;
  }, []);

  return null;
};

export default AdminRoutes;