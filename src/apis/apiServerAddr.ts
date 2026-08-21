/**
 * 运行时 API 地址单例。
 *
 * dev / mock：直接使用 `VITE_API_BASE_URL`。
 * production：默认外网兜底，后台探测内网 `ping`，可达后切到校内地址。
 */

const POLL_INTERVAL_MS = 60_000;
const ADDR_READY_AWAIT_MS = 1_500;
const EXTRANET_BASE_URL = import.meta.env.VITE_API_BASE_URL;

let serverBaseUrl = EXTRANET_BASE_URL;
let switchingEnabled = false;
let intranetBaseUrl = '';
let pingPath = '';
let probeTimeoutMs = 1_000;
let addrSuspectedDead = false;
let probeInflight: Promise<void> | null = null;
let pollTimerId: number | null = null;

// 生产环境下，启用内外网切换逻辑
if (import.meta.env.MODE === 'production') {
  switchingEnabled = true;
  intranetBaseUrl = import.meta.env.VITE_API_BASE_URL_INTRANET;
  pingPath = import.meta.env.VITE_INTRANET_PING_PATH;
  probeTimeoutMs = Number(import.meta.env.VITE_NETWORK_PROBE_TIMEOUT);

  void runProbe();

  window.addEventListener('online', () => {
    triggerImmediateProbe();
  });
  window.addEventListener('offline', () => {
    addrSuspectedDead = true;
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      triggerImmediateProbe();
    }
  });
}

async function probeIntranet(): Promise<boolean> {
  const url = new URL(pingPath, intranetBaseUrl).toString();
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), probeTimeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timer);
  }
}

async function probeAndSwitch(): Promise<void> {
  const intranetOk = await probeIntranet();
  if (intranetOk) {
    serverBaseUrl = intranetBaseUrl;
  } else {
    serverBaseUrl = EXTRANET_BASE_URL;
  }
  addrSuspectedDead = false;
}

function runProbe(): Promise<void> {
  if (probeInflight) return probeInflight;
  probeInflight = (async () => {
    try {
      await probeAndSwitch();
    } finally {
      probeInflight = null;
      if (pollTimerId !== null) {
        window.clearTimeout(pollTimerId);
      }
      pollTimerId = window.setTimeout(() => {
        pollTimerId = null;
        void runProbe();
      }, POLL_INTERVAL_MS);
    }
  })();
  return probeInflight;
}

function triggerImmediateProbe(): void {
  if (!switchingEnabled) return;
  if (pollTimerId !== null) {
    window.clearTimeout(pollTimerId);
    pollTimerId = null;
  }
  void runProbe();
}

export function notifyAddrFailure(): void {
  if (!switchingEnabled) return;
  addrSuspectedDead = true;
  triggerImmediateProbe();
}

export async function awaitAddrReady(maxWaitMs: number = ADDR_READY_AWAIT_MS): Promise<void> {
  if (!switchingEnabled) return;
  if (!addrSuspectedDead) return;
  const inflight = probeInflight;
  if (!inflight) return;
  await Promise.race([
    inflight,
    new Promise<void>((resolve) => window.setTimeout(resolve, maxWaitMs)),
  ]);
}

export function getApiBaseUrl(): string {
  return serverBaseUrl;
}

export function buildApiUrl(path: `/${string}`): string {
  return new URL(path, getApiBaseUrl()).toString();
}
