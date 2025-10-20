import React, { useEffect, useState, useMemo, useRef } from 'react';
import moment from 'moment';
import { Modal, Button, Input, Select, Upload, Form, Row, Col, Card, Tabs, message, Spin } from 'antd';
import { observer } from 'mobx-react-lite';
import { authStore } from './stores/auth';
import { referenceStore } from './stores/reference';
import Comments from './Comments';
import { UploadOutlined, CheckOutlined } from '@ant-design/icons';
import {
  getDocument,
  getUploadedFiles,
  updateDocument,
  deleteDocument,
  createRevision,
  uploadFiles,
  getCommentCount,
} from './Datasources';

const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

// Глобальные стили для переопределения курсора, фона и цвета шрифта
const globalStyles = `
  .ant-input[readonly],
  .ant-input-textarea[readonly] {
    background-color: #f5f5f5 !important;
    color: #bfbfbf !important;
    cursor: pointer !important;
  }
  .ant-input:not([readonly]),
  .ant-input-textarea:not([readonly]) {
    background-color: #fff !important;
    color: #000 !important;
  }
  .ant-select-disabled .ant-select-selector {
    background-color: #f5f5f5 !important;
    color: #bfbfbf !important;
    cursor: pointer !important;
  }
  .ant-select:not(.ant-select-disabled) .ant-select-selector {
    background-color: #fff !important;
    color: #000 !important;
  }
  .clickable-wrapper {
    display: inline-block;
    width: 100%;
    height: 100%;
    cursor: pointer;
  }
  .ant-picker-disabled .ant-picker-input {
    background-color: #f5f5f5 !important;
    color: #bfbfbf !important;
    cursor: pointer !important;
  }
  .ant-picker:not(.ant-picker-disabled) .ant-picker-input {
    color: #000 !important;
  }
  .ant-picker-disabled .ant-picker-input input {
    cursor: pointer !important;
  }

  .ant-modal-content {
    transition: height 0.3s ease;
  }
  .ant-tabs-tab-remove {
    display: none !important;
  }
`;

const addGlobalStyles = () => {
  const styleSheet = document.createElement('style');
  styleSheet.type = 'text/css';
  styleSheet.innerText = globalStyles;
  document.head.appendChild(styleSheet);
};

