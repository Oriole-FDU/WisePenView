import { ToggleButtonGroup as HeroToggleButtonGroup } from '@heroui/react';

import type { ToggleButtonGroupProps } from './index.type';

function ToggleButtonGroup(props: ToggleButtonGroupProps) {
  return <HeroToggleButtonGroup {...props} />;
}

const AppToggleButtonGroup = Object.assign(ToggleButtonGroup, {
  Root: ToggleButtonGroup,
  Separator: HeroToggleButtonGroup.Separator,
});

export default AppToggleButtonGroup;

export type { ToggleButtonGroupProps } from './index.type';
