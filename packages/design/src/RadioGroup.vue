<template>
  <component
    class="tmagic-design-radio-group"
    :is="uiComponent"
    v-bind="uiProps"
    @change="changeHandler"
    @update:modelValue="updateModelValue"
  >
    <slot></slot>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { getDesignConfig } from './config';
import type { RadioGroupProps } from './types';

defineOptions({
  name: 'TMRadioGroup',
});

const props = defineProps<RadioGroupProps>();

const ui = getDesignConfig('components')?.radioGroup;

const uiComponent = ui?.component || 'el-radio-group';

const uiProps = computed<RadioGroupProps>(() => ui?.props(props) || props);

const emit = defineEmits(['change', 'update:modelValue']);

const changeHandler = (v: any) => {
  emit('change', v);
};

const updateModelValue = (v: any) => {
  emit('update:modelValue', v);
};
</script>
