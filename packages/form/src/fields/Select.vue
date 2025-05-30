<template>
  <TMagicSelect
    v-if="model"
    v-model="model[name]"
    v-loading="loading"
    class="m-select"
    ref="tMagicSelect"
    :clearable="typeof config.clearable !== 'undefined' ? config.clearable : true"
    :filterable="typeof config.filterable !== 'undefined' ? config.filterable : true"
    :popper-class="`m-select-popper ${popperClass}`"
    :size="size"
    :remote="remote"
    :placeholder="config.placeholder"
    :multiple="config.multiple"
    :value-key="config.valueKey || 'value'"
    :allow-create="config.allowCreate"
    :disabled="disabled"
    :remote-method="config.remote && remoteMethod"
    @change="changeHandler"
    @visible-change="visibleHandler"
  >
    <template v-if="config.group">
      <component
        v-for="(group, index) in options as SelectGroupOption[]"
        :key="index"
        :is="optionGroupComponent?.component || 'el-option-group'"
        v-bind="
          optionGroupComponent?.props({
            label: group.label,
            disabled: group.disabled,
          }) || {
            label: group.label,
            disabled: group.disabled,
          }
        "
      >
        <component
          v-for="(item, index) in group.options"
          :is="optionComponent?.component || 'el-option'"
          :key="index"
          v-bind="
            optionComponent?.props({
              label: item.label || item.text,
              value: item.value,
              disabled: item.disabled,
            }) || {
              label: item.label || item.text,
              value: item.value,
              disabled: item.disabled,
            }
          "
        >
        </component>
      </component>
    </template>
    <template v-else>
      <component
        v-for="option in options as SelectOption[]"
        class="tmagic-design-option"
        :key="config.valueKey ? option.value[config.valueKey] : option.value"
        :is="optionComponent?.component || 'el-option'"
        v-bind="
          optionComponent?.props({
            label: option.text,
            value: option.value,
            disabled: option.disabled,
          }) || {
            label: option.text,
            value: option.value,
            disabled: option.disabled,
          }
        "
      >
      </component>
    </template>
    <div v-loading="true" v-if="moreLoadingVisible"></div>
  </TMagicSelect>
</template>

<script lang="ts" setup>
import { inject, nextTick, onBeforeMount, ref, watch, watchEffect } from 'vue';

import { getDesignConfig, TMagicSelect } from '@tmagic/design';
import { getValueByKeyPath } from '@tmagic/utils';

import type { FieldProps, FormState, SelectConfig, SelectGroupOption, SelectOption } from '../schema';
import { getConfig } from '../utils/config';
import { useAddField } from '../utils/useAddField';

defineOptions({
  name: 'MFormSelect',
});

const props = defineProps<FieldProps<SelectConfig>>();

const emit = defineEmits(['change']);

const optionComponent = getDesignConfig('components')?.option;
const optionGroupComponent = getDesignConfig('components')?.optionGroup;

if (!props.model) throw new Error('不能没有model');
useAddField(props.prop);

const tMagicSelect = ref<InstanceType<typeof TMagicSelect>>();
const mForm = inject<FormState | undefined>('mForm');
const options = ref<SelectOption[] | SelectGroupOption[]>([]);
const localOptions = ref<SelectOption[] | SelectGroupOption[]>([]);
const loading = ref(false);
const moreLoadingVisible = ref(false);
const total = ref(0);
const pgIndex = ref(0);
const pgSize = ref(20);
const query = ref('');
const remoteData = ref<any[]>([]);
const remote = ref(true);

const equalValue = (value: any, v: any): boolean => {
  if (typeof v === 'object') {
    const key = props.config.valueKey || 'value';
    return v[key] === value[key];
  }

  return value === v;
};

const mapOptions = (data: any[]) => {
  const {
    option = {
      text: 'text',
      value: 'value',
    },
  } = props.config;
  const { text = 'text', value = 'value' } = option;

  return data.map((item) => ({
    text: typeof text === 'function' ? text(item) : item[text],
    value: typeof value === 'function' ? value(item) : item[value],
  }));
};

