import { ToggleButtonGroup as HeroToggleButtonGroup } from '@heroui/react';
import type { ComponentProps } from 'react';

export type ToggleButtonGroupProps = ComponentProps<typeof HeroToggleButtonGroup>;

function ToggleButtonGroup(props: ToggleButtonGroupProps) {
  return <HeroToggleButtonGroup {...props} />;
}

const AppToggleButtonGroup = Object.assign(ToggleButtonGroup, {
  Root: ToggleButtonGroup,
  Separator: HeroToggleButtonGroup.Separator,
});

export default AppToggleButtonGroup;
