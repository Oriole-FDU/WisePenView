export interface LoginFormValues {
    account: string;
    password: string;
}

export interface RegisterFormValues {
    username: string;
    password: string;
}

export interface ResetPasswordFormValues {
    campusNum: string;
}

export interface NewPasswordFormValue {
    newPassword: string;
}

export interface ContractModalProps {
    open: boolean;
    onCancel: () => void;
}
