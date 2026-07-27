import enUSAdmin from './locales/en-US/admin';
import enUSAgent from './locales/en-US/agent';
import enUSAuth from './locales/en-US/auth';
import enUSChat from './locales/en-US/chat';
import enUSCommon from './locales/en-US/common';
import enUSDrive from './locales/en-US/drive';
import enUSErrors from './locales/en-US/errors';
import enUSGroup from './locales/en-US/group';
import enUSNote from './locales/en-US/note';
import enUSProfile from './locales/en-US/profile';
import enUSResource from './locales/en-US/resource';
import enUSShell from './locales/en-US/shell';
import enUSSkill from './locales/en-US/skill';
import enUSTable from './locales/en-US/table';
import enUSWallet from './locales/en-US/wallet';
import enUSWorkspace from './locales/en-US/workspace';
import zhCNAdmin from './locales/zh-CN/admin';
import zhCNAgent from './locales/zh-CN/agent';
import zhCNAuth from './locales/zh-CN/auth';
import zhCNChat from './locales/zh-CN/chat';
import zhCNCommon from './locales/zh-CN/common';
import zhCNDrive from './locales/zh-CN/drive';
import zhCNErrors from './locales/zh-CN/errors';
import zhCNGroup from './locales/zh-CN/group';
import zhCNNote from './locales/zh-CN/note';
import zhCNProfile from './locales/zh-CN/profile';
import zhCNResource from './locales/zh-CN/resource';
import zhCNShell from './locales/zh-CN/shell';
import zhCNSkill from './locales/zh-CN/skill';
import zhCNTable from './locales/zh-CN/table';
import zhCNWallet from './locales/zh-CN/wallet';
import zhCNWorkspace from './locales/zh-CN/workspace';

export const DEFAULT_LANGUAGE = 'zh-CN' as const;

export const SUPPORTED_LANGUAGES = ['zh-CN', 'en-US'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const I18N_NAMESPACES = {
  COMMON: 'common',
  AUTH: 'auth',
  SHELL: 'shell',
  ERRORS: 'errors',
  TABLE: 'table',
  DRIVE: 'drive',
  RESOURCE: 'resource',
  CHAT: 'chat',
  GROUP: 'group',
  WALLET: 'wallet',
  PROFILE: 'profile',
  WORKSPACE: 'workspace',
  NOTE: 'note',
  AGENT: 'agent',
  SKILL: 'skill',
  ADMIN: 'admin',
} as const;

export type I18nNamespace = (typeof I18N_NAMESPACES)[keyof typeof I18N_NAMESPACES];

export const resources = {
  'zh-CN': {
    [I18N_NAMESPACES.COMMON]: zhCNCommon,
    [I18N_NAMESPACES.AUTH]: zhCNAuth,
    [I18N_NAMESPACES.SHELL]: zhCNShell,
    [I18N_NAMESPACES.ERRORS]: zhCNErrors,
    [I18N_NAMESPACES.TABLE]: zhCNTable,
    [I18N_NAMESPACES.DRIVE]: zhCNDrive,
    [I18N_NAMESPACES.RESOURCE]: zhCNResource,
    [I18N_NAMESPACES.CHAT]: zhCNChat,
    [I18N_NAMESPACES.GROUP]: zhCNGroup,
    [I18N_NAMESPACES.WALLET]: zhCNWallet,
    [I18N_NAMESPACES.PROFILE]: zhCNProfile,
    [I18N_NAMESPACES.WORKSPACE]: zhCNWorkspace,
    [I18N_NAMESPACES.NOTE]: zhCNNote,
    [I18N_NAMESPACES.AGENT]: zhCNAgent,
    [I18N_NAMESPACES.SKILL]: zhCNSkill,
    [I18N_NAMESPACES.ADMIN]: zhCNAdmin,
  },
  'en-US': {
    [I18N_NAMESPACES.COMMON]: enUSCommon,
    [I18N_NAMESPACES.AUTH]: enUSAuth,
    [I18N_NAMESPACES.SHELL]: enUSShell,
    [I18N_NAMESPACES.ERRORS]: enUSErrors,
    [I18N_NAMESPACES.TABLE]: enUSTable,
    [I18N_NAMESPACES.DRIVE]: enUSDrive,
    [I18N_NAMESPACES.RESOURCE]: enUSResource,
    [I18N_NAMESPACES.CHAT]: enUSChat,
    [I18N_NAMESPACES.GROUP]: enUSGroup,
    [I18N_NAMESPACES.WALLET]: enUSWallet,
    [I18N_NAMESPACES.PROFILE]: enUSProfile,
    [I18N_NAMESPACES.WORKSPACE]: enUSWorkspace,
    [I18N_NAMESPACES.NOTE]: enUSNote,
    [I18N_NAMESPACES.AGENT]: enUSAgent,
    [I18N_NAMESPACES.SKILL]: enUSSkill,
    [I18N_NAMESPACES.ADMIN]: enUSAdmin,
  },
} as const;
