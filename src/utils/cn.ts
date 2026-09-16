import { type ClassValue, clsx } from 'clsx';

export const cn = (...inputs: ClassValue[]): string => clsx(inputs);
