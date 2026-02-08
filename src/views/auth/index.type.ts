export interface LoginProps {
    account: string;
    password: string;
}

export interface RegisterProps {
    username: string;
    password: string;
}

export interface ResetPasswordProps {
    campusNum: string;
}

export interface NewPasswordProps {
    newPassword: string;
}