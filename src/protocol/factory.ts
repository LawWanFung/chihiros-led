/**
 * Device detection and model resolution.
 *
 * Faithful port of the reference project's `factory.py` (minus the BLE scanner,
 * which is transport-specific and lives in the app's transport layer).
 */

import {
  DOSING_PUMP,
  FALLBACK,
  GENERIC_MODELS_BY_DEVICE_TYPE,
  iterModelCodesBySpecificity,
  DeviceModel,
} from './models';

// Non-LED device families to check before prefix-based detection.
const KNOWN_UNSUPPORTED_DEVICE_PREFIXES = ['DYAPRCO2', 'DYCHIL', 'DYCO2'];

export function isKnownUnsupportedDevice(deviceName: string | undefined): boolean {
  if (!deviceName) return false;
  return KNOWN_UNSUPPORTED_DEVICE_PREFIXES.some((prefix) => deviceName.startsWith(prefix));
}

/** Detect a model from a BLE advertised name. Falls back to the generic model. */
export function detectModel(deviceName: string | undefined): DeviceModel {
  if (isKnownUnsupportedDevice(deviceName)) {
    return FALLBACK;
  }
  const name = deviceName ?? '';
  for (const [code, model] of iterModelCodesBySpecificity()) {
    if (name.startsWith(code)) {
      return model;
    }
  }
  return FALLBACK;
}

/** Whether a device needs a user-selected generic type. */
export function needsDeviceType(deviceName: string | undefined): boolean {
  return detectModel(deviceName).needsDeviceType ?? false;
}

/** Return the generic model for a stored device type (defaults to white). */
export function modelForDeviceType(deviceType: string | undefined): DeviceModel {
  return deviceType ? GENERIC_MODELS_BY_DEVICE_TYPE[deviceType] ?? FALLBACK : FALLBACK;
}

/** Resolve final model metadata for a device. */
export function resolveModel(
  deviceName: string | undefined,
  model: DeviceModel | undefined = undefined,
  deviceType: string | undefined = undefined,
): DeviceModel {
  const detected = model ?? detectModel(deviceName);
  if (detected.needsDeviceType && deviceType) {
    return modelForDeviceType(deviceType);
  }
  return detected;
}
