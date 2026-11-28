import type { AppPressableProps } from './index.type';

function AppPressable({ type = 'button', ...props }: AppPressableProps) {
  return <button {...props} type={type} />;
}

export default AppPressable;
