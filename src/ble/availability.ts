import { MIN_IOS_VERSION, UART_SERVICE_UUID } from './constants';

export interface Availability {
  supported: boolean;
  reason?: string;
  /** True when Web Bluetooth works but the browser is too old (iOS < 16.4). */
  outdatedBrowser?: boolean;
}

/**
 * Detect whether Web Bluetooth is usable in the current browser.
 *
 * Web Bluetooth requires a secure context (HTTPS or localhost).
 */
export function checkBluetooth(): Availability {
  const nav = navigator as Navigator & { bluetooth?: unknown };

  if (!window.isSecureContext) {
    return {
      supported: false,
      reason:
        'Web Bluetooth needs a secure context. Serve the app over HTTPS (or localhost for local testing).',
    };
  }

  if (!nav.bluetooth) {
    // Distinguish "no support" from "too-old iOS Safari".
    const ios = iosVersion();
    if (ios !== null && ios < MIN_IOS_VERSION) {
      return {
        supported: false,
        reason: `This iOS/iPadOS version (${ios}) is too old for Web Bluetooth. Upgrade to ${MIN_IOS_VERSION} or later.`,
        outdatedBrowser: true,
      };
    }
    return {
      supported: false,
      reason:
        'This browser does not support Web Bluetooth. Use Chrome/Edge on desktop or Safari on iOS 16.4+.',
    };
  }

  return { supported: true };
}

/** Best-effort detection of the iOS/iPadOS version. */
function iosVersion(): number | null {
  const ua = navigator.userAgent;
  const match = /iPhone|iPad|iPod/.exec(ua);
  if (!match) return null;
  const v = /OS (\d+)_?(\d+)?/.exec(ua);
  if (!v) return null;
  const major = parseInt(v[1] ?? '0', 10);
  const minor = parseInt(v[2] ?? '0', 10);
  return major + minor / 10;
}

/**
 * Build the requestDevice filter for our UART service.
 * Browsers require an optionalServices entry to read/write custom characteristics.
 */
export function deviceRequestOptions(): BluetoothDeviceRequestOptions {
  return {
    filters: [{ services: [UART_SERVICE_UUID] }],
    optionalServices: [UART_SERVICE_UUID],
    acceptLegacy: false,
  };
}