const ViewDocument = observer(({ document_id, visible, onClose, onDelete, onUpdate }) => {
  const [fileList, setFileList] = useState([]);
  const [initialFileList, setInitialFileList] = useState([]);
  const [newRevisionFileList, setNewRevisionFileList] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [form] = Form.useForm();
  const [newRevisionForm] = Form.useForm();
  const [documentInfo, setDocumentInfo] = useState(null);
  const [revisions, setRevisions] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [modalHeight, setModalHeight] = useState('80vh');
  const contentRef = useRef(null);
  const [editingFields, setEditingFields] = useState({});
  const [isNewRevisionTabOpen, setIsNewRevisionTabOpen] = useState(false);
  const [newRevisionFormDirty, setNewRevisionFormDirty] = useState(false);
  const [isFilesDirty, setIsFilesDirty] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);

  useEffect(() => {
    addGlobalStyles();

    const fetchDocumentData = async () => {
      try {
        if (document_id && !referenceStore.isLoading) {
          console.log("Переданный document_id:", document_id);
          const documentDataArray = await getDocument(document_id);

          if (!documentDataArray || documentDataArray.length === 0) {
            console.warn("Документ не найден");
            return;
          }

          const firstDocument = documentDataArray[0];
          setDocumentInfo(firstDocument);
          setRevisions(documentDataArray);

          form.setFieldsValue({
            number: firstDocument.document_number,
            title: firstDocument.document_title,
            title_native: firstDocument.document_title_native,
            discipline_id: referenceStore.disciplines.find((d) => d.name === firstDocument.discipline)?.id || null,
            type_id: referenceStore.documentTypes.find((dt) => dt.name === firstDocument.document_type)?.id || null,
            language_id: referenceStore.languages.find((l) => l.name === firstDocument.language)?.id || null,
            drs: firstDocument.drs,
            ...documentDataArray.reduce((acc, revision) => ({
              ...acc,
              [`revision_status_${revision.revision_id}`]: referenceStore.revisionStatuses.find((s) => s.name === revision.revision_status)?.id,
              [`revision_step_${revision.revision_id}`]: referenceStore.revisionSteps.find((s) => s.description === revision.revision_step)?.id,
              [`revision_description_${revision.revision_id}`]: referenceStore.revisionDescriptions.find((d) => d.description === revision.revision_description)?.id,
            }), {}),
          });
        }
      } catch (error) {
        console.error('Error fetching document data:', error);
      }
    };

    fetchDocumentData();
  }, [document_id, form, visible, referenceStore.isLoading]);

  useEffect(() => {
    const fetchCommentCount = async () => {
      try {
        const count = await getCommentCount(document_id);
        setCommentCount(count);
      } catch (error) {
        console.error('Failed to fetch comment count:', error);
        setCommentCount(0); // В случае ошибки показываем 0
      }
    };

    if (visible) {
      fetchCommentCount();
    }
  }, [document_id, visible]);

  const fetchUploadedFiles = async (revisionId) => {
    if (!revisionId) return;
    try {
      console.log('Starting fetchUploadedFiles for revision:', revisionId);
      setFileLoading(true); // Включаем спиннер
      const files = await getUploadedFiles(revisionId, visible, setUploadedFiles);
      console.log('Fetched files:', files);
      if (Array.isArray(files) && files.length) {
        const file = files[0]; // Берем только первый файл
        const formattedFile = {
          ...file,
          file_id: file.file_id,
          name: file.file_name,
          status: file.status || 'done',
        };
        setFileList([formattedFile]);
        setInitialFileList([formattedFile]);
        setIsFilesDirty(false);
      } else {
        console.log('No files found for revision:', revisionId);
        setFileList([]);
        setInitialFileList([]);
        setIsFilesDirty(false);
      }
    } catch (error) {
      console.error('Error fetching file:', error);
      setFileList([]);
      setInitialFileList([]);
    } finally {
      setFileLoading(false); // Выключаем спиннер
      console.log('Finished fetchUploadedFiles, fileLoading set to false');
    }
  };

  useEffect(() => {
    if (visible && activeTab && activeTab !== 'new_revision') {
      fetchUploadedFiles(activeTab);
    }
  }, [activeTab, visible]);

  const sortedRevisions = useMemo(() => {
    return [...revisions].sort((a, b) => {
      const dateA = new Date(a.revision_created);
      const dateB = new Date(b.revision_created);
      return dateA - dateB;
    });
  }, [revisions]);

  useEffect(() => {
    if (sortedRevisions.length > 0 && !isNewRevisionTabOpen) {
      const lastRevision = sortedRevisions[sortedRevisions.length - 1];
      setActiveTab(lastRevision.revision_id.toString());
    }
  }, [sortedRevisions, isNewRevisionTabOpen]);

  const files = useMemo(() => {
    if (uploadedFiles.length) {
      const file = uploadedFiles[0];
      return [{
        uid: file.uid,
        name: file.file_name,
        type: file.mime_type,
        size: file.file_size,
        status: file.status,
        url: file.url,
      }];
    }
    return [];
  }, [uploadedFiles]);

  useEffect(() => {
    if (activeTab !== 'new_revision') {
      setFileList(files);
    }
  }, [files, activeTab]);

  useEffect(() => {
    if (visible && contentRef.current) {
      const contentHeight = contentRef.current.clientHeight;
      const newHeight = Math.min(contentHeight + 100, window.innerHeight * 0.9);
      setModalHeight(`${newHeight}px`);
    }
  }, [visible, revisions, fileList, newRevisionFileList, isNewRevisionTabOpen]);

  const handleUploadChange = ({ fileList: newFileList }) => {
    const file = newFileList[0]; // Берем только первый (и единственный) файл
    if (activeTab === 'new_revision') {
      setNewRevisionFileList(file ? [file] : []);
      setNewRevisionFormDirty(true);
    } else {
      setFileList(file ? [file] : []);
      setIsFilesDirty(true);
    }
  };

  const handleSaveFiles = async () => {
    if (!fileList.length) {
      message.error('A file is required for the revision.');
      return;
    }
  
    try {
      const revisionId = activeTab;
      const newFile = fileList[0].originFileObj ? fileList[0].originFileObj : null;
      const deletedFileId = initialFileList.length && !fileList[0].file_id ? initialFileList[0].file_id : null;
  
      const projectId = authStore.selectedProjectId;
  
      if (!projectId) {
        message.error('Cannot save file: project is not selected.');
        return;
      }
  
      const result = await uploadFiles(projectId, revisionId, newFile ? [newFile] : [], deletedFileId ? [deletedFileId] : []);
      console.log('Server response:', result);
  
      if (result.message === 'File uploaded successfully') {
        message.success('File saved successfully!');
        setIsFilesDirty(false);
        setInitialFileList([...fileList]);
        await fetchUploadedFiles(revisionId);
        if (onUpdate) onUpdate();
      } else {
        throw new Error('Failed to save file');
      }
    } catch (error) {
      console.error('Error saving file:', error);
      message.error('Failed to save file. Please try again.');
    }
  };

  const handleModalClose = () => {
    const isEditing = Object.values(editingFields).some((value) => value === true);
    const hasUnsavedNewRevision = isNewRevisionTabOpen && newRevisionFormDirty;

    if (isEditing || hasUnsavedNewRevision) {
      Modal.confirm({
        title: 'You have unsaved changes',
        content: 'Are you sure you want to close the window? All unsaved changes will be lost.',
        onOk: () => {
          resetModalState();
          onClose();
        },
        onCancel: () => {},
      });
    } else {
      resetModalState();
      onClose();
    }
  };

  const resetModalState = () => {
    setEditingFields({})
    setUploadedFiles([])
    setIsNewRevisionTabOpen(false)
    setNewRevisionFileList([])
    setActiveTab(null)
    form.resetFields()
    newRevisionForm.resetFields()
    setNewRevisionFormDirty(false)
    setFileList([])
    setInitialFileList([])
    setIsFilesDirty(false)
    setRevisions([])
  };

  const handleDelete = async () => {
    try {
      await deleteDocument(document_id, onClose);
      onDelete(document_id.id);
      onClose();
    } catch (error) {
      console.error('Ошибка при удалении документа:', error);
    }
  };

  const enableEditing = (fieldName) => {
    console.log(`Enabling editing for field: ${fieldName}`);
    setEditingFields((prev) => {
      const newState = { ...prev, [fieldName]: true };
      console.log('Updated editing fields:', newState);
      return newState;
    });
  };

  const handleSaveField = async (fieldName) => {
    try {
      const formData = await form.validateFields();
      const formattedData = {};

      const detailsFields = [
        'number',
        'title',
        'title_native',
        'discipline_id',
        'type_id',
        'language_id',
        'drs',
      ];

      if (!document_id) {
        throw new Error('Document ID is undefined');
      }

      console.log('Form data:', formData);
      console.log('Field to save:', fieldName);

      if (detailsFields.includes(fieldName)) {
        formattedData[fieldName] = formData[fieldName];
        console.log('Saving document field:', formattedData);
        await updateDocument(
          document_id,
          formattedData,
          () => setEditingFields((prev) => ({ ...prev, [fieldName]: false })),
          onClose
        );
        message.success('Document updated successfully');
      } else if (fieldName.startsWith('revision_')) {
        const revisionId = parseInt(fieldName.split('_').pop(), 10);
        const revisionField = fieldName.split('_')[1];
        formattedData[`${revisionField}_id`] = formData[fieldName];
        formattedData.revision_id = revisionId;

        console.log('Saving revision field:', formattedData);
        await updateDocument(
          document_id,
          formattedData,
          () => setEditingFields((prev) => ({ ...prev, [fieldName]: false })),
          onClose
        );

        const updatedDocumentData = await getDocument(document_id);
        setDocumentInfo(updatedDocumentData[0]);
        setRevisions(updatedDocumentData);

        message.success('Revision updated successfully');
      }

      if (onUpdate) {
        console.log('Calling onUpdate to refresh table');
        onUpdate();
      }

      setEditingFields((prev) => ({ ...prev, [fieldName]: false }));
    } catch (error) {
      console.error('Validation or Save Failed:', error);
      message.error('Failed to update');
    }
  };

  const handleAddNewRevisionTab = () => {
    setIsNewRevisionTabOpen(true);
    setActiveTab('new_revision');
    setNewRevisionFileList([]);
    newRevisionForm.resetFields();
    setNewRevisionFormDirty(false);
  };

  const handleSaveNewRevision = async () => {
    if (!newRevisionFileList.length) {
      message.error('A file is required for the new revision.');
      return;
    }
  
    try {
      const formData = await newRevisionForm.validateFields();
      const revisionData = {
        document_id: document_id,
        status_id: referenceStore.revisionStatuses.find((status) => status.name === formData.new_revision_status)?.id || 1,
        step_id: referenceStore.revisionSteps.find((step) => step.description === formData.new_revision_step)?.id || 1,
        description_id: referenceStore.revisionDescriptions.find((desc) => desc.description === formData.new_revision_description)?.id || 1,
        user_id: authStore.user_id,
        project_id: authStore.selectedProjectId,
        number: "01",
      };
  
      if (!revisionData.project_id) {
        message.error('Cannot create revision: Project is not selected.');
        console.error('Missing project_id:', revisionData);
        return;
      }
  
      const file = newRevisionFileList[0].originFileObj;
      const result = await createRevision(revisionData, [file]);
  
      if (result.success) {
        // Получаем обновлённые данные документа
        const updatedDocumentData = await getDocument(document_id);
        setDocumentInfo(updatedDocumentData[0]);
        setRevisions(updatedDocumentData);
  
        // Синхронизируем основную форму с новыми данными
        const updatedFields = {
          number: updatedDocumentData[0].document_number,
          title: updatedDocumentData[0].document_title,
          title_native: updatedDocumentData[0].document_title_native,
          discipline_id: referenceStore.disciplines.find((d) => d.name === updatedDocumentData[0].discipline)?.id || null,
          type_id: referenceStore.documentTypes.find((dt) => dt.name === updatedDocumentData[0].document_type)?.id || null,
          language_id: referenceStore.languages.find((l) => l.name === updatedDocumentData[0].language)?.id || null,
          drs: updatedDocumentData[0].drs,
          ...updatedDocumentData.reduce((acc, revision) => ({
            ...acc,
            [`revision_status_${revision.revision_id}`]: referenceStore.revisionStatuses.find((s) => s.name === revision.revision_status)?.id,
            [`revision_step_${revision.revision_id}`]: referenceStore.revisionSteps.find((s) => s.description === revision.revision_step)?.id,
            [`revision_description_${revision.revision_id}`]: referenceStore.revisionDescriptions.find((d) => d.description === revision.revision_description)?.id,
          }), {}),
        };
        form.setFieldsValue(updatedFields);
  
        // Переключаем вкладку и очищаем состояние новой ревизии
        setIsNewRevisionTabOpen(false);
        setActiveTab(result.revision_id.toString());
        setNewRevisionFileList([]);
        newRevisionForm.resetFields();
        setNewRevisionFormDirty(false);
        message.success('New revision created successfully!');
        if (onUpdate) onUpdate();
      } else {
        throw new Error('Failed to create revision');
      }
    } catch (error) {
      console.error('Failed to save new revision:', error);
      message.error('Failed to save new revision.');
    }
  };

  const onEdit = (targetKey, action) => {
    if (action === 'add') {
      handleAddNewRevisionTab();
    }
  };

  const handleTabChange = (key) => {
    if (key !== 'new_revision' && isNewRevisionTabOpen && newRevisionFormDirty) {
      Modal.confirm({
        title: 'You have unsaved changes',
        content: 'Are you sure you want to switch tabs? All unsaved changes in the new revision will be lost.',
        onOk: () => {
          setIsNewRevisionTabOpen(false);
          setNewRevisionFileList([]);
          newRevisionForm.resetFields();
          setNewRevisionFormDirty(false);
          setActiveTab(key);
        },
        onCancel: () => {},
      });
    } else {
      setActiveTab(key);
      if (key !== 'new_revision') {
        setIsNewRevisionTabOpen(false);
        setNewRevisionFileList([]);
        newRevisionForm.resetFields();
        setNewRevisionFormDirty(false);
      }
    }
  };

  const handleNewRevisionFormChange = () => {
    setNewRevisionFormDirty(true);
  };

  const uploadProps = {
    maxCount: 1, // Ограничиваем максимальное количество файлов до 1
    beforeUpload: () => false,
    onChange: handleUploadChange,
    fileList: activeTab === 'new_revision' ? newRevisionFileList : fileList,
    listType: 'picture',
  };

  const handleCommentAdded = () => {
    setCommentCount((prev) => prev + 1); // Увеличиваем счетчик при добавлении комментария
  };

  const handleCommentDeleted = () => {
    setCommentCount((prev) => prev - 1); // Уменьшаем счетчик при удалении
  };

  return (
    <Modal
      title={
        <>
          Document ID:{' '}
          <span style={{ color: 'darkblue', fontWeight: 'bold' }}>
            {documentInfo?.document_number || ''}
          </span>
          {'    '}Created at:{' '}
          <span style={{ fontWeight: 'bold' }}>
            {documentInfo?.document_created ? moment(documentInfo.document_created).format('DD.MM.YYYY HH:mm') : 'N/A'}
          </span>
        </>
      }    
      open={visible}
      onCancel={handleModalClose}
      width={"95%"} // Фиксированная ширина, например, 1200px
      centered // Центрирование по вертикали и горизонтали
      style={{ height: '95vh', margin: 'auto' }} // Высота 95% рабочей области браузера
      styles={{
        content: { height: '100%', overflow: 'hidden' }, // Фиксируем высоту контента без прокрутки
        body: { height: 'calc(100% - 55px)', overflow: 'hidden' }, // Учитываем высоту заголовка, убираем прокрутку
      }}
      footer={null} // Полностью убираем футер
    >
      <Form layout="vertical" form={form}>
        <Row gutter={16}>
          <Col span={24}>
            <Card title="Details">
              <Row gutter={16} align="middle" style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                <Col span={2} style={{ textAlign: "right", fontWeight: "bold" }}>ID:</Col>
                <Col span={5} style={{ display: 'flex', alignItems: 'center' }}>
                  <div className="clickable-wrapper" onClick={() => enableEditing('number')}>
                    <Form.Item name="number" style={{ marginBottom: 0 }}>
                      <Input readOnly={!editingFields['number']} />
                    </Form.Item>
                  </div>
                  {editingFields['number'] && (
                    <Button
                      type="primary"
                      icon={<CheckOutlined />}
                      onClick={() => handleSaveField('number')}
                      style={{ marginLeft: 8 }}
                    />
                  )}
                </Col>
                <Col span={5}></Col>
                <Col span={2} style={{ textAlign: "right", fontWeight: "bold" }}>Discipline:</Col>
                <Col span={7} style={{ display: 'flex', alignItems: 'center' }}>
                  <div className="clickable-wrapper" onClick={() => enableEditing('discipline_id')}>
                    <Form.Item name="discipline_id" style={{ marginBottom: 0 }}>
                      <Select
                        showSearch
                        placeholder="Select Discipline"
                        disabled={!editingFields['discipline_id']}
                        loading={referenceStore.isLoading}
                        optionFilterProp="label"
                        filterOption={(input, option) => {
                          const code = option.label.split(' ')[0].toLowerCase();
                          const name = option.label.split(' ').slice(1).join(' ').toLowerCase();
                          return code.includes(input.toLowerCase()) || name.includes(input.toLowerCase());
                        }}
                        filterSort={(optionA, optionB) => {
                          const nameA = optionA.label.split(' ').slice(1).join(' ').toLowerCase();
                          const nameB = optionB.label.split(' ').slice(1).join(' ').toLowerCase();
                          return nameA.localeCompare(nameB);
                        }}
                      >
                        {referenceStore.disciplines.map((disc) => (
                          <Option key={disc.id} value={disc.id} label={`${disc.code} ${disc.name}`}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ width: 30, whiteSpace: 'nowrap', marginRight: '16px' }}>{disc.code}</span>
                              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {disc.name}
                              </span>
                            </div>
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </div>
                  {editingFields['discipline_id'] && (
                    <Button
                      type="primary"
                      icon={<CheckOutlined />}
                      onClick={() => handleSaveField('discipline_id')}
                      style={{ marginLeft: 8 }}
                    />
                  )}
                </Col>
              </Row>
              <Row gutter={16} align="middle" style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                <Col span={2} style={{ textAlign: "right", fontWeight: "bold" }}>Title:</Col>
                <Col span={10} style={{ display: 'flex', alignItems: 'center' }}>
                  <div className="clickable-wrapper" onClick={() => enableEditing('title')}>
                    <Form.Item name="title" style={{ marginBottom: 0 }}>
                      <Input readOnly={!editingFields['title']} />
                    </Form.Item>
                  </div>
                  {editingFields['title'] && (
                    <Button
                      type="primary"
                      icon={<CheckOutlined />}
                      onClick={() => handleSaveField('title')}
                      style={{ marginLeft: 8 }}
                    />
                  )}
                </Col>
                <Col span={2} style={{ textAlign: "right", fontWeight: "bold" }}>Document Type:</Col>
                <Col span={9} style={{ display: 'flex', alignItems: 'center' }}>
                  <div className="clickable-wrapper" onClick={() => enableEditing('type_id')}>
                    <Form.Item name="type_id" style={{ marginBottom: 0 }}>
                      <Select
                        showSearch
                        placeholder="Select Document Type"
                        disabled={!editingFields['type_id']}
                        loading={referenceStore.isLoading}
                        optionFilterProp="label"
                        filterOption={(input, option) => {
                          const code = option.label.split(' ')[0].toLowerCase();
                          const name = option.label.split(' ').slice(1).join(' ').toLowerCase();
                          return code.includes(input.toLowerCase()) || name.includes(input.toLowerCase());
                        }}
                        filterSort={(optionA, optionB) => {
                          const nameA = optionA.label.split(' ').slice(1).join(' ').toLowerCase();
                          const nameB = optionB.label.split(' ').slice(1).join(' ').toLowerCase();
                          return nameA.localeCompare(nameB);
                        }}
                      >
                        {referenceStore.documentTypes.map((type) => (
                          <Option key={type.id} value={type.id} label={`${type.code} ${type.name}`}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ width: 30, whiteSpace: 'nowrap', marginRight: '16px' }}>{type.code}</span>
                              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {type.name}
                              </span>
                            </div>
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </div>
                  {editingFields['type_id'] && (
                    <Button
                      type="primary"
                      icon={<CheckOutlined />}
                      onClick={() => handleSaveField('type_id')}
                      style={{ marginLeft: 8 }}
                    />
                  )}
                </Col>
              </Row>
              <Row gutter={16} align="middle" style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                <Col span={2} style={{ textAlign: "right", fontWeight: "bold" }}>Secondary Title:</Col>
                <Col span={10} style={{ display: 'flex', alignItems: 'center' }}>
                  <div className="clickable-wrapper" onClick={() => enableEditing('title_native')}>
                    <Form.Item name="title_native" style={{ marginBottom: 0 }}>
                      <Input readOnly={!editingFields['title_native']} />
                    </Form.Item>
                  </div>
                  {editingFields['title_native'] && (
                    <Button
                      type="primary"
                      icon={<CheckOutlined />}
                      onClick={() => handleSaveField('title_native')}
                      style={{ marginLeft: 8 }}
                    />
                  )}
                </Col>
                <Col span={2} style={{ textAlign: "right", fontWeight: "bold" }}>DRS Code:</Col>
                <Col span={5} style={{ display: 'flex', alignItems: 'center' }}>
                  <div className="clickable-wrapper" onClick={() => enableEditing('drs')}>
                    <Form.Item name="drs" style={{ marginBottom: 0 }}>
                      <Input readOnly={!editingFields['drs']} />
                    </Form.Item>
                  </div>
                  {editingFields['drs'] && (
                    <Button
                      type="primary"
                      icon={<CheckOutlined />}
                      onClick={() => handleSaveField('drs')}
                      style={{ marginLeft: 8 }}
                    />
                  )}
                </Col>
              </Row>
              <Row gutter={16} align="middle" style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                <Col span={2} style={{ textAlign: "right", fontWeight: "bold" }}>Language:</Col>
                <Col span={3} style={{ display: 'flex', alignItems: 'center' }}>
                  <div className="clickable-wrapper" onClick={() => enableEditing('language_id')}>
                    <Form.Item name="language_id" style={{ marginBottom: 0 }}>
                      <Select
                        placeholder="Select Document Language"
                        disabled={!editingFields['language_id']}
                        loading={referenceStore.isLoading}
                        allowClear
                      >
                        {referenceStore.languages.map(lang => (
                          <Option key={lang.id} value={lang.id}>
                            {lang.name}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </div>
                  {editingFields['language_id'] && (
                    <Button
                      type="primary"
                      icon={<CheckOutlined />}
                      onClick={() => handleSaveField('language_id')}
                      style={{ marginLeft: 8 }}
                    />
                  )}
                </Col>
                <Col span={7}></Col>
                <Col span={2}></Col>
                <Col span={2} style={{ textAlign: "left" }}>
                  <Button onClick={() => setCommentsVisible(true)}>
                    Comments ({commentCount})
                  </Button>
                </Col>
              </Row>
            </Card>

            <Card title="Revisions" style={{ marginTop: 10 }}>
            <Tabs
              type="editable-card"
              activeKey={activeTab}
              onChange={handleTabChange}
              onEdit={onEdit}
            >
              {sortedRevisions.map((revision) => (
                <TabPane
                  tab={`${revision.revision_code}${revision.revision_number}`}
                  key={revision.revision_id.toString()}
                  closable={false} // Отключаем возможность закрытия вкладок
                >
                  <Row gutter={16}>
                    {/* Первая колонка - Revision Details */}
                    <Col span={6}>
                      <Row gutter={16} align="middle" style={{ marginBottom: "8px" }}>
                        <Col span={24} style={{ textAlign: "center", fontWeight: "bold", padding: "8px" }}>
                          Revision Details
                        </Col>
                      </Row>
                      <Row gutter={16} align="middle" style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                        <Col span={8} style={{ textAlign: "right", fontWeight: "bold" }}>Created:</Col>
                        <Col span={10}>
                          <Form.Item name={`revision_created${revision.revision_id}`} style={{ marginBottom: 0 }}>
                            <span>
                              {revision.revision_created ? moment(revision.revision_created).format('DD.MM.YYYY HH:mm') : '-'}
                            </span>
                          </Form.Item>
                        </Col>
                      </Row>
                      <Row gutter={16} align="middle" style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                        <Col span={8} style={{ textAlign: "right", fontWeight: "bold" }}>Status:</Col>
                        <Col span={16} style={{ display: 'flex', alignItems: 'center' }}>
                          <div className="clickable-wrapper" onClick={() => enableEditing(`revision_status_${revision.revision_id}`)}>
                            <Form.Item name={`revision_status_${revision.revision_id}`} style={{ marginBottom: 0 }}>
                              <Select
                                disabled={!editingFields[`revision_status_${revision.revision_id}`]}
                                loading={referenceStore.isLoading}
                                style={{ width: '100%' }}
                                placeholder="Select Revision Status"
                                onChange={(value) =>
                                  form.setFieldsValue({ [`revision_status_${revision.revision_id}`]: value })
                                }
                              >
                                {referenceStore.revisionStatuses.map((status) => (
                                  <Option key={status.id} value={status.id}>
                                    {status.name}
                                  </Option>
                                ))}
                              </Select>
                            </Form.Item>
                          </div>
                          {editingFields[`revision_status_${revision.revision_id}`] && (
                            <Button
                              type="primary"
                              icon={<CheckOutlined />}
                              onClick={() => handleSaveField(`revision_status_${revision.revision_id}`)}
                              style={{ marginLeft: 8 }}
                            />
                          )}
                        </Col>
                      </Row>
                      <Row gutter={16} align="middle" style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                        <Col span={8} style={{ textAlign: "right", fontWeight: "bold" }}>Step:</Col>
                        <Col span={16}>
                          <Form.Item name={`revision_step_${revision.revision_id}`} style={{ marginBottom: 0 }}>
                            <span>
                              {revision.revision_step_code} - {revision.revision_step}
                            </span>
                          </Form.Item>
                        </Col>
                      </Row>
                      <Row gutter={16} align="middle" style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                        <Col span={8} style={{ textAlign: "right", fontWeight: "bold" }}>Description:</Col>
                        <Col span={16}>
                          <Form.Item name={`revision_description_${revision.revision_id}`} style={{ marginBottom: 0 }}>
                            <span>
                              {revision.revision_code} - {revision.revision_description}
                            </span>
                          </Form.Item>
                        </Col>
                      </Row>
                    </Col>

                    {/* Вторая колонка - Issue (Outgoing Transmittal) */}
                    {(revision.outgoing_transmittal_number || revision.outgoing_issued) && (
                      <Col span={6}>
                        <Row gutter={16} align="middle" style={{ marginBottom: "8px" }}>
                          <Col span={24} style={{ textAlign: "center", fontWeight: "bold", padding: "8px" }}>
                            Issue
                          </Col>
                        </Row>
                        <Row gutter={16} align="middle" style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                          <Col span={8} style={{ textAlign: "right", fontWeight: "bold" }}>Transmittal Number:</Col>
                          <Col span={16}>
                            <Form.Item name={`outgoing_transmittal_number_${revision.revision_id}`} style={{ marginBottom: 0 }}>
                              <span>{revision.outgoing_transmittal_number || '-'}</span>
                            </Form.Item>
                          </Col>
                        </Row>
                        <Row gutter={16} align="middle" style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                          <Col span={8} style={{ textAlign: "right", fontWeight: "bold" }}>Issued:</Col>
                          <Col span={10}>
                            <Form.Item name={`outgoing_issued_${revision.revision_id}`} style={{ marginBottom: 0 }}>
                              <span>
                                {revision.outgoing_issued ? moment(revision.outgoing_issued).format('DD.MM.YYYY') : '-'}
                              </span>
                            </Form.Item>
                          </Col>
                        </Row>
                        <Row gutter={16} align="middle" style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                          <Col span={8} style={{ textAlign: "right", fontWeight: "bold" }}>Due Date:</Col>
                          <Col span={10}>
                            <Form.Item name={`outgoing_due_date_${revision.revision_id}`} style={{ marginBottom: 0 }}>
                              <span>
                                {revision.outgoing_due_date ? moment(revision.outgoing_due_date).format('DD.MM.YYYY') : '-'}
                              </span>
                            </Form.Item>
                          </Col>
                        </Row>
                        <Row gutter={16} align="middle" style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                          <Col span={8} style={{ textAlign: "right", fontWeight: "bold" }}>Sent to:</Col>
                          <Col span={16}>
                            <Form.Item name={`outgoing_party_${revision.revision_id}`} style={{ marginBottom: 0 }}>
                              <span>{revision.outgoing_party || '-'}</span>
                            </Form.Item>
                          </Col>
                        </Row>
                        <Row gutter={16} align="middle" style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                          <Col span={8} style={{ textAlign: "right", fontWeight: "bold" }}>Originator:</Col>
                          <Col span={16}>
                            <Form.Item name={`outgoing_originator_${revision.revision_id}`} style={{ marginBottom: 0 }}>
                              <span>{revision.outgoing_originator || '-'}</span>
                            </Form.Item>
                          </Col>
                        </Row>
                        <Row gutter={16} align="middle" style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                          <Col span={8} style={{ textAlign: "right", fontWeight: "bold" }}>IDC:</Col>
                          <Col span={10}>
                            <Form.Item name={`outgoing_idc_${revision.revision_id}`} style={{ marginBottom: 0 }}>
                              <span>
                                {revision.outgoing_idc ? moment(revision.outgoing_idc).format('DD.MM.YYYY') : '-'}
                              </span>
                            </Form.Item>
                          </Col>
                        </Row>
                      </Col>
                    )}

                    {/* Третья колонка - Review (Incoming Transmittal) */}
                    {(revision.incoming_transmittal_number || revision.incoming_issued) && (
                      <Col span={6}>
                        <Row gutter={16} align="middle" style={{ marginBottom: "8px" }}>
                          <Col span={24} style={{ textAlign: "center", fontWeight: "bold", padding: "8px" }}>
                            Review
                          </Col>
                        </Row>
                        <Row gutter={16} align="middle" style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                          <Col span={8} style={{ textAlign: "right", fontWeight: "bold" }}>Transmittal Number:</Col>
                          <Col span={16}>
                            <Form.Item name={`incoming_transmittal_number_${revision.revision_id}`} style={{ marginBottom: 0 }}>
                              <span>{revision.incoming_transmittal_number || '-'}</span>
                            </Form.Item>
                          </Col>
                        </Row>
                        <Row gutter={16} align="middle" style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                          <Col span={8} style={{ textAlign: "right", fontWeight: "bold" }}>Received:</Col>
                          <Col span={10}>
                            <Form.Item name={`incoming_issued_${revision.revision_id}`} style={{ marginBottom: 0 }}>
                              <span>
                                {revision.incoming_issued ? moment(revision.incoming_issued).format('DD.MM.YYYY') : '-'}
                              </span>
                            </Form.Item>
                          </Col>
                        </Row>
                        <Row gutter={16} align="middle" style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                          <Col span={8} style={{ textAlign: "right", fontWeight: "bold" }}>Review Code:</Col>
                          <Col span={16}>
                            <Form.Item name={`incoming_review_code_${revision.revision_id}`} style={{ marginBottom: 0 }}>
                              <span>{revision.incoming_review_code} - {revision.incoming_review_code_status}</span>
                            </Form.Item>
                          </Col>
                        </Row>
                        <Row gutter={16} align="middle" style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                          <Col span={8} style={{ textAlign: "right", fontWeight: "bold" }}>Responded:</Col>
                          <Col span={10}>
                            <Form.Item name={`incoming_responded_${revision.revision_id}`} style={{ marginBottom: 0 }}>
                              <span>
                                {revision.incoming_responded ? moment(revision.incoming_responded).format('DD.MM.YYYY') : '-'}
                              </span>
                            </Form.Item>
                          </Col>
                        </Row>
                        <Row gutter={16} align="middle" style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                          <Col span={8} style={{ textAlign: "right", fontWeight: "bold" }}>Contractor Responded:</Col>
                          <Col span={10}>
                            <Form.Item name={`incoming_contractor_responded_${revision.revision_id}`} style={{ marginBottom: 0 }}>
                              <span>
                                {revision.incoming_contractor_responded ? moment(revision.incoming_contractor_responded).format('DD.MM.YYYY') : '-'}
                              </span>
                            </Form.Item>
                          </Col>
                        </Row>
                        <Row gutter={16} align="middle" style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                          <Col span={8} style={{ textAlign: "right", fontWeight: "bold" }}>Waiting Response From:</Col>
                          <Col span={16}>
                            <Form.Item name={`incoming_waiting_response_from_${revision.revision_id}`} style={{ marginBottom: 0 }}>
                              <span>{revision.incoming_waiting_response_from || '-'}</span>
                            </Form.Item>
                          </Col>
                        </Row>
                      </Col>
                    )}

                      {/* Четвертая колонка */}
                      <Col span={6}>
                        <Row gutter={16} align="middle" style={{ marginBottom: '8px' }}>
                          <Col span={24} style={{ textAlign: 'center', fontWeight: 'bold', padding: '8px' }}>
                            Upload File
                          </Col>
                        </Row>
                        <Row gutter={16} align="middle">
                          <Col span={24} style={{ textAlign: 'left' }}>
                            <Form.Item name="file" style={{ marginBottom: 0 }}>
                              <Upload
                                {...uploadProps}
                                showUploadList={fileLoading ? false : { showRemoveIcon: true, showPreviewIcon: true }}
                              >
                                <Button icon={<UploadOutlined />}>Select file</Button>
                              </Upload>
                              {fileLoading && (
                                <div style={{ padding: '8px 0', textAlign: 'center', minHeight: '32px' }}>
                                  <Spin tip="Loading file..." />
                                </div>
                              )}
                            </Form.Item>
                          </Col>
                        </Row>
                        {isFilesDirty && (
                          <Row gutter={16} align="middle" style={{ marginBottom: '8px' }}>
                            <Col span={24} style={{ textAlign: 'center' }}>
                              <Button
                                type="primary"
                                onClick={handleSaveFiles}
                                disabled={fileList.length === 0}
                              >
                                Save Files
                              </Button>
                            </Col>
                          </Row>
                        )}
                      </Col>
                    </Row>
                  </TabPane>
                ))}
                {isNewRevisionTabOpen && (
                  <TabPane tab="New Revision" key="new_revision" closable={false}>
                    <Form form={newRevisionForm} layout="vertical" onValuesChange={handleNewRevisionFormChange}>
                      <Row gutter={16}>
                        {/* Первая колонка */}
                        <Col span={6}>
                          <Row gutter={16} align="middle" style={{ marginBottom: "8px" }}>
                            <Col span={24} style={{ textAlign: "center", fontWeight: "bold", padding: "8px" }}>
                              Revision Details
                            </Col>
                          </Row>
                          <Row gutter={16} align="middle" style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                            <Col span={8} style={{ textAlign: "right", fontWeight: "bold" }}>Status:</Col>
                            <Col span={16} style={{ display: 'flex', alignItems: 'center' }}>
                              <div className="clickable-wrapper">
                                <Form.Item name="new_revision_status" style={{ marginBottom: 0 }}>
                                  <Select
                                    style={{ width: '100%' }}
                                    placeholder="Select Revision Status"
                                  >
                                    {referenceStore.revisionStatuses.map(status => (
                                      <Option key={status.id} value={status.name}>
                                        {status.name}
                                      </Option>
                                    ))}
                                  </Select>
                                </Form.Item>
                              </div>
                            </Col>
                          </Row>
                          <Row gutter={16} align="middle" style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                            <Col span={8} style={{ textAlign: "right", fontWeight: "bold" }}>Step:</Col>
                            <Col span={16} style={{ display: 'flex', alignItems: 'center' }}>
                              <div className="clickable-wrapper">
                                <Form.Item name="new_revision_step" style={{ marginBottom: 0 }}>
                                  <Select
                                    showSearch
                                    placeholder="Select Revision Step"
                                    style={{ width: '100%' }}
                                    allowClear
                                    optionFilterProp="label"
                                    filterOption={(input, option) => {
                                      const code = option.label.split(' ')[0].toLowerCase();
                                      const description = option.label.split(' ').slice(1).join(' ').toLowerCase();
                                      return code.includes(input.toLowerCase()) || description.includes(input.toLowerCase());
                                    }}
                                    filterSort={(optionA, optionB) => {
                                      const nameA = optionA.label.split(' ').slice(1).join(' ').toLowerCase();
                                      const nameB = optionB.label.split(' ').slice(1).join(' ').toLowerCase();
                                      return nameA.localeCompare(nameB);
                                    }}
                                  >
                                    {referenceStore.revisionSteps.map(step => (
                                      <Option key={step.id} value={step.description} label={`${step.code} ${step.description}`}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                          <span style={{ width: 30, whiteSpace: 'nowrap', marginRight: '16px' }}>{step.code}</span>
                                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {step.description}
                                          </span>
                                        </div>
                                      </Option>
                                    ))}
                                  </Select>
                                </Form.Item>
                              </div>
                            </Col>
                          </Row>
                          <Row gutter={16} align="middle" style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                            <Col span={8} style={{ textAlign: "right", fontWeight: "bold" }}>Description</Col>
                            <Col span={16} style={{ display: 'flex', alignItems: 'center' }}>
                              <div className="clickable-wrapper">
                                <Form.Item name="new_revision_description" style={{ marginBottom: 0 }}>
                                  <Select
                                    showSearch
                                    placeholder="Select Revision Description"
                                    style={{ width: '100%' }}
                                    allowClear
                                    optionFilterProp="label"
                                    filterOption={(input, option) => {
                                      const code = option.label.split(' ')[0].toLowerCase();
                                      const description = option.label.split(' ').slice(1).join(' ').toLowerCase();
                                      return code.includes(input.toLowerCase()) || description.includes(input.toLowerCase());
                                    }}
                                    filterSort={(optionA, optionB) => {
                                      const nameA = optionA.label.split(' ').slice(1).join(' ').toLowerCase();
                                      const nameB = optionB.label.split(' ').slice(1).join(' ').toLowerCase();
                                      return nameA.localeCompare(nameB);
                                    }}
                                  >
                                    {referenceStore.revisionDescriptions.map(desc => (
                                      <Option key={desc.id} value={desc.description} label={`${desc.code} ${desc.description}`}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                          <span style={{ width: 30, whiteSpace: 'nowrap', marginRight: '16px' }}>{desc.code}</span>
                                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {desc.description}
                                          </span>
                                        </div>
                                      </Option>
                                    ))}
                                  </Select>
                                </Form.Item>
                              </div>
                            </Col>
                          </Row>
                        </Col>

                        {/* Четвертая колонка */}
                        <Col span={6}>
                          <Row gutter={16} align="middle" style={{ marginBottom: "8px" }}>
                            <Col span={24} style={{ textAlign: "center", fontWeight: "bold", padding: "8px" }}>
                              Upload Files
                            </Col>
                          </Row>
                          <Row gutter={16} align="middle" style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                            <Col span={24}>
                              <Form.Item name="new_file" style={{ marginBottom: 0 }}>
                                <Upload {...uploadProps}>
                                  <Button icon={<UploadOutlined />}>Select files</Button>
                                </Upload>
                              </Form.Item>
                            </Col>
                          </Row>
                          <Row gutter={16} align="middle" style={{ marginBottom: "8px" }}>
                            <Col span={24} style={{ textAlign: "center" }}>
                              <Button type="primary" onClick={handleSaveNewRevision} style={{ marginRight: 8 }}>
                                Save Revision
                              </Button>
                              <Button
                                onClick={() => {
                                  if (newRevisionFormDirty) {
                                    Modal.confirm({
                                      title: 'You have unsaved changes',
                                      content: 'Are you sure you want to cancel? All unsaved changes will be lost.',
                                      onOk: () => {
                                        setIsNewRevisionTabOpen(false);
                                        setNewRevisionFileList([]);
                                        newRevisionForm.resetFields();
                                        setNewRevisionFormDirty(false);
                                        const lastRevision = sortedRevisions[sortedRevisions.length - 1];
                                        setActiveTab(lastRevision.revision_id.toString());
                                      },
                                      onCancel: () => {
                                        // Остаёмся на текущей вкладке
                                      },
                                    });
                                  } else {
                                    setIsNewRevisionTabOpen(false);
                                    setNewRevisionFileList([]);
                                    newRevisionForm.resetFields();
                                    setNewRevisionFormDirty(false);
                                    const lastRevision = sortedRevisions[sortedRevisions.length - 1];
                                    setActiveTab(lastRevision.revision_id.toString());
                                  }
                                }}
                              >
                                Cancel
                              </Button>
                            </Col>
                          </Row>
                        </Col>
                      </Row>
                    </Form>
                  </TabPane>
                )}
              </Tabs>
            </Card>
          </Col>
        </Row>
      </Form>
      <Comments
        documentId={document_id}
        visible={commentsVisible}
        onClose={() => setCommentsVisible(false)}
        onCommentAdded={handleCommentAdded}
        onCommentDeleted={handleCommentDeleted}
      />
    </Modal>
  );
});

export default ViewDocument;