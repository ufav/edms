import React from 'react';
import { Transfer, Table, Tag } from 'antd';

const TableTransfer = ({
  leftColumns,
  rightColumns,
  filterOption = (input, item) =>
    item.title.toLowerCase().includes(input.toLowerCase()) ||
    item.tag.toLowerCase().includes(input.toLowerCase()),
  ...restProps
}) => (
  <Transfer
    style={{ width: '100%' }}
    showSearch
    filterOption={filterOption}
    {...restProps}
  >
    {({
      direction,
      filteredItems,
      onItemSelect,
      onItemSelectAll,
      selectedKeys: listSelectedKeys,
      disabled: listDisabled,
    }) => {
      const columns = direction === 'left' ? leftColumns : rightColumns;
      const rowSelection = {
        getCheckboxProps: () => ({ disabled: listDisabled }),
        onChange(selectedRowKeys) {
          onItemSelectAll(selectedRowKeys, 'replace');
        },
        selectedRowKeys: listSelectedKeys,
        selections: [Table.SELECTION_ALL, Table.SELECTION_INVERT, Table.SELECTION_NONE],
      };

      return (
        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={filteredItems}
          size="small"
          style={{ pointerEvents: listDisabled ? 'none' : undefined }}
          onRow={({ key, disabled: itemDisabled }) => ({
            onClick: () => {
              if (itemDisabled || listDisabled) return;
              onItemSelect(key, !listSelectedKeys.includes(key));
            },
          })}
          scroll={{ y: 300 }}
          pagination={false}
        />
      );
    }}
  </Transfer>
);

export default TableTransfer;
