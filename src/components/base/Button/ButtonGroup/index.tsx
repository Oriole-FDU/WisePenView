import { ButtonGroup as HeroButtonGroup } from '@heroui/react';
import type { ComponentProps } from 'react';

export type ButtonGroupProps = ComponentProps<typeof HeroButtonGroup>;

function ButtonGroup(props: ButtonGroupProps) {
  return <HeroButtonGroup {...props} />;
}

const AppButtonGroup = Object.assign(ButtonGroup, {
  Root: ButtonGroup,
  Separator: HeroButtonGroup.Separator,
});

export default AppButtonGroup;
