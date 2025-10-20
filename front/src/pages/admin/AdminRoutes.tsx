import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import AdminDashboard from './AdminDashboard';
import AdminUsers from './AdminUsers';
import AdminProjects from './AdminProjects';
import AdminDocuments from './AdminDocuments';
import AdminTransmittals from './AdminTransmittals';
import AdminWorkflows from './AdminWorkflows';
import AdminDisciplines from './AdminDisciplines';
import AdminSettings from './AdminSettings';

const AdminRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="projects" element={<AdminProjects />} />
        <Route path="documents" element={<AdminDocuments />} />
        <Route path="transmittals" element={<AdminTransmittals />} />
        <Route path="workflows" element={<AdminWorkflows />} />
        <Route path="disciplines" element={<AdminDisciplines />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
    </Routes>
  );
};

export default AdminRoutes;