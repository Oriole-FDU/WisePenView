/* eslint-disable react-refresh/only-export-components -- Storybook 配置需要同时定义装饰器并导出 preview 对象。 */
// eslint-disable-next-line simple-import-sort/imports -- 保留 i18n、主题模块和全局样式的初始化顺序，避免改变预览样式覆盖关系。
import '@/i18n';
import { THEME_MODE, ThemeApplier } from '@/theme';
import '@fontsource-variable/noto-sans-sc/wght.css';
import type { Preview, StoryFn } from '@storybook/react-vite';
import { useEffect } from 'react';

import '../src/styles/global/index.css';
import '../src/styles/global/scrollbar.less';
import i18n, { changeAppLanguage } from '../src/i18n';
import type { SupportedLanguage } from '../src/i18n/resources';

function StorybookPreviewShell({
  Story,
  theme,
  language,
}: {
  Story: StoryFn;
  theme: typeof THEME_MODE.LIGHT | typeof THEME_MODE.DARK;
  language: SupportedLanguage;
}) {
  /**
   * @wisepen-manual-effect
   * 执行时机：Storybook 全局语言切换后同步 i18n 实例。
   * 不可替代原因：语言切换需要调用 i18next 的异步 API 并刷新文案上下文。
   * cleanup：无持久订阅或计时器，无需清理。
   */
  useEffect(() => {
    if (i18n.resolvedLanguage !== language) void changeAppLanguage(language);
  }, [language]);

  return (
    <ThemeApplier defaultTheme={theme}>
      <Story />
    </ThemeApplier>
  );
}

function StorybookThemeDecorator(Story: StoryFn, context: { globals: Record<string, string> }) {
  const theme = context.globals.theme === 'dark' ? THEME_MODE.DARK : THEME_MODE.LIGHT;
  const language = context.globals.language === 'en-US' ? 'en-US' : 'zh-CN';
  return <StorybookPreviewShell Story={Story} theme={theme} language={language} />;
}

const preview: Preview = {
  globalTypes: {
    theme: {
      description: '预览主题',
      defaultValue: 'light',
      toolbar: { title: '主题', items: ['light', 'dark'] },
    },
    language: {
      description: '预览语言',
      defaultValue: 'zh-CN',
      toolbar: { title: '语言', items: ['zh-CN', 'en-US'] },
    },
  },
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
