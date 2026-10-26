import type { AuthApi as AuthApiContract } from '../apis/AuthApi';
export const AuthApi: typeof AuthApiContract = {
  login: async () => 'mock-auth-session',
  logout: async () => undefined,
  register: async () => undefined,
  forgotPasswordEmail: async () => undefined,
  forgotPasswordReset: async () => undefined,
  changePassword: async () => undefined,
};
