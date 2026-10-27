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
  export function useReducer(reducer, initial) {
    const [value, setValue] = useState(initial);
    return [value, action => setValue(current => reducer(current, action))];
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

const officeState = {
  snapshot: null,
  exit: null,
};

export const loadOffice = async (testContext) => {
  const browser = installBrowser(testContext);
  const telemetry = await loadObservability(testContext, {
    entry: `
      export { default as OfficeEditor } from '@/components/editors/office';
      export { hooks } from 'react';
      export { sdk } from '@onlyoffice/document-editor-react';
      export { officeState } from 'office-state';
    `,
    stubs: {
      react: reactStub,
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
      ahooks: `${ahooksStub}
        export function useMemoizedFn(fn) { const ref = useLatest(fn); return useRef((...args) => ref.current(...args)).current; }
      `,
      '@onlyoffice/document-editor-react': `
        export const sdk = {};
        export function DocumentEditor(props) { sdk.props = props; return null; }
      `,
      'office-state': `
        export const officeState = ${JSON.stringify(officeState)};
      `,
      '../_context': `
        export const useEditorSurface = () => ({
          instanceId: 'office-one',
          target: { resourceId: 'office-one', resourceType: 'document' },
        });
        export const EditorSurfaceProvider = props => props.children;
      `,
      '../_runtime/useEditorRuntime': `
        import { officeState } from 'office-state';
        export const useEditorRuntime = (snapshot, exit) => {
          officeState.snapshot = snapshot;
          officeState.exit = exit;
        };
        export const useEditorLoadState = () => {};
      `,
      '@/components/editors/_runtime/EditorPresentationBinding': `export default () => null;`,
      '@/components/base/Button': `export const AppButton = () => null;`,
      '@/components/base/Feedback': `
        export const ResultState = () => null;
        export const Spin = () => null;
      `,
      '@/config/runtimeConfig': `
        export const publicAppConfig = {
          mode: 'development',
          observability: { otelEndpoint: '/otel' },
          api: { baseUrl: 'https://api.example.test' },
          office: { documentServerUrl: 'https://office.example.test' },
        };
      `,
      '@/domains': `
        export const useDocumentService = () => ({});
        export const useInteractService = () => ({});
      `,
      '@/hooks/useApi': `
        export const useApi = () => ({
          data: {
            docInfo: {
              resourceInfo: { resourceName: 'private document' },
              docMetaInfo: { uploadMeta: { fileType: 'docx' } },
            },
            editorConfig: {
              sessionId: 'session-one',
              config: {
                document: { permissions: { edit: true } },
                editorConfig: { mode: 'edit' },
              },
            },
          },
          mutate() {},
          refresh() {},
          loading: false,
          error: null,
        });
      `,
      '@/utils/navigation/appRoute': `
        export const APP_ROUTE_PATH = { DRIVE_PERSONAL: '/drive/personal' };
      `,
      'react-router-dom': `
        export const Link = props => props.children;
        export const isRouteErrorResponse = () => false;
      `,
      './style.module.scss': `export default {};`,
    },
  });
  return { ...telemetry, browser };
};

export const loadDrawio = async (testContext) => {
  const browser = installBrowser(testContext);
  const telemetry = await loadObservability(testContext, {
    entry: `
      export { useDrawioEditorSession } from '@/components/editors/drawio/hooks/useDrawioEditorSession';
      export { createDrawioSaveSession } from '@/components/editors/drawio/drawioSaveSession';
      export { hooks } from 'react';
      export { listeners } from 'ahooks';
      export { notices } from '@heroui/react';
    `,
    stubs: {
      react: `${reactStub}
        const cleanups = [];
        export function useEffect(fn, deps) {
          const slot = useRef({ deps: null });
          if (!slot.current.deps || deps.some((value, index) => value !== slot.current.deps[index])) {
            slot.cleanup?.();
            slot.cleanup = fn();
            slot.current.deps = deps;
            cleanups.push(() => slot.cleanup?.());
          }
        }
        hooks.dispose = () => { for (const cleanup of cleanups.reverse()) cleanup(); };
        export const useSyncExternalStore = (_subscribe, snapshot) => snapshot();
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
      ahooks: `${ahooksStub}
        export const listeners = new Map();
        export function useMemoizedFn(fn) { const ref = useLatest(fn); return useRef((...args) => ref.current(...args)).current; }
        export function useEventListener(type, listener) { listeners.set(type, listener); }
      `,
      '@heroui/react': `
        export const notices = [];
        export const toast = Object.fromEntries(
          ['danger', 'warning', 'success'].map(type => [type, value => notices.push({ type, value })])
        );
      `,
    },
  });
  return { ...telemetry, browser };
};

export const loadSkill = async (testContext) => {
  const browser = installBrowser(testContext);
  const telemetry = await loadObservability(testContext, {
    entry: `
      export { useSkillSaveController } from '@/components/editors/skill/controllers/useSkillSaveController';
      export { hooks } from 'react';
      export { state } from 'controlled-state';
      export { notices } from '@heroui/react';
    `,
    stubs: {
      react: reactStub,
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
      'controlled-state': `
        export const state = { service: null };
      `,
      '@/domains': `
        import { state } from 'controlled-state';
        export const useSkillService = () => state.service;
      `,
      '@/hooks/useApi': `
        import { useState } from 'react';
        export function useApi(service, options = {}) {
          const [loading, setLoading] = useState(false);
          return {
            loading,
            runAsync: async (...args) => {
              setLoading(true);
              try {
                const data = await service(...args);
                options.onSuccess?.(data, args);
                return data;
              } catch (error) {
                options.onErrorEffect?.(error, args);
                throw error;
              } finally {
                setLoading(false);
              }
            },
          };
        }
      `,
      '@heroui/react': `
        export const notices = [];
        export const toast = Object.fromEntries(
          ['danger', 'warning', 'success'].map(type => [type, value => notices.push({ type, value })])
        );
      `,
    },
  });
  return { ...telemetry, browser };
};
