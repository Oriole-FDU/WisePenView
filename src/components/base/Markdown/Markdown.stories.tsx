import type { Meta, StoryObj } from '@storybook/react-vite';

import Markdown from './index';

const meta = { title: 'Base/Markdown', component: Markdown, tags: ['autodocs'] } satisfies Meta<
  typeof Markdown
>;
export default meta;
type Story = StoryObj;
const content =
  '# 项目说明\n\n这是一段 **Markdown**，包含脚注[^1]、公式 $a^2+b^2=c^2$ 和代码。\n\n```ts\nconst ready = true;\n```\n\n[^1]: 这是脚注内容。';
export const RichContent: Story = { args: { content } };
export const Streaming: Story = {
  args: { content: '# 正在生成\n\n内容会持续更新...', streaming: true },
};
export const AnchorCallback: Story = {
  args: { content, onAnchorNavigate: (hash: string) => console.warn('导航到锚点', hash) },
};
