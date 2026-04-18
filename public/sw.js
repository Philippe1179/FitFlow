let scheduledTimeout = null;
let appUrl = '/';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const existing = windowClients.find((c) => c.url.includes(self.location.origin));
      if (existing) return existing.focus();
      return clients.openWindow(appUrl);
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data.type === 'SCHEDULE_NOTIFICATION') {
    if (scheduledTimeout) clearTimeout(scheduledTimeout);

    const delay = Math.max(0, event.data.endsAt - Date.now());
    const { title, body } = event.data;

    event.waitUntil(
      new Promise((resolve) => {
        scheduledTimeout = setTimeout(() => {
          scheduledTimeout = null;
          self.registration
            .showNotification(title, { body, tag: 'rest-timer', renotify: true })
            .then(resolve)
            .catch(resolve);
        }, delay);
      })
    );
  } else if (event.data.type === 'CANCEL_NOTIFICATION') {
    if (scheduledTimeout) {
      clearTimeout(scheduledTimeout);
      scheduledTimeout = null;
    }
    event.waitUntil(
      self.registration.getNotifications({ tag: 'rest-timer' }).then((notifications) => {
        notifications.forEach((n) => n.close());
      })
    );
  }
});
