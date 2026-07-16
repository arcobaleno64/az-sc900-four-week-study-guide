const CACHE = "az-sc900-study-guide-v1";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
];
self.addEventListener("install", (e) =>
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting()),
  ),
);
self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => caches.open(CACHE))
      .then((cache) =>
        cache.keys().then((reqs) =>
          Promise.all(
            reqs
              .filter((r) => {
                const path = new URL(r.url).pathname;
                return !SHELL.some(
                  (s) => path.endsWith(s.replace("./", "/")) || path === "/",
                );
              })
              .map((r) => cache.delete(r)),
          ),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.origin !== self.location.origin) return;
  if (r.mode === "navigate") {
    e.respondWith(
      fetch(r)
        .then((x) => {
          const c = x.clone();
          caches.open(CACHE).then((cache) => cache.put("./index.html", c));
          return x;
        })
        .catch(
          async () =>
            (await caches.match("./index.html")) || (await caches.match("./")),
        ),
    );
    return;
  }
  e.respondWith(
    caches.match(r).then(
      (c) =>
        c ||
        fetch(r).then((x) => {
          if (x.ok && x.type === "basic") {
            const copy = x.clone();
            caches.open(CACHE).then((cache) => cache.put(r, copy));
          }
          return x;
        }),
    ),
  );
});
