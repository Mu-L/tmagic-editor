import { computed, ref } from 'vue';

import type { DataSourceSchema } from '@tmagic/core';
import type { ContainerChangeEventData } from '@tmagic/form';

import DataSourceConfigPanel from '@editor/layouts/sidebar/data-source/DataSourceConfigPanel.vue';
import type { Services } from '@editor/type';

export const useDataSourceEdit = (dataSourceService: Services['dataSourceService']) => {
  const dialogTitle = ref('');
  const editDialog = ref<InstanceType<typeof DataSourceConfigPanel>>();
  const dataSourceValues = ref<Record<string, any>>({});

  const editable = computed(() => dataSourceService.get('editable'));

  const editHandler = (id: string) => {
    if (!editDialog.value) return;

    dataSourceValues.value = {
      ...(dataSourceService.getDataSourceById(id) || {}),
    };

    dialogTitle.value = `编辑${dataSourceValues.value.title || ''}`;

    editDialog.value.show();
  };

  const submitDataSourceHandler = (value: DataSourceSchema, eventData: ContainerChangeEventData) => {
    if (value.id) {
      dataSourceService.update(value, { changeRecords: eventData.changeRecords });
    } else {
      dataSourceService.add(value);
    }

    editDialog.value?.hide();
  };

  return {
    dialogTitle,
    editDialog,
    dataSourceValues,
    editable,

    editHandler,
    submitDataSourceHandler,
  };
};
