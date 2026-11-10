import apiRequest from "../api/apiRequest";

const DEVICE_ID_KEY = "ems.push.device-id";

const isPushSupported = () =>
  typeof window !== "undefined" &&
  "Notification" in window &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  window.isSecureContext;

const getDeviceId = () => {
  let deviceId = window.localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = window.crypto.randomUUID();
    window.localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
};

const decodeVapidKey = (value) => {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
};

export const isBrowserPushSupported = isPushSupported;

export const subscribeBrowserPush = async () => {
  if (!isPushSupported()) throw new Error("Browser push notifications are not supported here.");
  const applicationServerKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!applicationServerKey) throw new Error("Browser notifications are not configured for this site.");

  const serviceWorker = navigator.serviceWorker;
  const serviceWorkerUrl = new URL("/service-worker.js", window.location.origin).href;
  const frontendScope = new URL("/", window.location.origin).href;
  let registration;
  try {
    registration = await serviceWorker.getRegistration(frontendScope);
    const hasExpectedWorker = [registration?.active, registration?.waiting, registration?.installing]
      .some((worker) => worker?.scriptURL === serviceWorkerUrl);
    if (!registration || !hasExpectedWorker) {
      registration = await serviceWorker.register(serviceWorkerUrl, { scope: frontendScope });
    }
  } catch (error) {
    throw new Error(`Could not register the EMS Service Worker at /service-worker.js: ${error.message || "registration failed"}. Check that it is served from the site root over HTTPS or localhost.`);
  }

  if (registration.scope !== frontendScope) {
    throw new Error("The EMS Service Worker scope does not cover the frontend. It must be registered at the site root.");
  }

  let activeRegistration;
  let readinessTimeout;
  try {
    activeRegistration = await Promise.race([
      serviceWorker.ready,
      new Promise((_, reject) => {
        readinessTimeout = window.setTimeout(
          () => reject(new Error("timed out waiting for activation")),
          15000,
        );
      }),
    ]);
  } catch (error) {
    throw new Error(`The EMS Service Worker did not become ready: ${error.message || "readiness failed"}. Reload the page and try again.`);
  } finally {
    window.clearTimeout(readinessTimeout);
  }
  if (
    activeRegistration.scope !== frontendScope ||
    !activeRegistration.active ||
    activeRegistration.active.state !== "activated" ||
    activeRegistration.active.scriptURL !== serviceWorkerUrl
  ) {
    throw new Error("The EMS Service Worker is not active for the frontend yet. Reload the page and try again.");
  }

  let subscription;
  try {
    subscription = await activeRegistration.pushManager.getSubscription();
  } catch (error) {
    throw new Error(`Could not check the existing browser push subscription: ${error.message || "subscription lookup failed"}.`);
  }
  if (!subscription) {
    try {
      subscription = await activeRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeVapidKey(applicationServerKey),
      });
    } catch (error) {
      const detail = error.message || "subscription failed";
      if (error.name === "InvalidStateError") {
        throw new Error(`The EMS Service Worker is not active yet: ${detail}. Reload the page and try again.`);
      }
      if (error.name === "NotAllowedError") {
        throw new Error(`The browser rejected the push subscription: ${detail}. Check notification permission and that the VAPID keys match.`);
      }
      throw new Error(`Could not create a browser push subscription: ${detail}.`);
    }
  }

  await apiRequest.post("/notification/push-subscription", {
    deviceId: getDeviceId(),
    subscription: subscription.toJSON(),
  });
  return subscription;
};

export const unsubscribeBrowserPushDevice = async () => {
  if (typeof window === "undefined") return;
  const deviceId = window.localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) return;

  let subscription = null;
  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.getRegistration().catch(() => null);
    subscription = await registration?.pushManager?.getSubscription().catch(() => null);
  }

  let requestError = null;
  try {
    await apiRequest.delete("/notification/push-subscription", {
      data: { deviceId, endpoint: subscription?.endpoint },
    });
  } catch (error) {
    requestError = error;
  }

  if (subscription) await subscription.unsubscribe().catch(() => {});
  if (!requestError) window.localStorage.removeItem(DEVICE_ID_KEY);
  if (requestError) throw requestError;
};
