import React, { useState, useEffect } from 'react';
import { rolesApi, type UserRole, type ProjectRole } from '../api/client';
import { SYSTEM_ROLES, PROJECT_ROLES } from '../types/roles';

interface RolesManagementProps {
  onClose: () => void;
}

export const RolesManagement: React.FC<RolesManagementProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'system' | 'project'>('system');
  const [systemRoles, setSystemRoles] = useState<UserRole[]>([]);
  const [projectRoles, setProjectRoles] = useState<ProjectRole[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const [systemRolesData, projectRolesData] = await Promise.all([
        rolesApi.getUserRoles(),
        rolesApi.getProjectRoles()
      ]);
      setSystemRoles(systemRolesData);
      setProjectRoles(projectRolesData);
    } catch (error) {
      console.error('Ошибка при загрузке ролей:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleDisplayName = (role: UserRole | ProjectRole) => {
    return role.name_en || role.name;
  };

  const getRoleDescription = (role: UserRole | ProjectRole) => {
    return role.description || 'Описание не указано';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Управление ролями</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Табы */}
          <div className="flex space-x-1 mb-6">
            <button
              onClick={() => setActiveTab('system')}
              className={`px-4 py-2 rounded-md font-medium ${
                activeTab === 'system'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Системные роли
            </button>
            <button
              onClick={() => setActiveTab('project')}
              className={`px-4 py-2 rounded-md font-medium ${
                activeTab === 'project'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Проектные роли
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {activeTab === 'system' && (
                <div>
                  <h3 className="text-lg font-medium mb-4">Системные роли</h3>
                  <div className="grid gap-4">
                    {systemRoles.map((role) => (
                      <div key={role.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {getRoleDisplayName(role)}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {getRoleDescription(role)}
                            </p>
                            <div className="flex items-center mt-2">
                              <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                                {role.code}
                              </span>
                              <span className={`ml-2 text-xs px-2 py-1 rounded ${
                                role.is_active 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {role.is_active ? 'Активна' : 'Неактивна'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'project' && (
                <div>
                  <h3 className="text-lg font-medium mb-4">Проектные роли</h3>
                  <div className="grid gap-4">
                    {projectRoles.map((role) => (
                      <div key={role.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {getRoleDisplayName(role)}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {getRoleDescription(role)}
                            </p>
                            <div className="flex items-center mt-2">
                              <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                                {role.code}
                              </span>
                              <span className={`ml-2 text-xs px-2 py-1 rounded ${
                                role.is_active 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {role.is_active ? 'Активна' : 'Неактивна'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
