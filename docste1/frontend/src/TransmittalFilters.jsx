import React, { useState } from 'react';
import { Form, Input, Button, Row, Col, Space, Tooltip } from 'antd';
import { observer } from 'mobx-react-lite';
import { FileExcelOutlined, CloseCircleOutlined, SettingOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import './index.css';

const TransmittalFilters = observer(({ onSubmit, filteredDataSource, onTableRefresh, onCustomize, mainData }) => {
  const initialFilters = {
    transmittal_number: '',
    transmittal_type: '',
    party: '',
    originator: '',
    username: '',
    transmittal_created: [],
  };

  const [filters, setFilters] = useState(initialFilters);

  const handleInputChange = (e, field) => {
    const value = e.target.value;
    setFilters(prevFilters => ({ ...prevFilters, [field]: value }));
    onSubmit({ ...filters, [field]: value });
  };

  const handleClearFilters = () => {
    setFilters(initialFilters);
    onSubmit(initialFilters);
  };

  const handleDownloadExcel = (data, fileName = 'transmittals_data.xlsx') => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <Form layout="vertical">
      <Row gutter={25}>
        <Col span={4}>
          <Form.Item>
            <Input
              placeholder="Transmittal Number"
              value={filters.transmittal_number}
              onChange={(e) => handleInputChange(e, 'transmittal_number')}
              allowClear
            />
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item>
            <Input
              placeholder="Type"
              value={filters.transmittal_type}
              onChange={(e) => handleInputChange(e, 'transmittal_type')}
              allowClear
            />
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item>
            <Input
              placeholder="Party"
              value={filters.party}
              onChange={(e) => handleInputChange(e, 'party')}
              allowClear
            />
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item>
            <Input
              placeholder="Originator"
              value={filters.originator}
              onChange={(e) => handleInputChange(e, 'originator')}
              allowClear
            />
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item>
            <Input
              placeholder="Username"
              value={filters.username}
              onChange={(e) => handleInputChange(e, 'username')}
              allowClear
            />
          </Form.Item>
        </Col>
        <Col span={4}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            <Space>
              <Button type="default" onClick={handleClearFilters} icon={<CloseCircleOutlined />}>
                Clear
              </Button>
              <Tooltip title="Download to Excel">
                <Button
                  type="default"
                  icon={<FileExcelOutlined style={{ color: '#52c41a' }} />}
                  onClick={() => handleDownloadExcel(filteredDataSource, 'transmittals_data.xlsx')}
                />
              </Tooltip>
              <Tooltip title="Customize Columns">
                <Button type="default" icon={<SettingOutlined />} onClick={onCustomize} />
              </Tooltip>
            </Space>
          </div>
        </Col>
      </Row>
    </Form>
  );
});

export default TransmittalFilters;