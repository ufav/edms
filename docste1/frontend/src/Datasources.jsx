import axios from 'axios'
import { notification } from 'antd'
import JSZip from 'jszip';
import { authStore } from './stores/auth'; // Импортируем authStore
import { useNavigate } from 'react-router-dom';

let API_URL = 'http://localhost:8000/';

const userAgent = navigator.userAgent.toLowerCase();

const isLinux = userAgent.includes('x11') || userAgent.includes('ubuntu');

if (isLinux) {
  API_URL = 'http://195.49.210.188:8000/';
}

const axiosInstance = axios.create({
  baseURL: API_URL,
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('Sending request:', {
      url: config.url,
      token: token ? token.slice(0, 10) + '...' : 'missing',
    });
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Токен истёк или недействителен
      notification.error({
        message: 'Session Expired',
        description: 'Your session has expired. Please log in again.',
        placement: 'topRight',
      });
      // Очищаем authStore
      authStore.clearUser();
      // Перенаправляем на страницу логина
      window.location.href = '/'; // Используем window.location для гарантированного редиректа
    }
    return Promise.reject(error);
  }
);

export const getMainData = async (project_id) => {
  try {
    const response = await axiosInstance.get(`${API_URL}api/data`, {
      params: { project_id }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching documents data:', error);
    throw error;
  }
};

export const getDocument = async (document_id) => {
  try {
    const response = await axiosInstance.get(`${API_URL}api/document`, {
      params: { document_id },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching documents data:', error);
    throw error;
  }
};

export const getDisciplines = async () => {
    try {
        const response = await axiosInstance.get(`${API_URL}api/disciplines`)
        return response.data
    } catch (error) {
        console.error('Error fetching disciplines:', error)
        throw error
    }
}

export const getDocumentTypes = async () => {
    try {
        const response = await axiosInstance.get(`${API_URL}api/document_types`)
        return response.data
    } catch (error) {
        console.error('Error fetching document types:', error)
        throw error
    }
}

export const getRevisionStatuses = async () => {
    try {
        const response = await axiosInstance.get(`${API_URL}api/revision_statuses`)
        return response.data
    } catch (error) {
        console.error('Error fetching revision statuses:', error)
        throw error
    }
}

export const getRevisionSteps = async () => {
    try {
        const response = await axiosInstance.get(`${API_URL}api/revision_steps`)
        return response.data
    } catch (error) {
        console.error('Error fetching revision steps:', error)
        throw error
    }
}

export const getRevisionDescriptions = async () => {
    try {
        const response = await axiosInstance.get(`${API_URL}api/revision_descriptions`)
        return response.data
    } catch (error) {
        console.error('Error fetching revision descriptions:', error)
        throw error
    }
}

export const getLanguages = async () => {
    try {
        const response = await axiosInstance.get(`${API_URL}api/languages`)
        return response.data
    } catch (error) {
        console.error('Error fetching languages:', error)
        throw error;
    }
}

export const getOriginators = async () => {
    try {
        const response = await axiosInstance.get(`${API_URL}api/originators`)
        return response.data
    } catch (error) {
        console.error('Error fetching originators:', error)
        throw error
    }
}

export const getCompanies = async () => {
    try {
        const response = await axiosInstance.get(`${API_URL}api/companies`)
        return response.data
    } catch (error) {
        console.error('Error fetching originators:', error)
        throw error
    }
}

export const getReviewCodes = async () => {
    try {
        const response = await axiosInstance.get(`${API_URL}api/review_codes`)
        return response.data
    } catch (error) {
        console.error('Error fetching document types:', error)
        throw error
    }
}

export const deleteDocument = async (record, onClose) => {
    try {
        if (!record || !record.id) {    // Если нет записи или id, выходим из функции
            return
        }
        const response_document = await axiosInstance.put(`${API_URL}api/deldoc/${record.id}`)
        console.log('Record deleted:', response_document.data)
        console.log('Records deleted:', response_files.data)
        notification.success(
            {
                message: 'Document deleted successfully',
                placement: 'topRight'
            }
        )
        onClose()
    } catch (error) {
        console.error('Error deleting record:', error)
        notification.error(
            {
                message: 'Failed to delete record',
                placement: 'topRight'
            }
        )
    }
}

export const getUploadedFiles = async (revision_id, visible, setUploadedFiles) => {
  if (visible && revision_id) {
    try {
      const response = await axiosInstance.get(`${API_URL}api/getfiles/${revision_id}`);
      console.log('Raw server response:', response.data);
      setUploadedFiles(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching uploaded files:', error);
      throw error;
    }
  }
  return [];
};

export const downloadFilesAsZip = async (revisionIds) => {
  try {
    const zip = new JSZip();
    for (const revisionId of revisionIds) {
      const files = await getUploadedFiles(revisionId, true, () => {});
      if (files && files.length > 0) {
        for (const file of files) {
          const response = await axiosInstance.get(file.url, { responseType: 'blob' });
          const fileName = file.file_name || `file_${revisionId}`;
          zip.file(fileName, response.data);
        }
      }
    }
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    return zipBlob;
  } catch (error) {
    console.error('Error creating ZIP archive in datasource:', error);
    throw error;
  }
};

export const updateDocument = async (documentId, data, onSuccess, onClose) => {
  try {
    console.log('Updating document with ID:', documentId);
    console.log('Data to send:', data);
    const response = await axiosInstance.put(`${API_URL}api/upddoc/${documentId}`, data, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    console.log('Server response:', response.data);
    onSuccess();
    onClose();
    return response.data;
  } catch (error) {
    console.error('Error updating document:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    onClose();
    throw error;
  }
};

export const getProjects = async () => {
  try {
    const response = await axiosInstance.get(`${API_URL}api/projects`);
    return response.data;
  } catch (error) {
    console.error('Error fetching projects:', error);
    throw error;
  }
};

export const getUsers = async () => {
    try {
        const response = await axiosInstance.get(`${API_URL}api/users`)
        return response.data
    } catch (error) {
        console.error('Error fetching users:', error)
        throw error;
    }
}

export const getRoles = async () => {
    try {
        const response = await axiosInstance.get(`${API_URL}api/roles`)
        return response.data
    } catch (error) {
        console.error('Error fetching roles:', error)
        throw error;
    }
}

export const updateUser = async (id, updatedData) => {
  try {
    const response = await axiosInstance.put(`${API_URL}api/users/${id}`, updatedData);
    return response.data;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

export const getUserProjects = async (userid) => {
    try {
        const response = await axiosInstance.get(`${API_URL}api/user_projects`, {
            params: {
                id: userid
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching projects:', error);
        throw error;
    }
};

export const addUsersProjectAccess = async (references) => {
    try {
      const response = await axiosInstance.post(`${API_URL}api/add_users_project_access`, references);
      return response.data;
    } catch (error) {
      throw error;
    }
};

export const removeUsersProjectAccess = async (userId, projectIds) => {
  try {
    const response = await axiosInstance.delete(`${API_URL}api/remove_users_project_access`, {
      data: {
        user_id: userId,
        project_ids: projectIds,
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};  

export const getUserProjectAccess = async (userId) => {
  try {
    const response = await axiosInstance.get(`${API_URL}api/user_project_access/${userId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const registerUser = async (userData) => {
  try {
    const response = await axiosInstance.post(`${API_URL}api/register`, userData);
    return response.data;
  } catch (error) {
    console.error('Error registering user:', error);
    throw error;
  }
};
  
export const changePassword = async (data) => {
  try {
    const token = localStorage.getItem('access_token');
    const response = await axiosInstance.post(`${API_URL}api/change-password`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    throw new Error('Failed to change password');
  }
};

export const deactivateUser = async (userId) => {
  try {
    const response = await axiosInstance.put(`${API_URL}api/user-deactivate/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to deactivate user:', error);
    throw error;
  }
};

export const getToken = async (username, password) => {
  const formDetails = new URLSearchParams();
  formDetails.append('username', username);
  formDetails.append('password', password);

  try {
    const response = await axiosInstance.post(`${API_URL}api/token`, formDetails, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (response.status === 200) {
      return response.data; // Включает access_token, id, role_id, expires_in
    } else {
      throw new Error('Authentication error');
    }
  } catch (error) {
    throw error;
  }
};

export const verifyToken = async () => {
  try {
    const response = await axiosInstance.get(`${API_URL}api/verify-token`);
    console.log('Token verification response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Token verification failed:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    return false;
  }
};

export const createDocument = async (documentData, files) => {
    const formData = new FormData();
    
    // Добавляем данные документа в formData
    for (const key in documentData) {
        if (documentData[key] !== undefined && documentData[key] !== null) {
            formData.append(key, documentData[key]);
        }
    }

    // Добавляем файлы
    if (files && files.length > 0) {
        files.forEach(file => {
            formData.append('files', file);
        });
    }

    try {
        const response = await axiosInstance.post(`${API_URL}api/addnewdoc/`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error creating document with files:', error);
        throw error;
    }
};

export const createProject = async (projectData) => {
    try {
      const response = await axiosInstance.post(`${API_URL}api/create_project`, projectData);
      return response.data;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  };

  export const uploadFiles = async (projectId, revisionId, newFiles, deletedFileIds) => {
    const formData = new FormData();
    formData.append('project_id', projectId);
    formData.append('revision_id', revisionId);

    // Проверяем, что передан только один файл
    if (newFiles.length > 1) {
        throw new Error('Only one file is allowed per revision');
    }
    if (newFiles.length === 1) {
        formData.append('files', newFiles[0]); // Добавляем только один файл
    }

    if (deletedFileIds && deletedFileIds.length > 0) {
        formData.append('deleted_files', JSON.stringify(deletedFileIds));
    }

    try {
        const response = await axiosInstance.post(`${API_URL}api/uploadfiles/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
};

export const createRevision = async (revisionData, files) => {
    const formData = new FormData();

    // Добавляем данные ревизии как JSON-строку под ключом 'revision'
    formData.append('revision', JSON.stringify(revisionData));

    // Проверяем, что передан только один файл
    if (files && files.length > 1) {
        throw new Error('Only one file is allowed per revision');
    }
    if (files && files.length === 1) {
        formData.append('files', files[0]); // Добавляем только один файл
    }

    try {
        const response = await axiosInstance.post(`${API_URL}api/addrevision/`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error creating revision with file:', error);
        throw error;
    }
};

export const createTransmittal = async (transmittalData) => {
    try {
      const response = await axiosInstance.post(`${API_URL}api/addtransmittal/`, transmittalData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error creating transmittal:', error);
      throw error;
    }
};

export const getTransmittals = async (project_id) => {
    try {
        const response = await axiosInstance.get(`${API_URL}api/transmittals`, {
            params: { project_id }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching documents data:', error);
        throw error;
    }
};

export const saveDisciplineReferences = async (disciplineReferences) => {
    try {
      const response = await axiosInstance.post(`${API_URL}api/save_discipline_references`, disciplineReferences);
      return response.data;
    } catch (error) {
      console.error('Error saving discipline references:', error);
      throw error;
    }
};

export const fetchProjectDisciplineReferences = async (projectId) => {
    try {
      const response = await axiosInstance.get(`${API_URL}api/get_discipline_references/${projectId}`
      );
      return response.data.map(ref => ref.discipline_id.toString());
    } catch (error) {
      console.error('Error fetching project discipline references:', error);
      throw error;
    }
};

export const fetchProjectDisciplineDocTypeReferences = async (projectId, disciplineId) => {
    try {
      const response = await axiosInstance.get(`${API_URL}api/get_doctype_references/${projectId}/${disciplineId}`);
      return response.data.map(ref => ref.type_id.toString());
    } catch (error) {
      console.error('Error fetching project discipline doctype references:', error);
      throw error;
    }
};

export const saveDocTypeReferences = async (docTypeReferences) => {
    try {
      const response = await axiosInstance.post(`${API_URL}api/save_doctype_references`, docTypeReferences);
      return response.data;
    } catch (error) {
      console.error('Error saving doctype references:', error);
      throw error;
    }
};

export const getProjectDisciplines = async (projectId) => {
    try {
      const response = await axiosInstance.get(`${API_URL}api/project_disciplines/${projectId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching project disciplines:', error);
      throw error;
    }
};

export const getProjectDocumentTypes = async (projectId) => {
    try {
        const response = await axiosInstance.get(`${API_URL}api/project_document_types/${projectId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching project document types:', error);
        throw error;
    }
};

export const getProjectDisciplineDocumentTypes = async (projectId, disciplineId) => {
    try {
        const response = await axiosInstance.get(`${API_URL}api/project_discipline_document_types/${projectId}/${disciplineId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching project discipline document types:', error);
        throw error;
    }
};

export const saveRevisionDescriptionReferences = async (revisionDescriptionReferences) => {
    try {
      const response = await axiosInstance.post(`${API_URL}api/save_revision_description_references`, revisionDescriptionReferences);
      return response.data;
    } catch (error) {
      console.error('Error saving revision description references:', error);
      throw error;
    }
};

export const fetchRevisionDescriptionReferences = async (projectId) => {
    try {
      const response = await axiosInstance.get(`${API_URL}api/get_revision_description_references/${projectId}`
      );
      return response.data.map(ref => ref.description_id.toString());
    } catch (error) {
      console.error('Error fetching project revision description references:', error);
      throw error;
    }
};

export const getProjectRevisionDescriptions = async (projectId) => {
    try {
      const response = await axiosInstance.get(`${API_URL}api/project_revision_descriptions/${projectId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching project revision descriptions:', error);
      throw error;
    }
};

export const fetchProjectRevisionDescriptionRevisionStepReferences = async (projectId, descriptionId) => {
    try {
      const response = await axiosInstance.get(`${API_URL}api/get_revision_step_references/${projectId}/${descriptionId}`);
      return response.data.map(ref => ref.step_id.toString());
    } catch (error) {
      console.error('Error fetching project revision description revision step references:', error);
      throw error;
    }
};

export const saveRevisionStepReferences = async (revisionStepReferences) => {
    try {
      const response = await axiosInstance.post(`${API_URL}api/save_revision_step_references`, revisionStepReferences);
      return response.data;
    } catch (error) {
      console.error('Error saving revision step references:', error);
      throw error;
    }
};

export const getProjectRevisionSteps = async (projectId) => {
    try {
        const response = await axiosInstance.get(`${API_URL}api/project_revision_steps/${projectId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching project revision steps:', error);
        throw error;
    }
};

export const getProjectRevisionDescriptionRevisionSteps = async (projectId, descriptionId) => {
    try {
        const response = await axiosInstance.get(`${API_URL}api/project_revision_description_revision_steps/${projectId}/${descriptionId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching project revision description revision steps:', error);
        throw error;
    }
};

export const getComments = async (documentId) => {
  try {
    const token = localStorage.getItem('access_token');
    const response = await axiosInstance.get(`${API_URL}api/get_comments/${documentId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching comments:', error);
    throw error;
  }
};

export const addComment = async (commentData) => {
  try {
    const token = localStorage.getItem('access_token');
    const response = await axiosInstance.post(`${API_URL}api/add_comment`, commentData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
};

export const getCommentCount = async (documentId) => {
  try {
    const token = localStorage.getItem('access_token');
    const response = await axiosInstance.get(`${API_URL}api/get_comment_count/${documentId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.comment_count;
  } catch (error) {
    console.error('Error fetching comment count:', error);
    throw error;
  }
};

export const updateComment = async (commentId, content) => {
  try {
    const token = localStorage.getItem('access_token');
    const response = await axiosInstance.put(
      `${API_URL}api/update_comment/${commentId}`,
      { content },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating comment:', error);
    throw error;
  }
};

export const deleteComment = async (commentId) => {
  try {
    const token = localStorage.getItem('access_token');
    const response = await axiosInstance.put(
      `${API_URL}api/delete_comment/${commentId}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
};
