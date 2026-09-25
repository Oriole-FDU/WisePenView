import { STORAGE_KEYS } from '@/constants/storageKeys';
import { isRecord } from '@/utils/type/typeGuards';

export type AuthSessionEventType = 'login' | 'logout' | 'unauthorized';

export interface AuthSessionEvent {
  type: AuthSessionEventType;
  sourceTabId: string;
  eventId: string;
}

type AuthSessionEventListener = (event: AuthSessionEvent) => void;

const TAB_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

let eventSequence = 0;
let sessionVersion = 0;
const listeners = new Set<AuthSessionEventListener>();

const parseAuthSessionEvent = (value: string): AuthSessionEvent | undefined => {
  const payload: unknown = JSON.parse(value);
  if (!isRecord(payload)) return undefined;

  const { type, sourceTabId, eventId } = payload;
  if (
    (type !== 'login' && type !== 'logout' && type !== 'unauthorized') ||
    typeof sourceTabId !== 'string' ||
    typeof eventId !== 'string'
  ) {
    return undefined;
  }

  return { type, sourceTabId, eventId };
};

const notifyListeners = (event: AuthSessionEvent): void => {
  listeners.forEach((listener) => listener(event));
};

const broadcastSessionEvent = (event: AuthSessionEvent): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.authSessionEvent, JSON.stringify(event));
  } catch {
    // 忽略浏览器存储异常，避免影响认证主流程
  }
};

export const authSessionCoordinator = {
  getSessionVersion(): number {
    return sessionVersion;
  },

  publish(type: AuthSessionEventType): void {
    sessionVersion += 1;
    eventSequence += 1;
    const event: AuthSessionEvent = {
      type,
      sourceTabId: TAB_ID,
      eventId: `${TAB_ID}-${Date.now()}-${eventSequence}`,
    };
    notifyListeners(event);
    broadcastSessionEvent(event);
  },

  subscribe(listener: AuthSessionEventListener): () => void {
    listeners.add(listener);

    const onStorage = (event: StorageEvent): void => {
      if (event.key !== STORAGE_KEYS.authSessionEvent || !event.newValue) return;

      try {
        const payload = parseAuthSessionEvent(event.newValue);
        if (!payload || payload.sourceTabId === TAB_ID) return;
        sessionVersion += 1;
        listener(payload);
      } catch {
        // 非法 payload 直接忽略
      }
    };

    window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener('storage', onStorage);
    };
  },
};
