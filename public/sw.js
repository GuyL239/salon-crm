/**
 * Shkedia Service Worker
 *
 * ARCHITECTURE NOTE — Push Notifications:
 * ─────────────────────────────────────────────────────────────────────────────
 * The `reminders` array stored in the Supabase `visits` table is DATA ONLY.
 * It does NOT automatically trigger push notifications on the device.
 *
 * To send a real push notification the flow is:
 *   1. Browser calls Notification.requestPermission()   ← done in Settings UI
 *   2. Browser subscribes via PushManager.subscribe()   ← needs a VAPID public key
 *   3. The PushSubscription object is saved to Supabase  ← backend step
 *   4. A server (Edge Function / cron) reads `reminders`, compares to now,
 *      and calls the Web Push protocol with the VAPID private key
 *   5. The push message arrives here → service worker wakes up + shows notification
 *
 * This file implements Step 5 (the listener). Steps 2–4 require a backend
 * and are not yet implemented.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const CACHE_NAME = "shkedia-v1";

// Static assets to pre-cache on install
const PRECACHE_URLS = ["/", "/cities", "/calendar", "/settings", "/manifest.json"];

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  // Activate immediately — don't wait for old tabs to close
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  // Take control of all open tabs immediately
  self.clients.claim();
});

// ── Fetch (network-first, cache fallback) ─────────────────────────────────
self.addEventListener("fetch", (event) => {
  // Only handle same-origin GET requests
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  // Skip Supabase API calls — always need fresh data
  if (url.hostname.includes("supabase")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful HTML/JS/CSS responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ── Push (Step 5 — fires when backend sends a Web Push message) ────────────
self.addEventListener("push", (event) => {
  let payload = { title: "Shkedia", body: "יש לך תזכורת ביקור", icon: "/icons/icon-192.png" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch (_) {}

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body:    payload.body,
      icon:    payload.icon,
      badge:   "/icons/icon-192.png",
      dir:     "rtl",
      lang:    "he",
      vibrate: [200, 100, 200],
      data:    { url: "/" },
    })
  );
});

// ── Notification click ────────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => c.url.includes(self.location.origin));
      if (existing) return existing.focus();
      return clients.openWindow(event.notification.data?.url ?? "/");
    })
  );
});
