/**
 * Chihiros BLE constants.
 *
 * The LED advertises the standard Nordic UART Service (NTS). We write commands
 * to the RX characteristic and read status/telemetry from the TX
 * (notification) characteristic.
 */
export const UART_SERVICE_UUID = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E';
export const RX_CHARACTERISTIC_UUID = '6E400002-B5A3-F393-E0A9-E50E24DCCA9E';
export const TX_CHARACTERISTIC_UUID = '6E400003-B5A3-F393-E0A9-E50E24DCCA9E';

/** Minimum iOS/iPadOS version with working Web Bluetooth in Safari. */
export const MIN_IOS_VERSION = 16.4;