const getOptions = async () => {
  if (!props.model) return [];

  if (localOptions.value.length) {
    return localOptions.value;
  }

  loading.value = true;

  let items: SelectOption[] | SelectGroupOption[] = [];

  const { option } = props.config;

  if (!option) return [];

  const { root = '', totalKey = 'total' } = option;
  let { body = {}, url } = option;

  if (typeof url === 'function') {
    url = await url(mForm, { model: props.model, formValue: mForm?.values });
  }

  let postOptions: Record<string, any> = {
    method: option.method || 'POST',
    url,
    cache: option.cache,
    timeout: option.timeout,
    mode: option.mode,
    headers: option.headers || {},
    json: option.json || false,
  };

  if (typeof body === 'function') {
    body = body(mForm, {
      model: props.model,
      formValue: mForm?.values,
      formValues: mForm?.values,
      config: props.config,
    }) as Record<string, any>;
  }

  body.query = query.value;
  body.pgSize = pgSize.value;
  body.pgIndex = pgIndex.value;

  postOptions.data = body;

  const requestFuc = getConfig('request') as Function;

  if (typeof option.beforeRequest === 'function') {
    postOptions = await option.beforeRequest(mForm, postOptions, {
      model: props.model,
      formValue: mForm?.values,
      formValues: mForm?.values,
      prop: props.prop,
      config: props.config,
    });
  }

  if (option.method?.toLocaleLowerCase() === 'jsonp') {
    postOptions.jsonpCallback = option.jsonpCallback || 'callback';
  }

  let res = await requestFuc(postOptions);

  if (typeof option.afterRequest === 'function') {
    res = await option.afterRequest(mForm, res, {
      model: props.model,
      formValue: mForm?.values,
      formValues: mForm?.values,
      config: props.config,
      prop: props.prop,
      postOptions,
    });
  }

  const optionsData = getValueByKeyPath(root, res);

  const resTotal = globalThis.parseInt(getValueByKeyPath(totalKey, res), 10);
  if (resTotal > 0) {
    total.value = resTotal;
  }

  remoteData.value = remoteData.value.concat(optionsData);
  if (optionsData) {
    if (typeof option.item === 'function') {
      items = option.item(optionsData);
    } else if (optionsData.map) {
      items = mapOptions(optionsData);
    }
  }

  loading.value = false;

  // 多选过滤时会导致已选的选项显示不了，所以要把已选的选项保留不要过滤没了
  const selectedOptions: SelectOption[] | SelectGroupOption[] = [];
  if (props.config.multiple && props.model[props.name]) {
    options.value.forEach((o: any) => {
      const isInclude = props.model?.[props.name].includes(o.value);
      if (isInclude && !(items as any[]).find((op: any) => op.value === o.value)) {
        selectedOptions.push(o);
      }
    });
  }

  return pgIndex.value === 0 ? (selectedOptions as any[]).concat(items) : (options.value as any).concat(items);
};

const getInitLocalOption = async () => {
  if (!props.model) return [];

  const value = props.model[props.name];
  const { config } = props;
  localOptions.value = await getOptions();

  remote.value = false;

  if (config.group) {
    if (config.multiple && value.findIndex) {
      return (localOptions.value as SelectGroupOption[]).filter(
        (group) => group.options.findIndex((item) => value.find((v: any) => equalValue(item.value, v)) > -1) > -1,
      );
    }

    return (localOptions.value as SelectGroupOption[]).filter(
      (group) => group.options.findIndex((item) => equalValue(item.value, value)) > -1,
    );
  }

  if (config.multiple && value.findIndex) {
    return (localOptions.value as any[]).filter((item) => value.findIndex((v: any) => equalValue(item.value, v)) > -1);
  }

  return (localOptions.value as any[]).filter((item) => equalValue(item.value, value));
};

