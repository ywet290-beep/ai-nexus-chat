const CACHE_NAME = "nexus-ai-model-v1";
const MODEL_CACHE = "nexus-ai-models";

// Pre-cache essentials
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                "/ai-nexus-chat/",
                "/ai-nexus-chat/index.html",
                "/ai-nexus-chat/app.js",
                "/ai-nexus-chat/styles.css"
            ]).catch(() => {
                // Ignore errors for optional files
            });
        })
    );
    self.skipWaiting();
});

// Cache model files on download
self.addEventListener("fetch", (event) => {
    const url = event.request.url;
    
    // Cache model files (from CDN or local)
    if (url.includes(".wasm") || url.includes("tokenizer") || url.includes("model")) {
        event.respondWith(
            caches.open(MODEL_CACHE).then((cache) => {
                return cache.match(event.request).then((response) => {
                    if (response) return response;
                    
                    return fetch(event.request).then((response) => {
                        if (response.ok) {
                            cache.put(event.request, response.clone());
                        }
                        return response;
                    });
                });
            })
        );
        return;
    }
    
    // Network first for HTML/JS
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response.ok) {
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, response.clone());
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request);
            })
    );
});

// Clean up old caches
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((name) => {
                    if (name !== CACHE_NAME && name !== MODEL_CACHE) {
                        return caches.delete(name);
                    }
                })
            );
        })
    );
});
