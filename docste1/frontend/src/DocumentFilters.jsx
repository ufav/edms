import React, { useState } from 'react';
import { Form, Input, Select, DatePicker, Row, Col } from 'antd';
import { observer } from 'mobx-react-lite';
import { referenceStore } from './stores/reference';
import { authStore } from './stores/auth';
import { SearchOutlined } from '@ant-design/icons';
import './index.css';

const { RangePicker } = DatePicker;
const { Option } = Select;

const DocumentFilters = observer(({ onSubmit, filteredDataSource, onTableRefresh, selectedRowKeys, mainData, checkedColumns }) => {
  const initialFilters = {
    document_number: '',
    document_title: '',
    discipline: '',
    document_type: '',
    revision_status: '',
    revision_step: '',
    revision_description: '',
    outgoing_originator: '',
    document_created: [],
    revision_created: [],
  };

  const [filters, setFilters] = useState(initialFilters);
  const [tags, setTags] = useState([]);

  const handleInputChange = (e, field) => {
    const value = e.target.value;
    setFilters(prevFilters => ({ ...prevFilters, [field]: value }));
    onSubmit({ ...filters, [field]: value });
  };

  const handleDateChange = (dates) => {
    setFilters({ ...filters, document_created: dates });
    onSubmit({ ...filters, document_created: dates });
  };

  const handleSelectChange = (value, field) => {
    setFilters(prevFilters => ({ ...prevFilters, [field]: value }));
    onSubmit({ ...filters, [field]: value });

    if (field === 'discipline' && authStore.selectedProjectId) {
      referenceStore.loadProjectDisciplineDocumentTypes(authStore.selectedProjectId, value);
    }
    if (field === 'revision_description' && authStore.selectedProjectId) {
      referenceStore.loadProjectRevisionDescriptionRevisionSteps(authStore.selectedProjectId, value);
    }
  };

  const handleTagsChange = (value) => {
    setTags(value);
    onSubmit({ ...filters, searchTags: value });
  };

  const selectStyle = { width: '100%', paddingLeft: '30px' };

  return (
    <Form
      layout="vertical"
      style={{
        padding: '0px', // Увеличиваем внутренний отступ для симметрии
        marginBottom: '0px', // Уменьшаем нижний отступ, чтобы сократить пространство
        background: '#fff',
      }}
    >
      <Row gutter={[16, 8]}> {/* Уменьшаем вертикальный gutter с 25 до 8 */}
        <Col span={4}>
          <Form.Item style={{ marginBottom: 5 }}> {/* Убираем отступ снизу у Form.Item */}
            <Input
              placeholder="Document Number"
              value={filters.document_number}
              onChange={(e) => handleInputChange(e, 'document_number')}
              allowClear
            />
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item style={{ marginBottom: 10 }}>
            <Input
              placeholder="Document Title"
              value={filters.document_title}
              onChange={(e) => handleInputChange(e, 'document_title')}
              allowClear
            />
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item style={{ marginBottom: 10 }}>
            <Select
              showSearch
              placeholder="Select Discipline"
              value={filters.discipline !== '' ? filters.discipline : undefined}
              onChange={(value) => handleSelectChange(value, 'discipline')}
              loading={referenceStore.isLoading}
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
              dropdownRender={menu => (
                <div>
                  <div style={{ display: 'flex', padding: '8px 8px 0', borderBottom: '1px solid #e8e8e8', fontWeight: 'bold' }}>
                    <span style={{ width: 'auto', whiteSpace: 'nowrap', marginRight: '16px' }}>Code</span>
                    <span style={{ flex: 1 }}>Name</span>
                  </div>
                  {menu}
                </div>
              )}
            >
              {referenceStore.disciplines.length > 0 ? (
                referenceStore.disciplines.map(option => (
                  <Option key={option.id} value={option.id} label={`${option.code} ${option.name}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ width: 30, whiteSpace: 'nowrap', marginRight: '16px' }}>{option.code}</span>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{option.name}</span>
                    </div>
                  </Option>
                ))
              ) : (
                <Option disabled value={null}>
                  No disciplines available
                </Option>
              )}
            </Select>
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item style={{ marginBottom: 10 }}>
            <Select
              showSearch
              placeholder="Select Document Type"
              value={filters.document_type !== '' ? filters.document_type : undefined}
              onChange={(value) => handleSelectChange(value, 'document_type')}
              loading={referenceStore.isLoading}
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
              dropdownRender={menu => (
                <div>
                  <div style={{ display: 'flex', padding: '8px 8px 0', borderBottom: '1px solid #e8e8e8', fontWeight: 'bold' }}>
                    <span style={{ width: 'auto', whiteSpace: 'nowrap', marginRight: '16px' }}>Code</span>
                    <span style={{ flex: 1 }}>Name</span>
                  </div>
                  {menu}
                </div>
              )}
            >
              {referenceStore.documentTypes.length > 0 ? (
                referenceStore.documentTypes.map(option => (
                  <Option key={option.id} value={option.id} label={`${option.code} ${option.name}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ width: 30, whiteSpace: 'nowrap', marginRight: '16px' }}>{option.code}</span>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{option.name}</span>
                    </div>
                  </Option>
                ))
              ) : (
                <Option disabled value={null}>
                  No document types available
                </Option>
              )}
            </Select>
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item style={{ marginBottom: 10 }}>
            <Select
              showSearch
              placeholder="Select Revision Step"
              value={filters.revision_step !== '' ? filters.revision_step : undefined}
              onChange={(value) => handleSelectChange(value, 'revision_step')}
              loading={referenceStore.isLoading}
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
              dropdownRender={menu => (
                <div>
                  <div style={{ display: 'flex', padding: '8px 8px 0', borderBottom: '1px solid #e8e8e8', fontWeight: 'bold' }}>
                    <span style={{ width: 'auto', whiteSpace: 'nowrap', marginRight: '16px' }}>Code</span>
                    <span style={{ flex: 1 }}>Description</span>
                  </div>
                  {menu}
                </div>
              )}
            >
              {referenceStore.revisionSteps.map(option => (
                <Option key={option.id} value={option.id} label={`${option.code} ${option.description}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ width: 30, whiteSpace: 'nowrap', marginRight: '16px' }}>{option.code}</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{option.description}</span>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item style={{ marginBottom: 10 }}>
            <Select
              showSearch
              placeholder="Select Revision Description"
              value={filters.revision_description !== '' ? filters.revision_description : undefined}
              onChange={(value) => handleSelectChange(value, 'revision_description')}
              loading={referenceStore.isLoading}
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
              dropdownRender={menu => (
                <div>
                  <div style={{ display: 'flex', padding: '8px 8px 0', borderBottom: '1px solid #e8e8e8', fontWeight: 'bold' }}>
                    <span style={{ width: 'auto', whiteSpace: 'nowrap', marginRight: '16px' }}>Code</span>
                    <span style={{ flex: 1 }}>Description</span>
                  </div>
                  {menu}
                </div>
              )}
            >
              {referenceStore.revisionDescriptions.map(option => (
                <Option key={option.id} value={option.id} label={`${option.code} ${option.description}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ width: 30, whiteSpace: 'nowrap', marginRight: '16px' }}>{option.code}</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{option.description}</span>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={[16, 8]}> {/* Уменьшаем вертикальный gutter с 25 до 8 */}
        <Col span={4}>
          <Form.Item style={{ marginBottom: 0 }}>
            <RangePicker
              placeholder={['Created from', 'to']}
              value={filters.document_created}
              onChange={handleDateChange}
              format="DD.MM.YYYY"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item style={{ marginBottom: 0 }}>
            <Select
              showSearch
              placeholder="Select Originator"
              value={filters.outgoing_originator !== '' ? filters.outgoing_originator : undefined}
              onChange={(value) => handleSelectChange(value, 'outgoing_originator')}
              loading={referenceStore.isLoading}
              allowClear
              optionFilterProp="label"
              filterOption={(input, option) =>
                option.label.toLowerCase().includes(input.toLowerCase())
              }
              filterSort={(optionA, optionB) =>
                optionA.label.toLowerCase().localeCompare(optionB.label.toLowerCase())
              }
            >
              {(referenceStore.originators || []).map(orig => (
                <Option key={orig.id} value={orig.id} label={orig.name}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {orig.name}
                  </span>
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item style={{ marginBottom: 0 }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <SearchOutlined 
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 1,
                  color: '#bfbfbf'
                }} 
              />
              <Select
                name="search"
                placeholder="Search ..."
                allowClear
                mode="tags"
                style={selectStyle}
                value={tags}
                onChange={handleTagsChange}
                tokenSeparators={[' ', ',']}
                suffixIcon={null}
                dropdownStyle={{ display: 'none' }}
              />
            </div>
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
});

export default DocumentFilters;