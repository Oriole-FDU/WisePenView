import { installBrowser, loadObservability } from './harness.mjs';

export const reactStub = `
  const slots = [];
  let cursor = 0;
  export const hooks = {
    render(fn) {
      cursor = 0;
      return fn();
    },
  };
  export function useRef(value) { const index = cursor++; return slots[index] ??= { current: value }; }
  export function useState(initial) {
    const index = cursor++;
    if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
    return [slots[index], next => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }];
  }
`;

export const ahooksStub = `
  import { useRef } from 'react';
  export function useLatest(value) { const ref = useRef(value); ref.current = value; return ref; }
  export const useUnmountedRef = () => useRef(false);
`;

const aiSdkStub = `
  export const sdk = { options: null, send: async () => {}, resume: async () => {} };
  const chat = {
    messages: [],
    status: 'ready',
    setMessages() {},
    stop() {},
    sendMessage: (...args) => sdk.send(...args),
    resumeStream: (...args) => sdk.resume(...args),
  };
  export function useChat(options) { sdk.options = options; return chat; }
`;

const controlledStateStub = `
  export const state = {
    route: { sessionId: 'chat-one', locationKey: 'one' },
    getActive: async () => 'turn-one',
    finishCount: 0,
  };
`;

export const chatStubs = {
  react: `${reactStub}
  `,
  'react/jsx-runtime': `
    export const Fragment = Symbol('fragment');
    export const jsx = (type, props) => typeof type === 'function' ? type(props) : ({ type, props });
    export const jsxs = jsx;
  `,
  'react-i18next': `
    export const useTranslation = () => ({ t: key => key });
    export const initReactI18next = { type: '3rdParty', init() {} };
  `,
  'react-error-boundary': `
    export const ErrorBoundary = () => null;
  `,
  '@/apis/buildApiUrl': `
    export const buildApiUrl = path => 'https://api.example.test' + path;
  `,
  '@/apis/runtime': `
    export const awaitAddrReady = async () => {};
    export const notifyAddrFailure = () => {};
    export const applyXDeveloperHeader = headers => headers;
  `,
  ahooks: ahooksStub,
  '@heroui/react': `
    export const notices = [];
    export const toast = Object.fromEntries(
      ['danger', 'warning', 'success'].map(type => [type, value => notices.push({ type, value })])
    );
  `,
  '@ai-sdk/react': aiSdkStub,
  ai: `
    export class DefaultChatTransport { constructor(options) { this.options = options; } }
    export const isTextUIPart = part => part.type === 'text';
    export const isReasoningUIPart = part => part.type === 'reasoning';
    export const isToolUIPart = () => false;
  `,
  'controlled-state': controlledStateStub,
  '@/domains': `
    import { state } from 'controlled-state';
    export const useChatService = () => ({
      getActiveTurnId: (...args) => state.getActive(...args),
      cancelTurn: async () => {},
    });
  `,
  '@/domains/Chat': `
    export { useChatSession } from '@/domains/Chat/session/useChatSession';
  `,
  '@/hooks/useChatSessionRoute': `
    import { state } from 'controlled-state';
    export const useChatSessionRoute = () => state.route;
  `,
  '@/layouts/App/_context': `
    export const useAppAuth = () => ({ isAuthenticated: true, requireLogin() {} });
  `,
  '@/frontendState': `
    import { state } from 'controlled-state';
    export const readFrontendStates = () => ({
      states: [],
      finishSend() { state.finishCount += 1; },
    });
  `,
  './useChatTurnHistory': `export const useChatTurnHistory = () => ({});`,
  './useChatToolApproval': `export const useChatToolApproval = () => ({});`,
};

export const loadChat = async (testContext) => {
  const browser = installBrowser(testContext);
  const telemetry = await loadObservability(testContext, {
    entry: `
      export { useChatSession } from '@/domains/Chat/session/useChatSession';
      export { useChatTurnController } from '@/components/business/Chat/_controllers/useChatTurnController';
      export { hooks } from 'react';
      export { sdk } from '@ai-sdk/react';
      export { state } from 'controlled-state';
      export { notices } from '@heroui/react';
    `,
    stubs: chatStubs,
  });
  return { ...telemetry, browser };
};
