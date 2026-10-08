"use client";

import * as React from "react";
import { useSyncStore } from "@/lib/store/sync-store";

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const initSyncEngine = useSyncStore((s) => s.initSyncEngine);

  React.useEffect(() => {
    // 1. Initialize offline & online sync listener engine
    const cleanupSync = initSyncEngine();

    // 2. Register Service Worker in production or supporting browsers
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            // Check for updates
            reg.addEventListener("updatefound", () => {
              const installingWorker = reg.installing;
              if (installingWorker) {
                installingWorker.addEventListener("statechange", () => {
                  if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
                    console.log("New content is available; please refresh.");
                  }
                });
              }
            });
          })
          .catch((err) => {
            console.warn("ServiceWorker registration skipped or failed:", err);
          });
      });
    }

    return () => {
      cleanupSync();
    };
  }, [initSyncEngine]);

  return <>{children}</>;
}
