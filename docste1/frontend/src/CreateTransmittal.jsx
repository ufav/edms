import React, { useState } from 'react';
import { Modal, Form, Input, Select, DatePicker, Button, Row, Col, Card, Table, Radio, Tooltip, notification } from 'antd';
import { observer } from 'mobx-react-lite';
import { authStore } from './stores/auth';
import { referenceStore } from './stores/reference';
import { PlusOutlined, CloseOutlined } from '@ant-design/icons';
import moment from 'moment'; // Добавляем moment для работы с датами
import {
  FileOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FilePptOutlined,
  FileImageOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { createTransmittal } from './Datasources';

const { Option } = Select;
const { TextArea } = Input;

const getFileIcon = (fileName) => {
  if (!fileName) return <FileOutlined style={{ color: '#8c8c8c' }} />;
  const extension = fileName.split('.').pop().toLowerCase();
  switch (extension) {
    case 'pdf':
      return <FilePdfOutlined style={{ color: '#ff4d4f' }} />;
    case 'doc':
    case 'docx':
      return <FileWordOutlined style={{ color: '#1890ff' }} />;
    case 'xls':
    case 'xlsx':
      return <FileExcelOutlined style={{ color: '#52c41a' }} />;
    case 'ppt':
    case 'pptx':
      return <FilePptOutlined style={{ color: '#fa8c16' }} />;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
      return <FileImageOutlined style={{ color: '#13c2c2' }} />;
    case 'txt':
      return <FileTextOutlined style={{ color: '#595959' }} />;
    case 'dwg':
      return <FileOutlined style={{ color: '#722ed1' }} />;
    default:
      return <FileOutlined style={{ color: '#8c8c8c' }} />;
  }
};

const CreateTransmittal = observer(({ visible, onClose, selectedRecords, onTableRefresh, onTransmittalCreated }) => {
  const [form] = Form.useForm();
  const [transmittalType, setTransmittalType] = useState('Outgoing');
  const [submitting, setSubmitting] = useState(false);
  const [showDueDate, setShowDueDate] = useState(false); // Состояние для видимости Due Date

  const handleResetForm = () => {
    setTransmittalType('Outgoing');
    setShowDueDate(false); // Скрываем Due Date при сбросе
    form.resetFields();
  };

  const handleModalClose = () => {
    handleResetForm();
    onClose();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const values = await form.validateFields();
      const transmittalData = {
        type: transmittalType,
        party_id: values.party_id,
        transmittal_number: values.transmittal_number,
        issued: values.issued.format('YYYY-MM-DD'),
        user_id: authStore.user_id,
        revision_ids: selectedRecords.map(record => record.revision_id),
      };
  
      if (transmittalType === 'Outgoing') {
        transmittalData.due_date = values.due_date ? values.due_date.format('YYYY-MM-DD') : null;
        transmittalData.originator_id = values.originator_id;
        transmittalData.idc = values.idc ? values.idc.format('YYYY-MM-DD') : null;
      } else if (transmittalType === 'Incoming') {
        transmittalData.review_code_id = values.review_code_id || null; // Код ревью (опционально)
        transmittalData.responded = values.responded ? values.responded.format('YYYY-MM-DD') : null;
        transmittalData.contractor_responded = values.contractor_responded ? values.contractor_responded.format('YYYY-MM-DD') : null;
        transmittalData.waiting_response_from_id = values.waiting_response_from_id || null; // ID компании, от которой ждём ответа
        transmittalData.remarks = values.remarks || null;
      }
  
      const result = await createTransmittal(transmittalData);
  
      if (result.success) {
        notification.success({
          message: 'Transmittal created successfully',
          description: `Transmittal Number: ${transmittalData.transmittal_number}`,
        });
        if (onTableRefresh) await onTableRefresh();
        if (onTransmittalCreated) onTransmittalCreated();
        handleModalClose();
      } else {
        notification.error({ message: 'Failed to create transmittal', description: result.message });
      }
    } catch (error) {
      console.error('Error creating transmittal:', error);
      notification.error({ message: 'Error creating transmittal. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'File',
      key: 'file',
      ellipsis: true,
      render: (record) => {
        const fileName = record.file_name;
        const fileUrl = record.file_url;
        if (!fileName || !fileUrl) return '-';
        return (
          <Tooltip title={fileName}>
            <span style={{ display: 'flex', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
              {getFileIcon(fileName)}{' '}
              <a href={fileUrl} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 4, color: '#1890ff' }} onClick={(e) => e.stopPropagation()}>
                {fileName}
              </a>
            </span>
          </Tooltip>
        );
      },
    },
    { title: 'Document ID', dataIndex: 'document_number', key: 'document_number', ellipsis: true },
    { title: 'Title', dataIndex: 'document_title', key: 'document_title', ellipsis: true },
    { title: 'Discipline', dataIndex: 'discipline_code', key: 'discipline', ellipsis: true },
    { title: 'Document Type', dataIndex: 'document_type_code', key: 'document_type', ellipsis: true },
    { title: 'Revision Step', dataIndex: 'revision_step_code', key: 'revision_step', ellipsis: true },
    {
      title: 'Revision',
      key: 'revision',
      ellipsis: true,
      render: (record) => {
        const revisionCode = record.revision_code || '';
        const revisionNumber = record.revision_number || '';
        return `${revisionCode}${revisionNumber}` || '-';
      },
    },
    {
      title: 'Created',
      dataIndex: 'document_created',
      key: 'document_created',
      ellipsis: true,
      render: (value) =>
        value
          ? new Date(value).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', '')
          : '-',
    },
    {
      title: 'Revision Created',
      dataIndex: 'revision_created',
      key: 'revision_created',
      ellipsis: true,
      render: (value) =>
        value
          ? new Date(value).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', '')
          : '-',
    },
  ];

  const tableScroll = selectedRecords.length > 8 ? { y: 192 } : undefined;

  // Функция для вычисления Due Date (+14 дней от Issued)
  const calculateDueDate = (issuedDate) => {
    if (!issuedDate) return null;
    return moment(issuedDate).add(14, 'days').format('DD.MM.YYYY');
  };

  return (
    <Modal
      title="Create Transmittal"
      open={visible}
      onCancel={handleModalClose}
      width="95%"
      centered
      style={{ height: '95vh', margin: 'auto' }}
      styles={{
        content: { height: '100%', overflow: 'hidden' },
        body: { height: 'calc(100% - 55px)', overflow: 'hidden' },
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
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={24}>
            <Radio.Group
              value={transmittalType}
              onChange={(e) => {
                setTransmittalType(e.target.value);
                form.resetFields();
                setShowDueDate(false); // Скрываем Due Date при переключении типа
              }}
              buttonStyle="solid"
            >
              <Radio.Button value="Outgoing">Outgoing Transmittal</Radio.Button>
              <Radio.Button value="Incoming">Incoming Transmittal</Radio.Button>
            </Radio.Group>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Card title="Transmittal Details">
              <Row gutter={16}>
                {/* Первая колонка - Общие поля */}
                <Col span={8}>
                  <Row gutter={16} align="middle" style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <Col span={6} style={{ textAlign: 'right', fontWeight: 'bold' }}>Number:</Col>
                    <Col span={15}>
                      <Form.Item name="transmittal_number" rules={[{ required: true, message: 'Please enter transmittal number' }]} style={{ marginBottom: 0 }}>
                        <Input placeholder="Transmittal Number" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16} align="middle" style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <Col span={6} style={{ textAlign: 'right', fontWeight: 'bold' }}>
                      {transmittalType === 'Outgoing' ? 'Send To:' : 'Received From:'}
                    </Col>
                    <Col span={11}>
                      <Form.Item name="party_id" style={{ marginBottom: 0 }}>
                        <Select showSearch placeholder="Select Company" loading={referenceStore.isLoading} allowClear optionFilterProp="label">
                          {(referenceStore.companies || []).map(comp => (
                            <Option key={comp.id} value={comp.id} label={comp.name}>
                              {comp.name}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16} align="middle" style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <Col span={6} style={{ textAlign: 'right', fontWeight: 'bold' }}>
                      {transmittalType === 'Outgoing' ? 'Issued:' : 'Received:'}
                    </Col>
                    <Col span={7}>
                      <Form.Item
                      name="issued"
                      rules={[{ required: true, message: 'Please select date' }]}
                      style={{ marginBottom: 0 }}
                      >
                        <DatePicker
                          style={{ width: '100%' }}
                          format="DD.MM.YYYY"
                          onChange={(date) => {
                          setShowDueDate(!!date);
                          if (date) {
                            const issuedString = date.format('DD.MM.YYYY');
                            const dueDate = moment(issuedString, 'DD.MM.YYYY').add(14, 'days');
                            form.setFieldsValue({ due_date: dueDate });
                          } else {
                            form.setFieldsValue({ due_date: null });
                          }}}
                        />
                        </Form.Item>
                    </Col>
                    </Row>
                </Col>

                {/* Вторая колонка - Outgoing + Review Code, Responded, Contractor Resp. для Incoming */}
                <Col span={8}>
                  {transmittalType === 'Outgoing' && (
                    <>
                      <Row gutter={16} align="middle" style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                        <Col span={6} style={{ textAlign: 'right', fontWeight: 'bold' }}>Originator:</Col>
                        <Col span={12}>
                          <Form.Item name="originator_id" style={{ marginBottom: 0 }}>
                            <Select showSearch placeholder="Select Originator" loading={referenceStore.isLoading} allowClear optionFilterProp="label">
                              {(referenceStore.originators || []).map(orig => (
                                <Option key={orig.id} value={orig.id} label={orig.name}>
                                  {orig.name}
                                </Option>
                              ))}
                            </Select>
                          </Form.Item>
                        </Col>
                      </Row>
                      <Row gutter={16} align="middle" style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                        <Col span={6} style={{ textAlign: 'right', fontWeight: 'bold' }}>IDC:</Col>
                        <Col span={7}>
                          <Form.Item name="idc" style={{ marginBottom: 0 }}>
                            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
                          </Form.Item>
                        </Col>
                      </Row>
                      {showDueDate && (
                        <Row gutter={16} align="middle" style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                            <Col span={6} style={{ textAlign: 'right', fontWeight: 'bold' }}>Due Date:</Col>
                            <Col span={7}>
                            <Form.Item name="due_date" style={{ marginBottom: 0 }}>
                                <span>{form.getFieldValue('due_date')?.format('DD.MM.YYYY') || ''}</span>
                            </Form.Item>
                            </Col>
                        </Row>
                      )}
                    </>
                  )}
                  {transmittalType === 'Incoming' && (
                    <>
                      <Row gutter={16} align="middle" style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                        <Col span={6} style={{ textAlign: 'right', fontWeight: 'bold' }}>Review Code:</Col>
                        <Col span={10}>
                          <Form.Item name="review_code_id" style={{ marginBottom: 0 }}>
                            <Input placeholder="Review Code (optional)" />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Row gutter={16} align="middle" style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                        <Col span={6} style={{ textAlign: 'right', fontWeight: 'bold' }}>Responded:</Col>
                        <Col span={7}>
                          <Form.Item name="responded" style={{ marginBottom: 0 }}>
                            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Row gutter={16} align="middle" style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                        <Col span={6} style={{ textAlign: 'right', fontWeight: 'bold' }}>Contractor Resp.:</Col>
                        <Col span={7}>
                          <Form.Item name="contractor_responded" style={{ marginBottom: 0 }}>
                            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
                          </Form.Item>
                        </Col>
                      </Row>
                    </>
                  )}
                </Col>

                {/* Третья колонка - Status и Remarks для Incoming */}
                <Col span={8}>
                  {transmittalType === 'Incoming' && (
                    <>
                      <Row gutter={16} align="middle" style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                        <Col span={6} style={{ textAlign: 'right', fontWeight: 'bold' }}>Waiting Response from:</Col>
                        <Col span={11}>
                          <Form.Item name="waiting_response_from_id" style={{ marginBottom: 0 }}>
                            <Select showSearch placeholder="Select Company" loading={referenceStore.isLoading} allowClear optionFilterProp="label">
                              {(referenceStore.companies || []).map(comp => (
                                <Option key={comp.id} value={comp.id} label={comp.name}>
                                  {comp.name}
                                </Option>
                              ))}
                            </Select>
                          </Form.Item>
                        </Col>
                      </Row>
                      <Row gutter={16} align="middle" style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                        <Col span={6} style={{ textAlign: 'right', fontWeight: 'bold', alignSelf: 'flex-start' }}>Remarks:</Col>
                        <Col span={18}>
                          <Form.Item name="remarks" style={{ marginBottom: 0 }}>
                            <TextArea placeholder="Remarks (optional)" rows={3} style={{ resize: 'none' }} />
                          </Form.Item>
                        </Col>
                      </Row>
                    </>
                  )}
                </Col>
              </Row>
            </Card>

            <Card title="Selected Revisions" style={{ marginTop: 10 }}>
              <Table
                columns={columns}
                dataSource={selectedRecords}
                rowKey="revision_id"
                pagination={false}
                size="small"
                scroll={tableScroll}
                components={{
                  header: {
                    wrapper: (props) => <thead {...props} style={{ position: 'sticky', top: 0, zIndex: 1, background: '#fff' }} />,
                  },
                  body: {
                    row: (props) => <tr {...props} style={{ height: '24px' }} />,
                  },
                }}
              />
            </Card>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
});

export default CreateTransmittal;