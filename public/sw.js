// Service Worker de NUKNU Pulso — recibe y muestra las notificaciones push.
self.addEventListener("push", function (e) {
  let data = {};
  try { data = e.data.json(); } catch (err) { data = { title: "NUKNU Pulso", body: e.data ? e.data.text() : "" }; }
  const title = data.title || "NUKNU Pulso";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/" },
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (cl) {
      for (const c of cl) { if ("focus" in c) { try { c.navigate(url); } catch (x) {} return c.focus(); } }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
