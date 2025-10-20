import React, { useState, useEffect } from 'react';
import { Modal, Tree, Button, Typography, message, Tag, Tabs, Table } from 'antd';
import { CloseOutlined, SaveOutlined } from '@ant-design/icons';
import TableTransfer from './table_transfer';
import { 
  getDisciplines, 
  getDocumentTypes, 
  getRevisionDescriptions, 
  saveDisciplineReferences, 
  fetchProjectDisciplineReferences,
  fetchProjectDisciplineDocTypeReferences, 
  saveDocTypeReferences, 
  saveRevisionDescriptionReferences, 
  fetchRevisionDescriptionReferences, 
  getRevisionSteps,
  saveRevisionStepReferences, 
  fetchProjectRevisionDescriptionRevisionStepReferences 
} from './Datasources';
import { authStore } from './stores/auth';
import './index.css';

const { TreeNode } = Tree;
const { Title } = Typography;
const { TabPane } = Tabs;

const ProjectSettings = ({ isModalVisible, selectedProject, onCancel }) => {
  const [disciplines, setDisciplines] = useState([]);
  const [targetKeys, setTargetKeys] = useState([]); // Для дисциплин

  // Для вкладки Document Types
  const [docTypes, setDocTypes] = useState([]);
  const [selectedDiscipline, setSelectedDiscipline] = useState(null);
  const [docTypeTargetKeys, setDocTypeTargetKeys] = useState([]);
  const [tempDocTypeSelections, setTempDocTypeSelections] = useState({});

  // Для вкладки Revision Descriptions
  const [revisionDescriptions, setRevisionDescriptions] = useState([]);
  const [revisionDescTargetKeys, setRevisionDescTargetKeys] = useState([]);
  const [initialRevisionDescKeys, setInitialRevisionDescKeys] = useState([]);

  // Для вкладки Revision Steps
  const [revisionSteps, setRevisionSteps] = useState([]);
  const [selectedRevisionDesc, setSelectedRevisionDesc] = useState(null);
  const [revisionStepTargetKeys, setRevisionStepTargetKeys] = useState([]);
  const [tempRevisionStepSelections, setTempRevisionStepSelections] = useState({});

  const [activeTab, setActiveTab] = useState('1');

  useEffect(() => {
    if (selectedProject) {
      fetchDisciplines();
      fetchDocTypes();
      fetchRevisionDescriptions();
      fetchRevisionSteps();
    }
  }, [selectedProject]);

  const fetchDisciplines = async () => {
    try {
      const allDisciplinesData = await getDisciplines();
      const allDisciplines = allDisciplinesData.map(discipline => ({
        key: discipline.id.toString(),
        title: discipline.name,
        tag: discipline.code,
      }));
      const projectDisciplineIds = await fetchProjectDisciplineReferences(selectedProject.id);
      setDisciplines([...allDisciplines]);
      setTargetKeys(projectDisciplineIds);
    } catch (error) {
      console.error('Error loading disciplines:', error);
    }
  };

  const fetchDocTypes = async () => {
    try {
      const allDocTypesData = await getDocumentTypes();
      const allDocTypes = allDocTypesData.map(docType => ({
        key: docType.id.toString(),
        title: docType.name,
        tag: docType.code,
      }));
      setDocTypes(allDocTypes);
    } catch (error) {
      console.error('Error loading document types:', error);
    }
  };

  const fetchDocTypeReferences = async (disciplineId) => {
    try {
      const docTypeIds = await fetchProjectDisciplineDocTypeReferences(selectedProject.id, disciplineId);
      const tempSelection = tempDocTypeSelections[disciplineId] || docTypeIds;
      setDocTypeTargetKeys(tempSelection);
    } catch (error) {
      console.error('Error loading doctype references:', error);
      setDocTypeTargetKeys([]);
    }
  };

  const fetchRevisionDescriptions = async () => {
    try {
      const allRevisionDescData = await getRevisionDescriptions();
      const allRevisionDescriptions = allRevisionDescData.map(desc => ({
        key: desc.id.toString(),
        title: desc.description,
        tag: desc.code,
      }));
      const projectRevisionDescIds = await fetchRevisionDescriptionReferences(selectedProject.id);
      setRevisionDescriptions([...allRevisionDescriptions]);
      setRevisionDescTargetKeys(projectRevisionDescIds);
      setInitialRevisionDescKeys(projectRevisionDescIds); // Сохраняем начальный список
    } catch (error) {
      console.error('Error loading revision descriptions:', error);
    }
  };

  const fetchRevisionSteps = async () => {
    try {
      const allRevisionStepsData = await getRevisionSteps();
      const allRevisionSteps = allRevisionStepsData.map(step => ({
        key: step.id.toString(),
        title: step.description,
        tag: step.code,
      }));
      setRevisionSteps(allRevisionSteps);
    } catch (error) {
      console.error('Error loading revision steps:', error);
    }
  };

  const fetchRevisionStepReferences = async (descriptionId) => {
    try {
      const revisionStepIds = await fetchProjectRevisionDescriptionRevisionStepReferences(selectedProject.id, descriptionId);
      const tempSelection = tempRevisionStepSelections[descriptionId] || revisionStepIds;
      setRevisionStepTargetKeys(tempSelection || []);
    } catch (error) {
      console.error('Error loading revision step references:', error);
      setRevisionStepTargetKeys([]);
    }
  };

  const handleSaveAll = async () => {
    try {
      console.log('Saving all settings...');
      console.log('Disciplines:', targetKeys);
      console.log('Document Types Selections:', tempDocTypeSelections);
      console.log('Revision Descriptions:', revisionDescTargetKeys);
      console.log('Revision Steps Selections:', tempRevisionStepSelections);

      // Сохранение дисциплин
      const disciplineReferences = targetKeys.map(discipline_id => ({
        project_id: selectedProject.id,
        discipline_id: parseInt(discipline_id, 10),
      }));
      console.log('Discipline References to Save:', disciplineReferences);
      await saveDisciplineReferences(disciplineReferences);
      message.success('Disciplines successfully saved');

      // Сохранение всех document types для всех дисциплин
      const docTypeReferences = [];
      for (const disciplineId in tempDocTypeSelections) {
        const typeIds = tempDocTypeSelections[disciplineId];
        if (typeIds && typeIds.length > 0) {
          typeIds.forEach(type_id => {
            docTypeReferences.push({
              project_id: selectedProject.id,
              discipline_id: parseInt(disciplineId, 10),
              type_id: parseInt(type_id, 10),
            });
          });
        }
      }
      console.log('Document Type References to Save:', docTypeReferences);
      if (docTypeReferences.length > 0) {
        await saveDocTypeReferences(docTypeReferences);
        message.success('All document types successfully saved');
      } else {
        console.warn('No document type references to save');
      }

      // Сохранение revision descriptions
      const allRevisionDescKeys = [...new Set([...initialRevisionDescKeys, ...revisionDescTargetKeys])];
      const revisionDescReferences = revisionDescTargetKeys.map(description_id => ({
        project_id: selectedProject.id,
        description_id: parseInt(description_id, 10),
      }));
      console.log('Revision Description References to Save:', revisionDescReferences);
      await saveRevisionDescriptionReferences(revisionDescReferences);
      message.success('Revision descriptions successfully saved');

      // Сохранение всех revision steps для всех revision descriptions
      const revisionStepReferences = [];
      for (const descriptionId in tempRevisionStepSelections) {
        const stepIds = tempRevisionStepSelections[descriptionId];
        if (stepIds && stepIds.length > 0) {
          stepIds.forEach(step_id => {
            revisionStepReferences.push({
              project_id: selectedProject.id,
              description_id: parseInt(descriptionId, 10),
              step_id: parseInt(step_id, 10),
            });
          });
        }
      }
      console.log('Revision Step References to Save:', revisionStepReferences);
      if (revisionStepReferences.length > 0) {
        await saveRevisionStepReferences(revisionStepReferences);
        message.success('All revision steps successfully saved');
      } else {
        console.warn('No revision step references to save');
      }

      // Очистка временных состояний после успешного сохранения
      setTempDocTypeSelections({});
      setTempRevisionStepSelections({});
      setInitialRevisionDescKeys(allRevisionDescKeys);
    } catch (error) {
      message.error('Error saving settings');
      console.error('Error saving settings:', error);
    }
  };

  const handleCloseModal = () => {
    setTempDocTypeSelections({});
    setSelectedDiscipline(null);
    setDocTypeTargetKeys([]);
    setTempRevisionStepSelections({});
    setSelectedRevisionDesc(null);
    setRevisionStepTargetKeys([]);
    onCancel();
  };

  const transferColumns = [
    { dataIndex: 'title', title: 'Name' },
    {
      dataIndex: 'tag',
      title: 'Code',
      render: (tag) => (
        <Tag style={{ marginInlineEnd: 0 }} color="cyan">
          {typeof tag === 'string' ? tag.toUpperCase() : 'N/A'}
        </Tag>
      ),
    },
  ];

  const filterOption = (input, item) =>
    item.title.toLowerCase().includes(input.toLowerCase()) ||
    item.tag.toLowerCase().includes(input.toLowerCase());

  const handleTransferChange = (nextTargetKeys) => {
    setTargetKeys(nextTargetKeys);
  };

  const handleDocTypeTransferChange = (nextTargetKeys) => {
    setDocTypeTargetKeys(nextTargetKeys);
    if (selectedDiscipline) {
      setTempDocTypeSelections(prev => ({
        ...prev,
        [selectedDiscipline]: nextTargetKeys,
      }));
    }
  };

  const handleRevisionDescTransferChange = (nextTargetKeys) => {
    setRevisionDescTargetKeys(nextTargetKeys);
  };

  const handleRevisionStepTransferChange = (nextTargetKeys) => {
    setRevisionStepTargetKeys(nextTargetKeys);
    if (selectedRevisionDesc) {
      setTempRevisionStepSelections(prev => ({
        ...prev,
        [selectedRevisionDesc]: nextTargetKeys,
      }));
    }
  };

  const disciplineColumns = [
    { title: 'Name', dataIndex: 'title', key: 'title' },
    { title: 'Code', dataIndex: 'tag', key: 'tag', render: (tag) => <Tag color="cyan">{tag.toUpperCase()}</Tag> },
  ];

  const projectDisciplines = disciplines.filter(d => targetKeys.includes(d.key));

  const revisionDescColumns = [
    { title: 'Description', dataIndex: 'title', key: 'title' },
    { title: 'Code', dataIndex: 'tag', key: 'tag', render: (tag) => <Tag color="cyan">{tag.toUpperCase()}</Tag> },
  ];

  const projectRevisionDescriptions = revisionDescriptions.filter(d => revisionDescTargetKeys.includes(d.key));

  return (
    <Modal
      title={`Project: ${selectedProject?.name}`}
      open={isModalVisible}
      onCancel={handleCloseModal}
      footer={[
        <Button key="save" type="primary" onClick={handleSaveAll} icon={<SaveOutlined />}>
          Save
        </Button>,
        <Button key="cancel" onClick={onCancel} icon={<CloseOutlined />}>
          Close
        </Button>,
      ]}
      width="95%"
      centered
      style={{ height: '90vh' }}
    >
      <Tabs defaultActiveKey="1" onChange={(key) => setActiveTab(key)} style={{ height: '655px' }}>
        <TabPane tab="Disciplines" key="2">
          <div>
            <Title level={4}>Disciplines</Title>
            <TableTransfer
              dataSource={disciplines}
              targetKeys={targetKeys}
              showSearch
              showSelectAll={false}
              onChange={handleTransferChange}
              filterOption={filterOption}
              leftColumns={transferColumns}
              rightColumns={transferColumns}
            />
          </div>
        </TabPane>
        <TabPane tab="Document Types" key="3">
          <div>
            <Title level={4}>Document Types</Title>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ width: '30%' }}>
                <Table
                  columns={disciplineColumns}
                  dataSource={projectDisciplines}
                  rowKey="key"
                  pagination={false}
                  size="small"
                  bordered
                  scroll={{ y: 400 }}
                  onRow={(record) => ({
                    onClick: () => {
                      setSelectedDiscipline(record.key);
                      fetchDocTypeReferences(record.key);
                    },
                  })}
                  rowClassName={(record) => (record.key === selectedDiscipline ? 'ant-table-row-selected' : '')}
                />
              </div>
              <div style={{ width: '70%' }}>
                {selectedDiscipline ? (
                  <TableTransfer
                    dataSource={docTypes}
                    targetKeys={docTypeTargetKeys}
                    showSearch
                    showSelectAll={false}
                    onChange={handleDocTypeTransferChange}
                    filterOption={filterOption}
                    leftColumns={transferColumns}
                    rightColumns={transferColumns}
                    titles={['Available Document Types', 'Selected Document Types']}
                  />
                ) : (
                  <p>Please select a discipline from the left table to manage document types.</p>
                )}
              </div>
            </div>
          </div>
        </TabPane>
        <TabPane tab="Revision Descriptions" key="4">
          <div>
            <Title level={4}>Revision Descriptions</Title>
            <TableTransfer
              dataSource={revisionDescriptions}
              targetKeys={revisionDescTargetKeys}
              showSearch
              showSelectAll={false}
              onChange={handleRevisionDescTransferChange}
              filterOption={filterOption}
              leftColumns={transferColumns}
              rightColumns={transferColumns}
              titles={['Available Revision Descriptions', 'Selected Revision Descriptions']}
            />
          </div>
        </TabPane>
        <TabPane tab="Revision Steps" key="5">
          <div>
            <Title level={4}>Revision Steps</Title>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ width: '30%' }}>
                <Table
                  columns={revisionDescColumns}
                  dataSource={projectRevisionDescriptions}
                  rowKey="key"
                  pagination={false}
                  size="small"
                  bordered
                  scroll={{ y: 400 }}
                  onRow={(record) => ({
                    onClick: () => {
                      setSelectedRevisionDesc(record.key);
                      fetchRevisionStepReferences(record.key);
                    },
                  })}
                  rowClassName={(record) => (record.key === selectedRevisionDesc ? 'ant-table-row-selected' : '')}
                />
              </div>
              <div style={{ width: '70%' }}>
                {selectedRevisionDesc ? (
                  <TableTransfer
                    dataSource={revisionSteps}
                    targetKeys={revisionStepTargetKeys}
                    showSearch
                    showSelectAll={false}
                    onChange={handleRevisionStepTransferChange}
                    filterOption={filterOption}
                    leftColumns={transferColumns}
                    rightColumns={transferColumns}
                    titles={['Available Revision Steps', 'Selected Revision Steps']}
                  />
                ) : (
                  <p>Please select a revision description from the left table to manage revision steps.</p>
                )}
              </div>
            </div>
          </div>
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default ProjectSettings;