import { publicAppConfig } from '@/config/runtimeConfig';

/**
 * 运行时 API 地址单例。
 *
 * dev / mock：直接使用公开 API 地址。
 * production：由应用入口启动内外网探测；停止时移除监听、清理轮询并终止探测。
 */

const POLL_INTERVAL_MS = 60_000;
const ADDR_READY_AWAIT_MS = 1_500;
const { api: apiConfig } = publicAppConfig;
const switchingEnabled = apiConfig.switchByNetwork;
const extranetBaseUrl = apiConfig.baseUrl;

let serverBaseUrl = extranetBaseUrl;
let monitoringStarted = false;
let addrSuspectedDead = false;
let probeInflight: Promise<void> | null = null;
let probeAbortController: AbortController | null = null;
let pollTimerId: number | null = null;
let lifecycleToken = 0;

const handleOnline = (): void => {
  triggerImmediateProbe();
};

const handleOffline = (): void => {
  if (monitoringStarted) addrSuspectedDead = true;
};

const handleVisibilityChange = (): void => {
  if (document.visibilityState === 'visible') {
    triggerImmediateProbe();
  }
};

async function probeIntranet(): Promise<boolean> {
  const intranetBaseUrl = apiConfig.intranetBaseUrl;
  const intranetPingPath = apiConfig.intranetPingPath;
  if (!intranetBaseUrl || !intranetPingPath) return false;

  const url = new URL(intranetPingPath, intranetBaseUrl).toString();
  const controller = new AbortController();
  probeAbortController = controller;
  const timer = window.setTimeout(() => controller.abort(), apiConfig.networkProbeTimeoutMs);
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
    if (probeAbortController === controller) probeAbortController = null;
  }
}

async function probeAndSwitch(token: number): Promise<void> {
  const intranetOk = await probeIntranet();
  if (!monitoringStarted || token !== lifecycleToken) return;

  serverBaseUrl = intranetOk ? (apiConfig.intranetBaseUrl ?? extranetBaseUrl) : extranetBaseUrl;
  addrSuspectedDead = false;
}

function scheduleNextProbe(token: number): void {
  if (!monitoringStarted || token !== lifecycleToken) return;
  if (pollTimerId !== null) window.clearTimeout(pollTimerId);
  pollTimerId = window.setTimeout(() => {
    if (!monitoringStarted || token !== lifecycleToken) return;
    pollTimerId = null;
    void runProbe();
  }, POLL_INTERVAL_MS);
}

function runProbe(): Promise<void> {
  if (!switchingEnabled || !monitoringStarted) return Promise.resolve();
  if (probeInflight) return probeInflight;

  const token = lifecycleToken;
  const currentProbe = (async () => {
    try {
      await probeAndSwitch(token);
    } finally {
      if (monitoringStarted && token === lifecycleToken) {
        probeInflight = null;
        scheduleNextProbe(token);
      }
    }
  })();
  probeInflight = currentProbe;
  return currentProbe;
}

function triggerImmediateProbe(): void {
  if (!switchingEnabled || !monitoringStarted) return;
  if (pollTimerId !== null) {
    window.clearTimeout(pollTimerId);
    pollTimerId = null;
  }
  void runProbe();
}

export function startApiServerAddressMonitoring(): void {
  if (!switchingEnabled || monitoringStarted) return;

  monitoringStarted = true;
  lifecycleToken += 1;
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  void runProbe();
}

export function stopApiServerAddressMonitoring(): void {
  if (!switchingEnabled || !monitoringStarted) return;

  monitoringStarted = false;
  lifecycleToken += 1;
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  if (pollTimerId !== null) {
    window.clearTimeout(pollTimerId);
    pollTimerId = null;
  }
  probeAbortController?.abort();
  probeAbortController = null;
  probeInflight = null;
  addrSuspectedDead = false;
  serverBaseUrl = extranetBaseUrl;
}

export function notifyAddrFailure(): void {
  if (!switchingEnabled) return;
  addrSuspectedDead = true;
  triggerImmediateProbe();
}

export async function awaitAddrReady(maxWaitMs: number = ADDR_READY_AWAIT_MS): Promise<void> {
  if (!switchingEnabled || !monitoringStarted || !addrSuspectedDead) return;
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
