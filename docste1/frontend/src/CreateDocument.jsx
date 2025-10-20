import React, { useState, useEffect, useRef } from 'react';
import { Modal, Form, Input, Select, Card, Row, Col, Upload, notification, Button } from 'antd';
import { observer } from 'mobx-react-lite';
import { authStore } from './stores/auth';
import { referenceStore } from './stores/reference';
import {
  InboxOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileWordOutlined,
  FileUnknownOutlined,
  PlusOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { createDocument } from './Datasources';

const { Dragger } = Upload;
const { Option } = Select;

const CreateDocument = observer(({ visible, onClose, onTableRefresh }) => {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [documentNumber, setDocumentNumber] = useState('');
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentTitleNative, setDocumentTitleNative] = useState('');
  const [discipline, setDiscipline] = useState(undefined);
  const [documentType, setDocumentType] = useState(undefined);
  const [documentLanguage, setDocumentLanguage] = useState(undefined);
  const [drsCode, setDrsCode] = useState('');
  const [modalHeight, setModalHeight] = useState('80vh');
  const [revisionStatus, setRevisionStatus] = useState(undefined);
  const [revisionStep, setRevisionStep] = useState(undefined);
  const [revisionDescription, setRevisionDescription] = useState(undefined);
  const [submitting, setSubmitting] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    if (visible) {
      handleResetForm();
    }
  }, [visible]);

  useEffect(() => {
    if (visible && contentRef.current) {
      const contentHeight = contentRef.current.clientHeight;
      const newHeight = Math.min(contentHeight + 100, window.innerHeight * 0.9);
      setModalHeight(`${newHeight}px`);
    }
  }, [visible, fileList]);

  const handlePreview = async (file) => {
    const src = URL.createObjectURL(file.originFileObj);
    const imgWindow = window.open(src);
    imgWindow.onunload = () => URL.revokeObjectURL(src);
  };

  const handleChange = ({ fileList: newFileList }) => {
    setFileList(newFileList.slice(-1));
  };

  const getFileIcon = (file) => {
    const { type } = file;
    if (type.includes('pdf')) return <FilePdfOutlined style={{ fontSize: 24 }} />;
    if (type.includes('image')) return <FileImageOutlined style={{ fontSize: 24 }} />;
    if (type.includes('word')) return <FileWordOutlined style={{ fontSize: 24 }} />;
    return <FileUnknownOutlined style={{ fontSize: 24 }} />;
  };

  const handleSubmit = async () => {
    if (referenceStore.isLoading) {
      notification.error({ message: 'Reference data is still loading. Please wait.' });
      return;
    }

    setSubmitting(true);
    try {
      await form.validateFields();
      const documentData = {
        document_number: documentNumber,
        document_title: documentTitle,
        document_title_native: documentTitleNative,
        project_id: authStore.selectedProjectId,
        discipline_id: discipline,
        document_type_id: documentType,
        language_id: documentLanguage,
        drs: drsCode,
        revision_status_id: revisionStatus,
        revision_step_id: revisionStep,
        revision_description_id: revisionDescription,
        user_id: authStore.user_id,
      };

      const files = fileList.map(file => file.originFileObj);
      const result = await createDocument(documentData, files);

      if (result.success) {
        const documentId = result.document_id;
        notification.success({
          message: 'Document added successfully',
          description: `Document ID: ${documentId}`,
        });
        if (onTableRefresh) {
          console.log('Calling onTableRefresh to refresh table data');
          await onTableRefresh();
        }
        handleModalClose();
      } else {
        notification.error({ message: 'Failed to add document', description: result.message });
      }
    } catch (error) {
      console.error('Error creating document:', error);
      notification.error({ message: 'Error creating document. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setDocumentNumber('');
    setDocumentTitle('');
    setDocumentTitleNative('');
    setDiscipline(undefined);
    setDocumentType(undefined);
    setDocumentLanguage(undefined);
    setDrsCode('');
    setFileList([]);
    setRevisionStatus(undefined);
    setRevisionStep(undefined);
    setRevisionDescription(undefined);
    form.resetFields();
  };

  const handleModalClose = () => {
    handleResetForm();
    onClose();
  };

  return (
    <Modal
      title="Create New Document"
      open={visible}
      onCancel={handleModalClose}
      width={"95%"} // Фиксированная ширина, например, 1200px
      centered // Центрирование по вертикали и горизонтали
      style={{ height: '95vh', margin: 'auto' }} // Высота 95% рабочей области браузера
      styles={{
        content: { height: '100%', overflow: 'hidden' }, // Фиксируем высоту контента без прокрутки
        body: { height: 'calc(100% - 55px)', overflow: 'hidden' }, // Учитываем высоту заголовка, убираем прокрутку
      }}
      footer={[
        <Button key="create" type="primary" htmlType="submit" onClick={handleSubmit} icon={<PlusOutlined />} loading={submitting}>
          Create
        </Button>,
        <Button key="cancel" onClick={handleModalClose} icon={<CloseOutlined />}>
          Cancel
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={24}>
            <Card title="Details">
              <Row gutter={16} align="middle" style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <Col span={2} style={{ textAlign: 'right', fontWeight: 'bold' }}>ID:</Col>
                <Col span={5}>
                  <Form.Item name="document_number" style={{ marginBottom: 0 }}>
                    <Input
                      placeholder="Document Number"
                      value={documentNumber}
                      onChange={(e) => setDocumentNumber(e.target.value)}
                    />
                  </Form.Item>
                </Col>
                <Col span={5} />
                <Col span={2} style={{ textAlign: 'right', fontWeight: 'bold' }}>Discipline:</Col>
                <Col span={7}>
                  <Form.Item name="discipline" style={{ marginBottom: 0 }}>
                    <Select
                      showSearch
                      placeholder="Select Discipline"
                      value={discipline}
                      onChange={(value) => setDiscipline(value)}
                      loading={referenceStore.isLoading}
                      disabled={referenceStore.isLoading}
                      allowClear
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
                      style={{ width: '100%' }}
                    >
                      {(referenceStore.disciplines || []).map(disc => (
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
                </Col>
              </Row>
              <Row gutter={16} align="middle" style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <Col span={2} style={{ textAlign: 'right', fontWeight: 'bold' }}>Title:</Col>
                <Col span={10}>
                  <Form.Item name="document_title" style={{ marginBottom: 0 }}>
                    <Input
                      placeholder="Document Title"
                      value={documentTitle}
                      onChange={(e) => setDocumentTitle(e.target.value)}
                    />
                  </Form.Item>
                </Col>
                <Col span={2} style={{ textAlign: 'right', fontWeight: 'bold' }}>Document Type:</Col>
                <Col span={9}>
                  <Form.Item name="document_type" style={{ marginBottom: 0 }}>
                    <Select
                      showSearch
                      placeholder="Select Document Type"
                      value={documentType}
                      onChange={(value) => setDocumentType(value)}
                      loading={referenceStore.isLoading}
                      disabled={referenceStore.isLoading}
                      allowClear
                      style={{ width: '100%' }}
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
                      {(referenceStore.documentTypes || []).map(docType => (
                        <Option key={docType.id} value={docType.id} label={`${docType.code} ${docType.name}`}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ width: 30, whiteSpace: 'nowrap', marginRight: '16px' }}>{docType.code}</span>
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {docType.name}
                            </span>
                          </div>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16} align="middle" style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <Col span={2} style={{ textAlign: 'right', fontWeight: 'bold' }}>Secondary Title:</Col>
                <Col span={10}>
                  <Form.Item name="document_title_native" style={{ marginBottom: 0 }}>
                    <Input
                      placeholder="Document Title Native"
                      value={documentTitleNative}
                      onChange={(e) => setDocumentTitleNative(e.target.value)}
                    />
                  </Form.Item>
                </Col>
                <Col span={2} style={{ textAlign: 'right', fontWeight: 'bold' }}>DRS Code:</Col>
                <Col span={5}>
                  <Form.Item name="drs_code" style={{ marginBottom: 0 }}>
                    <Input
                      placeholder="DRS Code"
                      value={drsCode}
                      onChange={(e) => setDrsCode(e.target.value)}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16} align="middle" style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <Col span={2} style={{ textAlign: 'right', fontWeight: 'bold' }}>Language:</Col>
                <Col span={2}>
                  <Form.Item name="document_language" style={{ marginBottom: 0 }}>
                    <Select
                      showSearch
                      placeholder="Select Document Language"
                      value={documentLanguage}
                      onChange={(value) => setDocumentLanguage(value)}
                      loading={referenceStore.isLoading}
                      disabled={referenceStore.isLoading}
                      allowClear
                      style={{ width: '100%' }}
                    >
                      {(referenceStore.languages || []).map(lang => (
                        <Option key={lang.id} value={lang.id}>
                          {lang.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8} />
              </Row>
            </Card>

            <Card title="First Revision" style={{ marginTop: 10 }}>
              <Row gutter={16}>
                <Col span={6}>
                  <Row gutter={16} align="middle" style={{ marginBottom: '8px' }}>
                    <Col span={24} style={{ textAlign: 'center', fontWeight: 'bold', padding: '8px' }}>
                      Revision Details
                    </Col>
                  </Row>
                  <Row gutter={16} align="middle" style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <Col span={8} style={{ textAlign: 'right', fontWeight: 'bold' }}>Status:</Col>
                    <Col span={16}>
                      <Form.Item name="revision_status" style={{ marginBottom: 0 }}>
                        <Select
                          style={{ width: '100%' }}
                          value={revisionStatus}
                          onChange={(value) => setRevisionStatus(value)}
                          loading={referenceStore.isLoading}
                          disabled={referenceStore.isLoading}
                          allowClear
                          placeholder="Select Revision Status"
                        >
                          {(referenceStore.revisionStatuses || []).map(status => (
                            <Option key={status.id} value={status.id}>
                              {status.name}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16} align="middle" style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <Col span={8} style={{ textAlign: 'right', fontWeight: 'bold' }}>Step:</Col>
                    <Col span={16}>
                      <Form.Item name="revision_step" style={{ marginBottom: 0 }}>
                        <Select
                          showSearch
                          placeholder="Select Revision Step"
                          style={{ width: '100%' }}
                          value={revisionStep}
                          onChange={(value) => setRevisionStep(value)}
                          loading={referenceStore.isLoading}
                          disabled={referenceStore.isLoading}
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
                          {(referenceStore.revisionSteps || []).map(step => (
                            <Option key={step.id} value={step.id} label={`${step.code} ${step.description}`}>
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
                    </Col>
                  </Row>
                  <Row gutter={16} align="middle" style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <Col span={8} style={{ textAlign: 'right', fontWeight: 'bold' }}>Description:</Col>
                    <Col span={16}>
                      <Form.Item name="revision_description" style={{ marginBottom: 0 }}>
                        <Select
                          showSearch
                          placeholder="Select Revision Description"
                          style={{ width: '100%' }}
                          value={revisionDescription}
                          onChange={(value) => setRevisionDescription(value)}
                          loading={referenceStore.isLoading}
                          disabled={referenceStore.isLoading}
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
                          {(referenceStore.revisionDescriptions || []).map(desc => (
                            <Option key={desc.id} value={desc.id} label={`${desc.code} ${desc.description}`}>
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
                    </Col>
                  </Row>
                </Col>
                <Col span={6}>
                  <Row gutter={16} align="middle" style={{ marginBottom: '8px' }}>
                    <Col span={24} style={{ textAlign: 'center', fontWeight: 'bold', padding: '8px' }}>
                      Upload File
                    </Col>
                  </Row>
                  <Row gutter={16} align="middle" style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <Col span={24}>
                      <Form.Item name="file" style={{ marginBottom: 0 }}>
                        <Upload
                          maxCount={1} // Ограничение до 1 файла
                          beforeUpload={() => false} // Предотвращаем автоматическую загрузку
                          onChange={handleChange}
                          fileList={fileList}
                          listType="picture"
                          onPreview={handlePreview}
                          iconRender={getFileIcon}
                        >
                          <Button icon={<PlusOutlined />}>Upload File</Button>
                        </Upload>
                      </Form.Item>
                    </Col>
                  </Row>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
});

export default CreateDocument;