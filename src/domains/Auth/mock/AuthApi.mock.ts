import type { AuthApi as AuthApiContract } from '../apis/AuthApi';
export const AuthApi: typeof AuthApiContract = {
  login: async () => 'mock-auth-session',
  logout: async () => null,
  register: async () => null,
  forgotPasswordEmail: async () => null,
  forgotPasswordReset: async () => null,
  changePassword: async () => null,
};
