<template>
  <TMagicScrollbar class="data-source-list-panel m-editor-layer-panel">
    <div class="search-wrapper">
      <SearchInput @search="filterTextChangeHandler"></SearchInput>
      <TMagicPopover
        v-if="editable"
        placement="right"
        trigger="hover"
        popper-class="data-source-list-panel-add-menu"
        :destroy-on-close="true"
      >
        <template #reference>
          <TMagicButton type="primary" size="small">新增</TMagicButton>
        </template>
        <ToolButton
          v-for="(item, index) in datasourceTypeList"
          :data="{
            type: 'button',
            text: item.text,
            handler: () => {
              addHandler(item.type);
            },
          }"
          :key="index"
        ></ToolButton>
      </TMagicPopover>

      <slot name="data-source-panel-search"></slot>
    </div>

    <!-- 数据源列表 -->
    <DataSourceList
      ref="dataSourceList"
      :indent="indent"
      :next-level-indent-increment="nextLevelIndentIncrement"
      @edit="editHandler"
      @remove="removeHandler"
      @node-contextmenu="nodeContentMenuHandler"
    ></DataSourceList>
  </TMagicScrollbar>

  <DataSourceConfigPanel
    ref="editDialog"
    :disabled="!editable"
    :values="dataSourceValues"
    :title="dialogTitle"
    @submit="submitDataSourceHandler"
    @close="editDialogCloseHandler"
    @open="editDialogOpenHandler"
  ></DataSourceConfigPanel>

  <Teleport to="body">
    <ContentMenu
      v-if="menuData.length"
      :menu-data="menuData"
      ref="menu"
      style="overflow: initial"
      @hide="contentMenuHideHandler"
    ></ContentMenu>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import { mergeWith } from 'lodash-es';

import { TMagicButton, tMagicMessageBox, TMagicPopover, TMagicScrollbar } from '@tmagic/design';

import ContentMenu from '@editor/components/ContentMenu.vue';
import SearchInput from '@editor/components/SearchInput.vue';
import ToolButton from '@editor/components/ToolButton.vue';
import { useDataSourceEdit } from '@editor/hooks/use-data-source-edit';
import { useServices } from '@editor/hooks/use-services';
import type { CustomContentMenuFunction, DataSourceListSlots, EventBus, MenuButton, MenuComponent } from '@editor/type';

import DataSourceConfigPanel from './DataSourceConfigPanel.vue';
import DataSourceList from './DataSourceList.vue';
import { useContentMenu } from './useContentMenu';

defineSlots<DataSourceListSlots>();

defineOptions({
  name: 'MEditorDataSourceListPanel',
});

const props = defineProps<{
  indent?: number;
  nextLevelIndentIncrement?: number;
  customContentMenu: CustomContentMenuFunction;
}>();

const eventBus = inject<EventBus>('eventBus');
const { dataSourceService } = useServices();

const { editDialog, dataSourceValues, dialogTitle, editable, editHandler, submitDataSourceHandler } =
  useDataSourceEdit(dataSourceService);

const editDialogOpenHandler = (id: string) => {
  if (dataSourceList.value) {
    for (const [statusId, status] of dataSourceList.value.nodeStatusMap.entries()) {
      status.selected = statusId === id;
    }
  }
};

const editDialogCloseHandler = () => {
  if (dataSourceList.value) {
    for (const [, status] of dataSourceList.value.nodeStatusMap.entries()) {
      status.selected = false;
    }
  }
};

const datasourceTypeList = computed(() =>
  [
    { text: '基础', type: 'base' },
    { text: 'HTTP', type: 'http' },
  ].concat(dataSourceService.get('datasourceTypeList')),
);

const addHandler = (type: string) => {
  if (!editDialog.value) return;

  const datasourceType = datasourceTypeList.value.find((item) => item.type === type);

  dataSourceValues.value = mergeWith(
    { type, title: datasourceType?.text },
    dataSourceService.getFormValue(type),
    (objValue, srcValue) => {
      if (Array.isArray(srcValue)) {
        return srcValue;
      }
    },
  );

  dialogTitle.value = `新增${datasourceType?.text || ''}`;

  editDialog.value.show();
};

const removeHandler = async (id: string) => {
  await tMagicMessageBox.confirm('确定删除?', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  });

  dataSourceService.remove(id);
};

const dataSourceList = ref<InstanceType<typeof DataSourceList>>();

const filterTextChangeHandler = (val: string) => {
  dataSourceList.value?.filter(val);
};

eventBus?.on('edit-data-source', (id: string) => {
  editHandler(id);
});

eventBus?.on('remove-data-source', (id: string) => {
  removeHandler(id);
});

const { nodeContentMenuHandler, menuData: contentMenuData, contentMenuHideHandler } = useContentMenu();
const menuData = computed<(MenuButton | MenuComponent)[]>(() =>
  props.customContentMenu(contentMenuData, 'data-source'),
);
</script>
