import { Switch as HeroSwitch } from '@heroui/react';
import type { ComponentProps, ReactNode } from 'react';

import styles from './style.module.scss';

export type SwitchProps = ComponentProps<typeof HeroSwitch>;

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
