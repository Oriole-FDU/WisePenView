import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ahooksStub, loadBusinessTelemetry, reactStub } from './hookBoundaries.mjs';

test('Office 实际 SDK callbacks 进入真 OTel，ready/modified 不推断保存终态且不记录错误', async (context) => {
  const telemetry = await loadBusinessTelemetry(context, {
    entry: `
      export { default as OfficeEditor } from '@/components/editors/office';
      export { hooks } from 'react';
      export { sdk } from '@onlyoffice/document-editor-react';
      export { state } from 'office-state';
    `,
    stubs: {
      react: `${reactStub}
        export function useReducer(reducer, initial) { const [value, set] = useState(initial); return [value, action => set(current => reducer(current, action))]; }`,
      ahooks: `${ahooksStub}
        export function useMemoizedFn(fn) { const ref = useLatest(fn); const stable = useRef((...args) => ref.current(...args)); return stable.current; }`,
      'react/jsx-runtime': `
        export const Fragment = Symbol('fragment');
        export const jsx = (type, props) => typeof type === 'function' ? type(props) : ({type, props});
        export const jsxs = jsx;`,
      '@onlyoffice/document-editor-react': `export const sdk = {}; export function DocumentEditor(props) { sdk.props = props; return null; }`,
      'office-state': `export const state = {};`,
      '../_context': `export const useEditorSurface = () => ({ instanceId: 'office-one', target: { resourceId: 'office-one', resourceType: 'document' } }); export const EditorSurfaceProvider = props => props.children;`,
      '../_runtime/useEditorRuntime': `import { state } from 'office-state'; export const useEditorRuntime = (snapshot, exit) => { state.snapshot = snapshot; state.exit = exit; }; export const useEditorLoadState = () => {};`,
      '@/components/editors/_runtime/EditorPresentationBinding': `export default () => null;`,
      '@/components/base/Button': `export const AppButton = () => null;`,
      '@/components/base/Feedback': `export const ResultState = () => null; export const Spin = () => null;`,
      '@/config/runtimeConfig': `export const publicAppConfig = { mode: 'development', observability: { otelEndpoint: '/otel' }, api: { baseUrl: 'https://api.example.test' }, office: { documentServerUrl: 'https://office.example.test' } };`,
      '@/domains': `export const useDocumentService = () => ({}); export const useInteractService = () => ({});`,
      '@/hooks/useApi': `export const useApi = () => ({ data: { docInfo: { resourceInfo: { resourceName: 'private document' }, docMetaInfo: { uploadMeta: { fileType: 'docx' } } }, editorConfig: { config: { document: { permissions: { edit: true } }, editorConfig: { mode: 'edit' } } } }, loading: false });`,
      './style.module.scss': `export default {};`,
    },
  });
  const render = () =>
    telemetry.hooks.render(() => telemetry.OfficeEditor({ resourceId: 'office-one' }));
  render();
  telemetry.sdk.props.events_onDocumentReady();
  telemetry.sdk.props.events_onDocumentStateChange({ data: true });
  render();
  assert.equal(telemetry.state.snapshot.hasUnsavedChanges, true);
  assert.equal(telemetry.state.snapshot.pendingWork, true);
  assert.equal(telemetry.records.length, 0);
  telemetry.sdk.props.events_onDocumentStateChange({ data: false });
  render();
  assert.equal(telemetry.state.snapshot.hasUnsavedChanges, false);
  assert.equal(telemetry.records.length, 0);
  telemetry.sdk.props.events_onDocumentStateChange({ data: true });
  const event = { data: { errorCode: 99, errorDescription: 'private SDK document body' } };
  telemetry.sdk.props.events_onError(event);
  render();
  const firstError = telemetry.state.snapshot.error;
  assert.ok(firstError);
  assert.equal(firstError.cause, event);
  assert.equal(telemetry.state.snapshot.hasUnsavedChanges, true);
  assert.equal(telemetry.state.snapshot.warnBeforeUnload, true);
  assert.equal(telemetry.records.length, 1);
  assert.equal(telemetry.records[0].attributes['operation.name'], 'office-sdk');
  assert.equal(telemetry.records[0].attributes['error.origin'], 'handled');
  assert.equal(
    telemetry.records[0].attributes['error.code'],
    telemetry.FRONTEND_CLIENT_ERROR.OFFICE_LOAD_FAILED
  );
  telemetry.flushTelemetryEvents(true);
  telemetry.sdk.props.onLoadComponentError(42, 'private SDK description');
  render();
  assert.notEqual(telemetry.state.snapshot.error, firstError);
  assert.equal(telemetry.state.snapshot.error.meta.errorCode, 42);
  assert.equal(telemetry.state.snapshot.hasUnsavedChanges, true);
  assert.equal(telemetry.records.length, 2);
  assert.ok(!JSON.stringify(telemetry.records).includes('private SDK'));
  assert.ok(!JSON.stringify(telemetry.records).includes('private document'));
  assert.equal(typeof telemetry.state.exit, 'function');
});
