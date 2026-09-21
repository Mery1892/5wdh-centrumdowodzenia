"use client";

import { useEffect } from "react";

const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const HASH_KEY = "5wdh-app-shell-hash";

async function hashText(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export default function PwaRegister() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    let intervalId = null;
    let checking = false;

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register(
          "/sw.js",
          { scope: "/" }
        );

        await registration.update();

        return registration;
      } catch (error) {
        console.error(
          "Nie udało się uruchomić PWA:",
          error
        );

        return null;
      }
    };

    const checkForNewVersion = async () => {
      if (checking) return;
      checking = true;

      try {
        const response = await fetch(
          `/?app-version-check=${Date.now()}`,
          {
            method: "GET",
            cache: "no-store",
            headers: {
              "Cache-Control": "no-cache",
            },
          }
        );

        if (!response.ok) return;

        const html = await response.text();
        const currentHash = await hashText(html);
        const savedHash = localStorage.getItem(HASH_KEY);

        if (!savedHash) {
          localStorage.setItem(HASH_KEY, currentHash);
          return;
        }

        if (savedHash !== currentHash) {
          localStorage.setItem(HASH_KEY, currentHash);

          const registration =
            await navigator.serviceWorker.getRegistration();

          if (registration) {
            await registration.update();
          }

          window.location.reload();
        }
      } catch (error) {
        console.error(
          "Nie udało się sprawdzić nowej wersji aplikacji:",
          error
        );
      } finally {
        checking = false;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkForNewVersion();
      }
    };

    const handleFocus = () => {
      checkForNewVersion();
    };

    const handleControllerChange = () => {
      window.location.reload();
    };

    const start = async () => {
      await registerServiceWorker();
      await checkForNewVersion();

      intervalId = window.setInterval(
        checkForNewVersion,
        CHECK_INTERVAL_MS
      );

      document.addEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      window.addEventListener("focus", handleFocus);

      navigator.serviceWorker.addEventListener(
        "controllerchange",
        handleControllerChange
      );
    };

    if (document.readyState === "complete") {
      start();
    } else {
      window.addEventListener("load", start, { once: true });
    }

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      window.removeEventListener("focus", handleFocus);

      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange
      );

      window.removeEventListener("load", start);
    };
  }, []);

  return null;
}

}
