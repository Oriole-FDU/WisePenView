import type { AuthApi as AuthApiContract } from '../apis/AuthApi';
export const AuthApi: typeof AuthApiContract = {
  login: async () => 'mock-token',
  logout: async () => undefined,
  register: async () => null,
  forgotPasswordEmail: async () => undefined,
  forgotPasswordReset: async () => undefined,
  changePassword: async () => undefined,
};
