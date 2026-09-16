/* eslint-disable react-refresh/only-export-components -- Storybook 配置需要同时定义装饰器并导出 preview 对象。 */
// eslint-disable-next-line simple-import-sort/imports -- 保留 i18n、主题模块和全局样式的初始化顺序，避免改变预览样式覆盖关系。
import '@/i18n';
import { THEME_MODE, ThemeApplier } from '@/theme';
import '@fontsource-variable/noto-sans-sc/wght.css';
import type { Preview } from '@storybook/react-vite';
import type { ReactNode } from 'react';

import '../src/bootstrap/index.css';
import '../src/bootstrap/scrollbar.less';

function StorybookThemeDecorator(Story: () => ReactNode) {
  return (
    <ThemeApplier defaultTheme={THEME_MODE.LIGHT}>
      <Story />
    </ThemeApplier>
  );
}

const preview: Preview = {
  decorators: [StorybookThemeDecorator],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: 'centered',
  },
};

export default preview;
