import type { Button as HeroButton } from '@heroui/react';
import type { ComponentProps } from 'react';

export type AppButtonProps = ComponentProps<typeof HeroButton> & {
  /** 关闭 HeroUI Button 的按压缩放，供整行或多行布局的表层触发器使用。 */
  disablePressScale?: boolean;
};
