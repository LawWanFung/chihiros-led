/// <reference types="vite/client" />

interface BluetoothDevice extends globalThis.BluetoothDevice {}

declare module '*.svelte' {}

declare module 'virtual:pwa-register/svelte' {
  import type { Writable } from 'svelte/store';
  export function useRegisterSW(options?: {
    onOfflineReady?: () => void;
    onNeedRefresh?: () => void;
  }): {
    needRefresh: Writable<boolean>;
    offlineReady: Writable<boolean>;
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
  };
}
