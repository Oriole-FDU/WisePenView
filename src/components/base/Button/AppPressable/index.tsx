import type { ComponentPropsWithRef } from 'react';

function AppPressable({ type = 'button', ...props }: ComponentPropsWithRef<'button'>) {
  return <button {...props} type={type} />;
}

export default AppPressable;
