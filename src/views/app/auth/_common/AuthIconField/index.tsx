import { Input } from '@/components/Input';
import { User } from 'lucide-react';
import type { AuthIconFieldProps } from './index.type';
import styles from './style.module.less';

/** 认证表单左侧 User 图标输入，登录/注册/找回密码共用 */
function AuthIconField(props: AuthIconFieldProps) {
  return (
    <div className={styles.root}>
      <User className={styles.icon} size={18} aria-hidden="true" />
      <Input {...props} />
    </div>
  );
}

export default AuthIconField;
