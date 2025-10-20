import React, { useState, useEffect, useRef } from 'react';
import { Table, Modal, Checkbox } from 'antd';
import { observer } from 'mobx-react-lite';
import { authStore } from './stores/auth';
import ViewDocument from './ViewDocument';
import { DocumentColumns } from './DocumentColumns';
import './index.css';

const DocumentTable = observer(({
  mainData,
  filteredDataSource,
  setFilteredDataSource,
  selectedRowKeys,
  setSelectedRowKeys,
  tableLoading,
  colorBgContainer,
  borderRadiusLG,
  customizeModalVisible,
  setCustomizeModalVisible,
  onTableRefresh,
  setCheckedColumns, // Новый проп для передачи checkedColumns наверх
}) => {
  const [recModalVisible, setRecModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [pageSize, setPageSize] = useState(18);
  const tableContainerRef = useRef(null);

  const CONTAINER_HEIGHTS = {
    '1920x1080': 659,
    '1366x768': 419,
    '1400x1050': 635,
    '1680x1050': 635,
    '1600x900': 515,
    '1440x900': 515,
    '1280x1024': 611,
  };

  const getResolution = () => `${window.screen.width}x${window.screen.height}`;
  const getContainerHeight = () => CONTAINER_HEIGHTS[getResolution()] || 659;

  const [checkedColumns, setLocalCheckedColumns] = useState(() => {
    const savedSettings = authStore.documentsColumnsSettings;
    return savedSettings
      ? savedSettings.filter(col => col.visible).map(col => col.key)
      : DocumentColumns.filter(col => !col.hidden).map(col => col.key);
  });

  // Синхронизируем локальное состояние с родительским через setCheckedColumns
  useEffect(() => {
    setCheckedColumns(checkedColumns);
  }, [checkedColumns, setCheckedColumns]);

  const calculatePageSize = () => {
    if (tableContainerRef.current) {
      const containerHeight = getContainerHeight();
      const filtersHeight = 112;
      const rowHeight = 24;
      const headerHeight = 24;
      const padding = 20;
      const availableHeight = containerHeight - filtersHeight - headerHeight - padding;
      const calculatedPageSize = Math.floor(availableHeight / rowHeight);
      setPageSize(Math.max(calculatedPageSize, 1));
    }
  };

  useEffect(() => {
    calculatePageSize();
    window.addEventListener('resize', calculatePageSize);
    return () => window.removeEventListener('resize', calculatePageSize);
  }, []);

  const onClickRow = (record) => {
    const documentId = Number(record?.document_id);
    if (isNaN(documentId)) {
      console.error('Invalid document_id:', record?.document_id);
      return;
    }
    setSelectedRecord(documentId);
    setRecModalVisible(true);
  };

  const closeModal = () => {
    setSelectedRecord(null);
    setRecModalVisible(false);
  };

  const handleDelete = (id) => {
    setMainData(prev => prev.filter(item => item.id !== id));
    setFilteredDataSource(prev => prev.filter(item => item.id !== id));
    setSelectedRowKeys(prev => prev.filter(key => key !== id));
  };

  const handleModalOk = () => {
    const updatedSettings = DocumentColumns.map(col => ({
      key: col.key,
      title: col.title,
      visible: checkedColumns.includes(col.key),
    }));
    authStore.setDocumentsColumnsSettings(updatedSettings);
    setCustomizeModalVisible(false);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys) => setSelectedRowKeys(newSelectedRowKeys),
  };

  const visibleColumns = DocumentColumns.filter(col => col.hidden || checkedColumns.includes(col.key));

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div ref={tableContainerRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
      <Table
        rowSelection={rowSelection}
        columns={visibleColumns}
        dataSource={filteredDataSource}
        loading={tableLoading}
        rowKey="revision_id"
        rowClassName="custom-table-row no-wrap hover-cursor"
        pagination={{ pageSize, showSizeChanger: false }}
        scroll={{ x: 'max-content' }}
        components={{
          header: { 
            cell: props => <th {...props} style={{ height: '24px', padding: '4px 8px', lineHeight: '24px', verticalAlign: 'middle', whiteSpace: 'nowrap', textAlign: 'center' }} /> 
          },
          body: { 
            row: props => <tr {...props} style={{ height: '24px' }} />, 
            cell: props => <td {...props} style={{ padding: '4px 8px', verticalAlign: 'middle', lineHeight: '16px' }} /> 
          },
        }}
        onRow={(record) => ({
          onClick: (e) => {
            const columnKey = e.target.closest('td')?.getAttribute('data-column-key');
            if (columnKey !== 'file') onClickRow(record);
          },
        })}
      />
        <ViewDocument
          document_id={selectedRecord}
          visible={recModalVisible}
          onClose={closeModal}
          onDelete={handleDelete}
          onUpdate={onTableRefresh}
        />
      </div>
      <Modal
        title="Customize Columns"
        open={customizeModalVisible}
        onOk={handleModalOk}
        onCancel={() => setCustomizeModalVisible(false)}
        okText="Save"
        cancelText="Cancel"
      >
        <div style={{ marginBottom: 16 }}>
          <button type="primary" size="small" onClick={() => setLocalCheckedColumns(DocumentColumns.filter(col => !col.hidden).map(col => col.key))} style={{ marginRight: 8 }}>
            Select All
          </button>
          <button type="default" size="small" onClick={() => setLocalCheckedColumns([])}>
            Clear All
          </button>
        </div>
        <Checkbox.Group
          value={checkedColumns}
          onChange={setLocalCheckedColumns}
          style={{ display: 'flex', flexDirection: 'column' }}
        >
          {DocumentColumns.filter(col => !col.hidden).map(col => (
            <Checkbox key={col.key} value={col.key} style={{ marginBottom: 8 }}>
              {col.title}
            </Checkbox>
          ))}
        </Checkbox.Group>
      </Modal>
    </div>
  );
});

export default DocumentTable;