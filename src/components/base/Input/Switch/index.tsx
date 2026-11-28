import { Switch as HeroSwitch } from '@heroui/react';
import type { ReactNode } from 'react';

import type { SwitchProps } from './index.type';
import styles from './style.module.scss';

function SwitchRoot({ children, ...props }: SwitchProps) {
  return (
    <HeroSwitch {...props}>
      <HeroSwitch.Content className={styles.content}>
        <HeroSwitch.Control>
          <HeroSwitch.Thumb />
        </HeroSwitch.Control>
        {children as ReactNode}
      </HeroSwitch.Content>
    </HeroSwitch>
  );
}

const Switch = Object.assign(SwitchRoot, {
  Content: HeroSwitch.Content,
  Control: HeroSwitch.Control,
  Icon: HeroSwitch.Icon,
  Root: SwitchRoot,
  Thumb: HeroSwitch.Thumb,
});

export default Switch;

export type { SwitchProps } from './index.type';
