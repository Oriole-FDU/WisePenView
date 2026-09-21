import { User } from 'lucide-react';

import { Input } from '@/components/base/Input';

import type { AuthIconFieldProps } from './index.type';
import styles from './style.module.less';

/** 认证表单左侧图标输入，登录/注册/找回密码共用 */
function AuthIconField({ icon: Icon = User, ...props }: AuthIconFieldProps) {
  return (
    <div className={styles.root}>
      <Icon className={styles.icon} size={18} aria-hidden="true" />
      <Input {...props} />
    </div>
  );
}

export default AuthIconField;
