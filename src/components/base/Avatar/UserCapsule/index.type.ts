export type UserCapsuleVariant = 'bare' | 'capsule';

export interface UserCapsuleProps {
  name: string;
  avatar?: string;
  variant?: UserCapsuleVariant;
}
