export type VerifyModalMode = 'email' | 'uis';
export type VerifyFormErrors = Partial<Record<'email' | 'uisAccount' | 'uisPassword', string>>;

export type UisOutcomeState = {
  /** false：仍处扫码阶段，禁止关闭弹窗；true：后端已 completed，可关闭并展示结果 */
  pollingCompleted: boolean;
  requireAction: boolean;
  actionPayload: string;
  message: string;
};
