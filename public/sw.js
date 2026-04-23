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
    if (scheduledTimeout) {
      clearTimeout(scheduledTimeout);
      scheduledTimeout = null;
    }

    const { endsAt, title, body } = event.data;

    // TimestampTrigger delegates scheduling to the OS — fires even when the browser
    // process is suspended (the root cause of missed notifications on mobile).
    if ('TimestampTrigger' in self) {
      event.waitUntil(
        self.registration.getNotifications({ tag: 'rest-timer' })
          .then((existing) => existing.forEach((n) => n.close()))
          .then(() =>
            self.registration.showNotification(title, {
              body,
              tag: 'rest-timer',
              renotify: true,
              showTrigger: new TimestampTrigger(endsAt),
            })
          )
      );
    } else {
      // Fallback for browsers without TimestampTrigger (e.g. Firefox, Safari).
      // Works for short delays but may miss if the OS suspends the browser process.
      const delay = Math.max(0, endsAt - Date.now());
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
    }
  } else if (event.data.type === 'SHOW_NOW_NOTIFICATION') {
    event.waitUntil(
      self.registration.showNotification(event.data.title, {
        body: event.data.body,
        tag: 'rest-timer-info',
      })
    );
  } else if (event.data.type === 'CANCEL_NOTIFICATION') {
    if (scheduledTimeout) {
      clearTimeout(scheduledTimeout);
      scheduledTimeout = null;
    }
    event.waitUntil(
      Promise.all([
        self.registration.getNotifications({ tag: 'rest-timer' }),
        self.registration.getNotifications({ tag: 'rest-timer-info' }),
      ]).then(([a, b]) => [...a, ...b].forEach((n) => n.close()))
    );
  }
});
