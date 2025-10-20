import React, { useState, useEffect, useRef } from 'react';
import { Table, Modal, Checkbox, Button } from 'antd';
import { observer } from 'mobx-react-lite';
import { authStore } from './stores/auth';
import { getTransmittals } from './Datasources';
import TransmittalFilters from './TransmittalFilters';
import './index.css';

const Transmittals = observer(({ colorBgContainer, borderRadiusLG }) => {
  const [mainData, setMainData] = useState([]);
  const [filteredDataSource, setFilteredDataSource] = useState([]);
  const [tableLoading, setTableLoading] = useState(true);
  const [customizeModalVisible, setCustomizeModalVisible] = useState(false);
  const [pageSize, setPageSize] = useState(18);
  const tableContainerRef = useRef(null);
  const filtersRef = useRef(null);

  const CONTAINER_HEIGHTS = {
    '1920x1080': 659,
    '1366x768': 419,
    '1400x1050': 635,
    '1680x1050': 635,
    '1600x900': 515,
    '1440x900': 515,
    '1280x1024': 611,
  };

  const getResolution = () => {
    const resolution = `${window.screen.width}x${window.screen.height}`;
    return resolution;
  };

  const getContainerHeight = () => {
    const resolution = getResolution();
    return CONTAINER_HEIGHTS[resolution] || 659;
  };

  const columns = [
    { title: 'Id', dataIndex: 'transmittal_id', key: 'transmittal_id', ellipsis: true, hidden: true },
    { title: 'Transmittal Number', dataIndex: 'transmittal_number', key: 'transmittal_number', ellipsis: true },
    { title: 'Type', dataIndex: 'transmittal_type', key: 'transmittal_type', ellipsis: true },
    { 
        title: 'Issued', 
        dataIndex: 'issued', 
        key: 'issued', 
        ellipsis: true,
        render: (value) =>
          value
            ? new Date(value).toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              }).replace(',', '')
            : '-',
    },
    { 
        title: 'Due Date', 
        dataIndex: 'due_date', 
        key: 'due_date', 
        ellipsis: true,
        render: (value) =>
          value
            ? new Date(value).toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              }).replace(',', '')
            : '-',
      },
    { title: 'Party', dataIndex: 'party', key: 'party', ellipsis: true },
    { 
      title: 'Created', 
      dataIndex: 'transmittal_created', 
      key: 'transmittal_created', 
      ellipsis: true,
      render: (value) =>
        value
          ? new Date(value).toLocaleString('ru-RU', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }).replace(',', '')
          : '-',
    },
    { 
      title: 'IDC', 
      dataIndex: 'idc', 
      key: 'idc', 
      ellipsis: true,
      render: (value) =>
        value
          ? new Date(value).toLocaleString('ru-RU', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            }).replace(',', '')
          : '-',
    },
    { title: 'Originator', dataIndex: 'originator', key: 'originator', ellipsis: true },
    { title: 'Username', dataIndex: 'username', key: 'username', ellipsis: true },
    { title: 'Project ID', dataIndex: 'project_id', key: 'project_id', ellipsis: true },
  ];

  const [checkedColumns, setCheckedColumns] = useState(() => {
    const savedSettings = authStore.transmittalsColumnsSettings;
    return savedSettings
      ? savedSettings.filter(col => col.visible).map(col => col.key)
      : columns.filter(col => !col.hidden).map(col => col.key);
  });

  const calculatePageSize = () => {
    if (tableContainerRef.current && filtersRef.current) {
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
    fetchTableData();
  }, [authStore.selectedProjectId]);

  useEffect(() => {
    const handleResize = () => {
      calculatePageSize();
    };
    calculatePageSize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchTableData = async () => {
    try {
      setTableLoading(true);
      setMainData([]);
      setFilteredDataSource([]);

      const response = await getTransmittals(authStore.selectedProjectId);
      setMainData(response);
      setFilteredDataSource(response);
    } catch (error) {
      console.error('Error fetching transmittals:', error);
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    handleFilterSubmit({});
  }, [mainData]);

  const handleFilterSubmit = (filters) => {
    let filteredData = [...mainData];

    const filterRules = {
      transmittal_number: { field: 'transmittal_number', match: 'partial' },
      transmittal_type: { field: 'transmittal_type', match: 'partial' },
      party: { field: 'party', match: 'partial' },
      originator: { field: 'originator', match: 'partial' },
      username: { field: 'username', match: 'partial' },
    };

    Object.keys(filterRules).forEach(filterKey => {
      if (filters[filterKey]) {
        const { field, match } = filterRules[filterKey];
        filteredData = filteredData.filter(item => {
          const itemValue = item[field];
          const filterValue = filters[filterKey];
          if (itemValue === null || itemValue === undefined) return false;
          return match === 'partial'
            ? String(itemValue).toLowerCase().includes(String(filterValue).toLowerCase())
            : itemValue === filterValue;
        });
      }
    });

    if (filters.transmittal_created && filters.transmittal_created.length === 2) {
      const startDate = filters.transmittal_created[0].startOf('day').toDate();
      const endDate = filters.transmittal_created[1].endOf('day').toDate();
      filteredData = filteredData.filter((item) => {
        const itemDate = new Date(item.transmittal_created);
        return itemDate >= startDate && itemDate <= endDate;
      });
    }

    setFilteredDataSource(filteredData);
  };

  const handleModalOk = () => {
    const updatedSettings = columns.map(col => ({
      key: col.key,
      title: col.title,
      visible: checkedColumns.includes(col.key),
    }));
    authStore.setTransmittalsColumnsSettings(updatedSettings);
    setCustomizeModalVisible(false);
  };

  const rowStyle = { height: '24px' };
  const cellStyle = { padding: '4px 8px' };

  const visibleColumns = columns.filter(col => col.hidden || checkedColumns.includes(col.key));

  return (
    <div style={{ padding: 10, background: colorBgContainer, borderRadius: borderRadiusLG, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div ref={filtersRef}>
        <TransmittalFilters
          onSubmit={handleFilterSubmit}
          filteredDataSource={filteredDataSource}
          onTableRefresh={fetchTableData}
          onCustomize={() => setCustomizeModalVisible(true)}
          mainData={mainData}
        />
      </div>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div ref={tableContainerRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <Table
            columns={visibleColumns}
            dataSource={filteredDataSource}
            loading={tableLoading}
            rowKey="transmittal_id"
            rowClassName={() => `custom-table-row no-wrap hover-cursor`}
            pagination={{ pageSize: pageSize, showSizeChanger: false }}
            components={{
              header: {
                cell: (props) => <th {...props} style={{ height: '24px', padding: '4px 8px', lineHeight: '24px', verticalAlign: 'middle' }} />,
              },
              body: {
                row: (props) => <tr {...props} style={rowStyle} />,
                cell: (props) => <td {...props} style={cellStyle} />,
              },
            }}
          />
        </div>
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
          <Button
            type="primary"
            size="small"
            onClick={() => setCheckedColumns(columns.filter(col => !col.hidden).map(col => col.key))}
            style={{ marginRight: 8 }}
          >
            Select All
          </Button>
          <Button
            type="default"
            size="small"
            onClick={() => setCheckedColumns([])}
          >
            Clear All
          </Button>
        </div>
        <Checkbox.Group
          value={checkedColumns}
          onChange={(checkedValues) => setCheckedColumns(checkedValues)}
          style={{ display: 'flex', flexDirection: 'column' }}
        >
          {columns.filter(col => !col.hidden).map(col => (
            <Checkbox key={col.key} value={col.key} style={{ marginBottom: 8 }}>
              {col.title}
            </Checkbox>
          ))}
        </Checkbox.Group>
      </Modal>
    </div>
  );
});

export default Transmittals;