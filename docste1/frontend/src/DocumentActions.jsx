import React from 'react';
import { Button, Space, Tooltip, Badge } from 'antd';
import {
  FileExcelOutlined,
  DownloadOutlined,
  FileDoneOutlined,
  FileAddOutlined,
  SettingOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { downloadFilesAsZip } from './Datasources';
import { DocumentColumns } from './DocumentColumns';

const DocumentActions = ({
  selectedRowKeys,
  filteredDataSource,
  onTableRefresh,
  onCustomize,
  onCreateDocument,
  onAddToTransmittal,
  transmittalCart,
  onCreateTransmittal,
  onClearTransmittalCart,
  onRemoveFromCart,
}) => {
  const handleDownloadExcel = () => {
    const visibleColumns = DocumentColumns.filter(col => col.hidden || true); // Предполагаем все видимы, если нет checkedColumns
    const exportData = filteredDataSource.map(row => {
      const rowData = {};
      visibleColumns.forEach(col => {
        if (col.render) {
          rowData[col.title] = col.render(row, row) || row[col.dataIndex] || '-';
        } else {
          rowData[col.title] = row[col.dataIndex] || '-';
        }
      });
      return rowData;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    XLSX.writeFile(workbook, 'table_data.xlsx');
  };

  const handleDownloadZip = async () => {
    try {
      const zipBlob = await downloadFilesAsZip(selectedRowKeys);
      saveAs(zipBlob, 'selected_files.zip');
    } catch (error) {
      console.error('Error creating ZIP archive:', error);
    }
  };

  return (
    <div
      style={{
        padding: '0px', // Внутренний отступ для содержимого
        marginTop: '10px', // Отступ сверху, чтобы поднять кнопки выше относительно фильтров
        marginBottom: '10px', // Отступ снизу для разделения с таблицей
        background: '#fff', // Фон, чтобы соответствовать дизайну
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <Space>
          <Button type="default" onClick={onTableRefresh} icon={<CloseCircleOutlined />}>
            Clear
          </Button>
          {selectedRowKeys.length > 0 && (
            <Tooltip title="Download as ZIP">
              <Button type="default" icon={<DownloadOutlined />} onClick={handleDownloadZip}>
                ({selectedRowKeys.length})
              </Button>
            </Tooltip>
          )}
          <Tooltip title="Download to Excel">
            <Button
              type="default"
              icon={<FileExcelOutlined style={{ color: '#52c41a' }} />}
              onClick={handleDownloadExcel}
            />
          </Tooltip>
          <Tooltip title="Customize Columns">
            <Button type="default" icon={<SettingOutlined />} onClick={onCustomize} />
          </Tooltip>
          <Tooltip title="Create Document">
            <Button type="primary" icon={<FileAddOutlined />} onClick={onCreateDocument} />
          </Tooltip>
          {selectedRowKeys.length > 0 && (
            <Tooltip title="Add to Transmittal List">
              <Button type="primary" icon={<FileDoneOutlined />} onClick={onAddToTransmittal}>
                ({selectedRowKeys.length})
              </Button>
            </Tooltip>
          )}
        </Space>
      </div>

      {transmittalCart.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            background: '#fff',
            padding: '10px 20px',
            borderRadius: 0,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            maxWidth: 300,
            minWidth: 250,
            animation: 'slideUp 0.3s ease-in-out',
          }}
        >
          <style>
            {`
              @keyframes slideUp {
                from { transform: translateY(100%); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
              }
            `}
          </style>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', marginRight: 8 }}>Transmittal Cart</span>
                <Badge count={transmittalCart.length} showZero style={{ backgroundColor: '#52c41a' }} />
              </div>
              <Button
                type="link"
                icon={<CloseCircleOutlined />}
                onClick={onClearTransmittalCart}
                style={{ padding: 0, height: 'auto' }}
              />
            </div>
            <div style={{ maxHeight: 100, overflowY: 'auto' }}>
              {transmittalCart.map(item => (
                <div
                  key={item.revision_id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 5,
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                    {item.document_number}
                  </span>
                  <Button
                    type="link"
                    danger
                    icon={<CloseCircleOutlined />}
                    onClick={() => onRemoveFromCart(item.revision_id)}
                  />
                </div>
              ))}
            </div>
            <Button type="primary" block onClick={onCreateTransmittal}>
              Create Transmittal
            </Button>
          </Space>
        </div>
      )}
    </div>
  );
};

export default DocumentActions;