let deferredPrompt: any = null;

export function initPWA() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // Dispatch custom event to notify components
    window.dispatchEvent(new CustomEvent("pwaInstallAvailable"));
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    window.dispatchEvent(new CustomEvent("pwaInstalled"));
  });
}

export async function promptInstall() {
  if (!deferredPrompt) {
    return false;
  }

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return outcome === "accepted";
}

export function isPWAInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone ||
    document.referrer.includes("android-app://")
  );
}

export function canInstallPWA() {
  return deferredPrompt !== null;
}
