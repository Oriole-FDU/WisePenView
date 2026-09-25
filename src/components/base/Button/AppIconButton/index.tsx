import { ToggleButton, Tooltip } from '@heroui/react';
import { clsx } from 'clsx';
import type { ComponentProps, MouseEventHandler } from 'react';

import { mergeRefs } from '@/utils/react/mergeRefs';

import type { AppIconButtonProps } from './index.type';
import styles from './style.module.less';

function AppIconButton({
  icon,
  label,
  className,
  isActive,
  isDisabled = false,
  onClick,
  onPress,
  ref,
  size = 'md',
  toggleId,
  tooltip = {},
  variant = 'ghost',
  ...buttonProps
}: AppIconButtonProps) {
  const classNames = clsx(
    styles.root,
    styles[size],
    styles[variant],
    isActive && styles.active,
    className
  );
  // HeroUI 的 ToggleButton 将部分 DOM 事件声明为 div 泛型，但实际根节点和 ref 均为 button。
  const toggleButtonProps = buttonProps as ComponentProps<typeof ToggleButton>;
  const handleClick: MouseEventHandler<HTMLButtonElement> = (event) => {
    onClick?.(event);
    onPress?.();
  };
  const nativeButtonProps = {
    ...buttonProps,
    type: 'button' as const,
    disabled: isDisabled,
    className: classNames,
    onClick: isDisabled ? undefined : handleClick,
    'aria-label': label,
    'aria-pressed': isActive,
    'aria-disabled': isDisabled || undefined,
    'data-disabled': isDisabled || undefined,
    children: icon,
  };
  const button = toggleId ? (
    <ToggleButton
      {...toggleButtonProps}
      ref={ref}
      id={toggleId}
      variant="ghost"
      size={size === 'xs' ? 'sm' : size}
      isIconOnly
      isDisabled={isDisabled}
      className={classNames}
      aria-label={label}
      data-disabled={isDisabled || undefined}
      onPress={isDisabled ? undefined : onPress}
    >
      {icon}
    </ToggleButton>
  ) : isDisabled ? (
    <button {...nativeButtonProps} ref={ref} />
  ) : (
    <Tooltip.Trigger<'button'>
      {...nativeButtonProps}
      render={({ ref: tooltipRef, ...props }) => (
        <button {...props} ref={mergeRefs(ref, tooltipRef)} />
      )}
    />
  );

  return (
    <Tooltip delay={tooltip.delay} closeDelay={tooltip.closeDelay}>
      {isDisabled ? (
        // disabled 按钮不接收 hover，用无角色、不可聚焦的布局节点保留禁用提示。
        <Tooltip.Trigger<'span'>
          className={clsx(styles.tooltipTrigger, tooltip.triggerClassName)}
          render={(props) => <span {...props} role={undefined} tabIndex={undefined} />}
        >
          {button}
        </Tooltip.Trigger>
      ) : (
        <span className={clsx(styles.tooltipTrigger, tooltip.triggerClassName)}>{button}</span>
      )}
      <Tooltip.Content
        placement={tooltip.placement}
        offset={tooltip.offset}
        showArrow={tooltip.showArrow}
      >
        {tooltip.showArrow ? <Tooltip.Arrow /> : null}
        {tooltip.content ?? label}
      </Tooltip.Content>
    </Tooltip>
  );
}

export default AppIconButton;
export type { AppIconButtonProps, AppIconButtonTooltipOptions } from './index.type';
