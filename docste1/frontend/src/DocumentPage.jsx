import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { authStore } from './stores/auth';
import { getMainData } from './Datasources';
import DocumentFilters from './DocumentFilters';
import DocumentTable from './DocumentTable';
import DocumentActions from './DocumentActions';
import CreateDocumentModal from './CreateDocument';
import CreateTransmittalModal from './CreateTransmittal';
import './index.css';

const DocumentPage = observer(({ colorBgContainer, borderRadiusLG }) => {
  const [mainData, setMainData] = useState([]);
  const [filteredDataSource, setFilteredDataSource] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [customizeModalVisible, setCustomizeModalVisible] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [transmittalCart, setTransmittalCart] = useState([]);
  const [newdocModalVisible, setNewdocModalVisible] = useState(false);
  const [transmittalModalVisible, setTransmittalModalVisible] = useState(false);
  const [checkedColumns, setCheckedColumns] = useState(() => {
    const savedSettings = authStore.documentsColumnsSettings;
    return savedSettings ? savedSettings.filter(col => col.visible).map(col => col.key) : [];
  });

  useEffect(() => {
    if (authStore.selectedProjectId && authStore.selectedPage === 'document_register') {
      fetchTableData();
    }
  }, [authStore.selectedProjectId, authStore.selectedPage]);

  const fetchTableData = async () => {
    try {
      setTableLoading(true);
      setMainData([]);
      setFilteredDataSource([]);
      setSelectedRowKeys([]);
      const response = await getMainData(authStore.selectedProjectId);
      const filteredData = response.filter(item => item.revision_status === 'Active');
      setMainData(response);
      setFilteredDataSource(filteredData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setTableLoading(false);
    }
  };

  const handleFilterSubmit = (filters) => {
    let filteredData = [...mainData];
    const filterRules = {
      document_number: { field: 'document_number', match: 'partial' },
      document_title: { field: 'document_title', match: 'partial' },
      discipline: { field: 'discipline_id', match: 'exact' },
      document_type: { field: 'document_type_id', match: 'exact' },
      revision_step: { field: 'revision_step_id', match: 'exact' },
      revision_description: { field: 'revision_description_id', match: 'exact' },
      outgoing_originator: { field: 'outgoing_originator_id', match: 'exact' },
    };

    Object.keys(filterRules).forEach(filterKey => {
      if (filters[filterKey]) {
        const { field, match } = filterRules[filterKey];
        filteredData = filteredData.filter(item => {
          const itemValue = item[field];
          const filterValue = filters[filterKey];
          if (itemValue === null || itemValue === undefined) return false;
          return match === 'exact'
            ? itemValue === filterValue
            : String(itemValue).toLowerCase().includes(String(filterValue).toLowerCase());
        });
      }
    });

    if (filters.document_created && filters.document_created.length === 2) {
      const startDate = filters.document_created[0].startOf('day').toDate();
      const endDate = filters.document_created[1].endOf('day').toDate();
      filteredData = filteredData.filter((item) => {
        const itemDate = new Date(item.document_created);
        return itemDate >= startDate && itemDate <= endDate;
      });
    }

    if (filters.searchTags && filters.searchTags.length > 0) {
      filteredData = filteredData.filter(item => {
        const documentNumber = String(item.document_number || '').toLowerCase();
        const documentTitle = String(item.document_title || '').toLowerCase();
        return filters.searchTags.some(tag => {
          const tagLower = String(tag).toLowerCase();
          return documentNumber.includes(tagLower) || documentTitle.includes(tagLower);
        });
      });
    }

    setFilteredDataSource(filteredData);
    setSelectedRowKeys(prev => prev.filter(key => filteredData.some(item => item.revision_id === key)));
  };

  const handleAddToTransmittal = () => {
    const selectedRecords = mainData.filter(item => selectedRowKeys.includes(item.revision_id));
    setTransmittalCart(prevCart => {
      const existingIds = new Set(prevCart.map(item => item.revision_id));
      const newRecords = selectedRecords.filter(record => !existingIds.has(record.revision_id));
      return [...prevCart, ...newRecords];
    });
  };

  const handleRemoveFromCart = (id) => {
    setTransmittalCart(prevCart => prevCart.filter(item => item.revision_id !== id));
  };

  const handleClearTransmittalCart = () => {
    setTransmittalCart([]);
  };

  const handleCreateDocumentClose = () => {
    setNewdocModalVisible(false);
  };

  const handleTransmittalClose = () => {
    setTransmittalModalVisible(false);
  };

  const handleTransmittalCreated = () => {
    setTransmittalCart([]);
    setTransmittalModalVisible(false);
    fetchTableData();
  };

  return (
    <div style={{ padding: 10, background: colorBgContainer, borderRadius: borderRadiusLG, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <DocumentFilters
        onSubmit={handleFilterSubmit}
        filteredDataSource={filteredDataSource}
        onTableRefresh={fetchTableData}
        selectedRowKeys={selectedRowKeys}
        mainData={mainData}
        checkedColumns={checkedColumns}
      />
      <DocumentActions
        selectedRowKeys={selectedRowKeys}
        filteredDataSource={filteredDataSource}
        onTableRefresh={fetchTableData}
        onCustomize={() => setCustomizeModalVisible(true)}
        onCreateDocument={() => setNewdocModalVisible(true)}
        onAddToTransmittal={handleAddToTransmittal}
        transmittalCart={transmittalCart}
        onCreateTransmittal={() => setTransmittalModalVisible(true)}
        onClearTransmittalCart={handleClearTransmittalCart}
        onRemoveFromCart={handleRemoveFromCart}
      />
      <DocumentTable
        mainData={mainData}
        filteredDataSource={filteredDataSource}
        setFilteredDataSource={setFilteredDataSource}
        selectedRowKeys={selectedRowKeys}
        setSelectedRowKeys={setSelectedRowKeys}
        tableLoading={tableLoading}
        colorBgContainer={colorBgContainer}
        borderRadiusLG={borderRadiusLG}
        customizeModalVisible={customizeModalVisible}
        setCustomizeModalVisible={setCustomizeModalVisible}
        onTableRefresh={fetchTableData}
        setCheckedColumns={setCheckedColumns}
      />
      <CreateDocumentModal
        visible={newdocModalVisible}
        onClose={handleCreateDocumentClose}
        onTableRefresh={fetchTableData}
      />
      <CreateTransmittalModal
        visible={transmittalModalVisible}
        onClose={handleTransmittalClose}
        selectedRecords={transmittalCart}
        onTableRefresh={fetchTableData}
        onTransmittalCreated={handleTransmittalCreated}
      />
    </div>
  );
});

export default DocumentPage;