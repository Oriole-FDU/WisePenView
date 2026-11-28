import { ButtonGroup as HeroButtonGroup } from '@heroui/react';

import type { ButtonGroupProps } from './index.type';

function ButtonGroup(props: ButtonGroupProps) {
  return <HeroButtonGroup {...props} />;
}

const AppButtonGroup = Object.assign(ButtonGroup, {
  Root: ButtonGroup,
  Separator: HeroButtonGroup.Separator,
});

export default AppButtonGroup;

export type { ButtonGroupProps } from './index.type';
