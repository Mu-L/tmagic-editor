<template>
  <component class="tmagic-design-steps" :is="uiComponent" v-bind="uiProps">
    <slot></slot>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { getDesignConfig } from './config';
import type { StepsProps } from './types';

defineOptions({
  name: 'TMSteps',
});

const props = defineProps<StepsProps>();

const ui = getDesignConfig('components')?.steps;

const uiComponent = ui?.component || 'el-steps';

const uiProps = computed<StepsProps>(() => ui?.props(props) || props);
</script>
