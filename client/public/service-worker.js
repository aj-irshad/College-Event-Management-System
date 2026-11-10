self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = typeof data.title === "string" ? data.title : "EMS";
  const options = {
    body: typeof data.body === "string" ? data.body : "You have a new notification. Open EMS to view it.",
    tag: typeof data.tag === "string" ? data.tag : undefined,
    data: { url: typeof data.url === "string" ? data.url : "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = event.notification.data?.url;
  let targetUrl = new URL("/", self.location.origin).href;
  if (typeof path === "string") {
    try {
      const parsed = new URL(path, self.location.origin);
      if (parsed.origin === self.location.origin) targetUrl = parsed.href;
    } catch {
      // Keep the same-origin EMS root as the fallback destination.
    }
  }

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin) {
        await client.navigate(targetUrl);
        return client.focus();
      }
    }
    return self.clients.openWindow(targetUrl);
  })());
});