const getInitOption = async () => {
  if (!props.model) return [];

  const { option } = props.config;

  if (!option) return [];

  const { root = '', initRoot = '' } = option;
  let { initBody = {} } = option;

  let options: SelectOption[] | SelectGroupOption[] = [];

  let url = option.initUrl;
  if (!url) {
    return getInitLocalOption();
  }

  if (typeof url === 'function') {
    url = await url(mForm, { model: props.model, formValue: mForm?.values });
  }

  if (typeof initBody === 'function') {
    initBody = initBody(mForm, {
      model: props.model,
      formValue: mForm?.values,
      formValues: mForm?.values,
      config: props.config,
    }) as Record<string, any>;
  }

  let postOptions: Record<string, any> = {
    method: option.method || 'POST',
    url,
    data: {
      id: props.model[props.name],
      ...initBody,
    },
    mode: option.mode,
    headers: option.headers || {},
    json: option.json || false,
  };

  if (typeof option.beforeInitRequest === 'function') {
    postOptions = await option.beforeInitRequest(mForm, postOptions, {
      model: props.model,
      formValue: mForm?.values,
      formValues: mForm?.values,
      config: props.config,
      prop: props.prop,
    });
  }

  if (option.method?.toLocaleLowerCase() === 'jsonp') {
    postOptions.jsonpCallback = option.jsonpCallback || 'callback';
  }

  const requestFuc = getConfig('request') as Function;
  let res = await requestFuc(postOptions);

  if (typeof option.afterRequest === 'function') {
    res = await option.afterRequest(mForm, res, {
      model: props.model,
      formValue: mForm?.values,
      formValues: mForm?.values,
      config: props.config,
      prop: props.prop,
      postOptions,
    });
  }

  let initData = getValueByKeyPath(initRoot || root, res);
  if (initData) {
    if (!Array.isArray(initData)) {
      initData = [initData];
    }

    if (typeof option.item === 'function') {
      options = option.item(initData);
    } else if (initData.map) {
      options = mapOptions(initData);
    }
  }

  return options;
};

const setOptions = (data: SelectOption[] | SelectGroupOption[]) => {
  options.value = data;
};

if (typeof props.config.options === 'function') {
  watchEffect(() => {
    typeof props.config.options === 'function' &&
      Promise.resolve(
        props.config.options(mForm, {
          model: props.model,
          prop: props.prop,
          formValues: mForm?.values,
          formValue: mForm?.values,
          config: props.config,
        }),
      ).then((data) => {
        setOptions(data);
      });
  });
} else if (Array.isArray(props.config.options)) {
  watchEffect(() => {
    setOptions(props.config.options as SelectOption[] | SelectGroupOption[]);
  });
} else if (props.config.option) {
  onBeforeMount(() => {
    if (!props.model) return;
    const v = props.model[props.name];
    if (Array.isArray(v) ? v.length : typeof v !== 'undefined') {
      getInitOption().then((data) => {
        setOptions(data);
      });
    }
  });
}

if (props.config.remote) {
  const unWatch = watch(
    () => tMagicSelect.value?.scrollbarWrap,
    (scrollbarWrap) => {
      if (!scrollbarWrap) {
        return;
      }

      nextTick(() => unWatch());

      scrollbarWrap.addEventListener('scroll', async (e: Event) => {
        const el = e.currentTarget as HTMLDivElement;
        if (moreLoadingVisible.value) {
          return;
        }
        if (el.scrollHeight - el.clientHeight - el.scrollTop > 1) {
          return;
        }
        if (total.value <= options.value.length) {
          return;
        }
        moreLoadingVisible.value = true;
        pgIndex.value += 1;
        setOptions(await getOptions());
        moreLoadingVisible.value = false;
      });
    },
    {
      immediate: true,
    },
  );
}

const popperClass = mForm?.popperClass;

const changeHandler = (value: any) => {
  emit('change', value);
};

const visibleHandler = async (visible: boolean) => {
  if (!visible) return;

  if (!props.config.remote) return;
  if (query.value && tMagicSelect.value) {
    tMagicSelect.value.setQuery(query.value);
    tMagicSelect.value.setPreviousQuery(query.value);
    tMagicSelect.value.setSelectedLabel(query.value);
  } else if (options.value.length <= (props.config.multiple ? props.model?.[props.name].length : 1)) {
    setOptions(await getOptions());
  }
};

const remoteMethod = async (q: string) => {
  if (!localOptions.value.length) {
    query.value = q;
    pgIndex.value = 0;
    setOptions(await getOptions());
    // 多选时如果过滤选项会导致已选好的标签异常，需要重新刷新一下el-select的状态
    if (props.config.multiple)
      setTimeout(() => {
        tMagicSelect.value?.setSelected();
      }, 0);
  }
};

defineExpose({
  options,
  setOptions,
});
</script>
