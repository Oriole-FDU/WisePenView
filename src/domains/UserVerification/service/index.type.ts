export interface SendEmailVerifyRequest {
  email: string;
}

export interface ConfirmEmailVerifyRequest {
  token: string;
}

export interface InitiateUISVerifyRequest {
  uisAccount: string;
  uisPassword: string;
}

export interface FudanUISVerifyStatusData {
  completed: boolean;
  requireAction: boolean;
  actionPayload: string;
  message: string;
}

export interface IUserVerificationService {
  sendEmailVerify(params: SendEmailVerifyRequest): Promise<void>;
  confirmEmailVerify(params: ConfirmEmailVerifyRequest): Promise<void>;
  initiateUISVerify(params: InitiateUISVerifyRequest): Promise<void>;
  checkFudanUISVerify(): Promise<FudanUISVerifyStatusData>;
}
