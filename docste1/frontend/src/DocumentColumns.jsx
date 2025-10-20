import React from 'react';
import { Tooltip } from 'antd';
import {
  FileOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FilePptOutlined,
  FileImageOutlined,
  FileTextOutlined,
} from '@ant-design/icons';

const getFileIcon = (fileName) => {
  if (!fileName) return <FileOutlined style={{ color: '#8c8c8c' }} />;
  const extension = fileName.split('.').pop().toLowerCase();
  switch (extension) {
    case 'pdf': return <FilePdfOutlined style={{ color: '#ff4d4f' }} />;
    case 'doc': case 'docx': return <FileWordOutlined style={{ color: '#1890ff' }} />;
    case 'xls': case 'xlsx': return <FileExcelOutlined style={{ color: '#52c41a' }} />;
    case 'ppt': case 'pptx': return <FilePptOutlined style={{ color: '#fa8c16' }} />;
    case 'jpg': case 'jpeg': case 'png': case 'gif': case 'webp': return <FileImageOutlined style={{ color: '#13c2c2' }} />;
    case 'txt': return <FileTextOutlined style={{ color: '#595959' }} />;
    case 'dwg': return <FileOutlined style={{ color: '#722ed1' }} />;
    default: return <FileOutlined style={{ color: '#8c8c8c' }} />;
  }
};

export const DocumentColumns = [
  { title: 'Id', dataIndex: 'id', key: 'id', hidden: true },
  {
    title: 'File',
    key: 'file',
    render: (record) => {
      if (!record || typeof record !== 'object') return '-';
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
  { title: 'Document ID', dataIndex: 'document_number', key: 'document_number' },
  { 
    title: 'Title', 
    dataIndex: 'document_title', 
    key: 'document_title',
    width: 400,
    render: (text) => (
      <Tooltip title={text}>
        <span style={{ display: 'inline-block', maxWidth: '400px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '16px', height: '16px' }}>
          {text || '-'}
        </span>
      </Tooltip>
    )
  },
  { 
    title: 'Secondary Title', 
    dataIndex: 'document_title_native', 
    key: 'document_title_native',
    width: 400,
    render: (text) => (
      <Tooltip title={text}>
        <span style={{ display: 'inline-block', maxWidth: '400px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '16px', height: '16px' }}>
          {text || '-'}
        </span>
      </Tooltip>
    )
  },
  { title: 'Language', dataIndex: 'language', key: 'language' },
  { title: 'Discipline', dataIndex: 'discipline_code', key: 'discipline' },
  { title: 'Document Type', dataIndex: 'document_type_code', key: 'document_type' },
  { title: 'Revision Step', dataIndex: 'revision_step_code', key: 'revision_step' },
  {
    title: 'Revision',
    key: 'revision',
    render: (record) => `${record.revision_code || ''}${record.revision_number || ''}` || '-',
  },
  { title: 'Revision Description', dataIndex: 'revision_description', key: 'revision_description' },
  {
    title: 'Created',
    dataIndex: 'document_created',
    key: 'document_created',
    render: (value) => {
      const date = value ? new Date(value) : null;
      return date && !isNaN(date.getTime())
        ? date.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', '')
        : '-';
    },
  },
  {
    title: 'Last Revision Created',
    dataIndex: 'revision_created',
    key: 'revision_created',
    render: (value) => {
      const date = value ? new Date(value) : null;
      return date && !isNaN(date.getTime())
        ? date.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', '')
        : '-';
    },
  },
  { title: 'Outgoing Transmittal Number', dataIndex: 'outgoing_transmittal_number', key: 'outgoing_transmittal_number' },
  {
    title: 'Issued Date',
    dataIndex: 'outgoing_issued',
    key: 'outgoing_issued',
    render: (value) => {
      const date = value ? new Date(value) : null;
      return date && !isNaN(date.getTime())
        ? date.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(',', '')
        : '-';
    },
  },
  {
    title: 'Due Date',
    dataIndex: 'outgoing_due_date',
    key: 'outgoing_due_date',
    render: (value) => {
      const date = value ? new Date(value) : null;
      return date && !isNaN(date.getTime())
        ? date.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(',', '')
        : '-';
    },
  },
  {
    title: 'IDC',
    dataIndex: 'outgoing_idc',
    key: 'outgoing_idc',
    render: (value) => {
      const date = value ? new Date(value) : null;
      return date && !isNaN(date.getTime())
        ? date.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(',', '')
        : '-';
    },
  },
  { title: 'Originator', dataIndex: 'outgoing_originator', key: 'outgoing_originator' },
  { title: 'Incoming Transmittal Number', dataIndex: 'incoming_transmittal_number', key: 'incoming_transmittal_number' },
  {
    title: 'Received Date',
    dataIndex: 'incoming_issued',
    key: 'incoming_issued',
    render: (value) => {
      const date = value ? new Date(value) : null;
      return date && !isNaN(date.getTime())
        ? date.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(',', '')
        : '-';
    },
  },
  { title: 'Received From', dataIndex: 'incoming_party', key: 'incoming_party' },
  {
    title: 'Review Code/Status',
    key: 'review_code_status',
    render: (record) => `${record.incoming_review_code || ''} - ${record.incoming_review_code_status || ''}` || '-',
  },
  {
    title: 'Responded',
    dataIndex: 'incoming_responded',
    key: 'incoming_responded',
    render: (value) => {
      const date = value ? new Date(value) : null;
      return date && !isNaN(date.getTime())
        ? date.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(',', '')
        : '-';
    },
  },
  {
    title: 'Contractor Responded',
    dataIndex: 'incoming_contractor_responded',
    key: 'incoming_contractor_responded',
    render: (value) => {
      const date = value ? new Date(value) : null;
      return date && !isNaN(date.getTime())
        ? date.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(',', '')
        : '-';
    },
  },
  { title: 'Waiting Response From', dataIndex: 'incoming_waiting_response_from', key: 'incoming_waiting_response_from' },
];