/*
 * Tencent is pleased to support the open source community by making TMagicEditor available.
 *
 * Copyright (C) 2025 Tencent.  All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { describe, expect, test } from 'vitest';
import { nextTick } from 'vue';
import MagicForm, { MDate, MForm } from '@form/index';
import { mount } from '@vue/test-utils';
import ElementPlus, { ElInput } from 'element-plus';

const getWrapper = (
  config: any = [
    {
      text: 'date',
      type: 'date',
      name: 'date',
    },
  ],
  initValues: any = {
    date: '2021-01-01',
  },
) =>
  mount(MForm, {
    global: {
      plugins: [ElementPlus as any, MagicForm as any],
    },
    props: {
      initValues,
      config,
    },
  });

describe('Date', () => {
  test('基础', async () => {
    const wrapper = getWrapper();

    await nextTick();

    const date = wrapper.findComponent(MDate);
    expect(date.exists()).toBe(true);

    const value = await (wrapper.vm as any).submitForm();
    expect(value.date).toMatch('2021/01/01');
  });

  test('输入', async () => {
    const wrapper = getWrapper([
      {
        text: 'date',
        type: 'date',
        name: 'date',
        valueFormat: 'YYYY-MM-DD',
      },
    ]);

    await nextTick();

    const input = wrapper.find('input');

    await input.setValue('2021/07/28');
    await input.trigger('blur');

    const value = await (wrapper.vm as any).submitForm();
    expect(input.element.value).toMatch('2021/07/28');
    expect(value.date).toMatch('2021-07-28');
  });

  test('清空', async () => {
    const wrapper = getWrapper();

    await nextTick();

    const elInput = wrapper.findComponent(ElInput);
    await elInput.trigger('mouseenter');

    const clear = wrapper.find('.clear-icon');

    expect(clear.exists()).toBe(true);
    await clear.trigger('click');
    expect((wrapper.vm as any).values.date).toBeNull();
  });
});
