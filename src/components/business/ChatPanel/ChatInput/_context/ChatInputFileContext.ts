import { createContext } from 'react';

export interface ChatInputFileContextValue {
  openLocalFilePicker: () => void;
  routeFiles: (fileList: FileList | File[]) => Promise<void>;
}

export const ChatInputFileContext = createContext<ChatInputFileContextValue | null>(null);
