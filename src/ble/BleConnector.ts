import {
  UART_SERVICE_UUID,
  RX_CHARACTERISTIC_UUID,
  TX_CHARACTERISTIC_UUID,
} from './constants';
import { deviceRequestOptions } from './availability';

/** Event payload delivered to subscribers when the device sends data. */
export type NotificationHandler = (bytes: Uint8Array) => void;

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

export interface ConnectOptions {
  /** Override the device-selection label shown to the user. */
  acceptAnyDevice?: boolean;
}

/**
 * Thin, typed wrapper around the Web Bluetooth API.
 *
 * Responsibilities:
 *  - discover + connect to the Chihiros UART service
 *  - write command bytes to the RX characteristic
 *  - forward TX notifications to subscribers
 *
 * It is intentionally transport-only: it knows nothing about the Chihiros
 * protocol framing (see ../protocol).
 */
export class BleConnector {
  private device: BluetoothDevice | null = null;
  private rx: BluetoothRemoteGATTCharacteristic | null = null;
  private tx: BluetoothRemoteGATTCharacteristic | null = null;

  private _state: ConnectionState = 'disconnected';
  private _error: string | null = null;
  private _handlers = new Set<NotificationHandler>();

  get state(): ConnectionState {
    return this._state;
  }

  get error(): string | null {
    return this._error;
  }

  get isConnected(): boolean {
    return this._state === 'connected';
  }

  /** Subscribe to TX notifications. Returns an unsubscribe function. */
  onNotification(handler: NotificationHandler): () => void {
    this._handlers.add(handler);
    return () => this._handlers.delete(handler);
  }

  private emit(bytes: Uint8Array): void {
    for (const h of [...this._handlers]) {
      try {
        h(bytes);
      } catch {
        // A misbehaving handler must not break the BLE event loop.
        console.error('notification handler threw', h, bytes);
      }
    }
  }

  private setState(state: ConnectionState, error: string | null = null): void {
    this._state = state;
    this._error = state === 'error' ? error : null;
  }

  /** Discover the UART service characteristics on the given device. */
  private async attach(device: BluetoothDevice): Promise<void> {
    const gatt = device.gatt;
    if (!gatt?.connected) {
      gatt?.connect();
    }
    // Give GATT a moment to connect before querying services.
    await gatt?.connected
      ? undefined
      : new Promise<void>((resolve) => {
          const tryConnect = setInterval(() => {
            if (gatt?.connected) {
              clearInterval(tryConnect);
              resolve();
            }
          }, 50);
          // Safety timeout so we never hang forever.
          setTimeout(() => {
            clearInterval(tryConnect);
            resolve();
          }, 3000);
        });

    const service = await gatt?.getPrimaryService(UART_SERVICE_UUID);
    if (!service) throw new Error('UART service not found');

    const rx = await service.getCharacteristic(RX_CHARACTERISTIC_UUID);
    const tx = await service.getCharacteristic(TX_CHARACTERISTIC_UUID);
    if (!rx || !tx) throw new Error('RX/TX characteristics not found');

    this.rx = rx;
    this.tx = tx;
  }

  /** Prompt the user to pick a device and connect to its UART service. */
  async connect(opts: ConnectOptions = {}): Promise<void> {
    this.setState('connecting');

    const nav = navigator as Navigator & {
      bluetooth?: Bluetooth;
    };
    if (!nav.bluetooth) throw new Error('Web Bluetooth is not available');

    const options = deviceRequestOptions();
    if (opts.acceptAnyDevice) {
      // Some devices do not broadcast the service name; allow any device and
      // fall back to scanning for the service after connecting.
      delete options.filters;
      (options as BluetoothDeviceRequestOptions).services = [
        UART_SERVICE_UUID,
      ];
    }

    const device = await nav.bluetooth.requestDevice(options);
    this.device = device;

    device.gatt?.addEventListener('disconnect', () => {
      this.setState('disconnected');
    });

    await this.attach(device);

    // Start receiving notifications.
    await this.tx?.subscribeToNotifications(true);
    this.tx!.oncharacteristicvaluechanged = (event) => {
      const value = event.target as unknown as BluetoothRemoteGATTCharacteristic;
      if (!value?.value) return;
      this.emit(new Uint8Array(value.value.buffer.slice(value.value.byteOffset, value.value.byteLength)));
    };

    this.setState('connected');
  }

  /** Write command bytes to the LED. */
  async write(bytes: Uint8Array): Promise<void> {
    if (!this.rx) throw new Error('Not connected');
    await this.rx.writeValue(bytes);
  }

  /** Disconnect and tear down listeners. */
  async disconnect(): Promise<void> {
    try {
      await this.tx?.unsubscribeFromNotifications?.(false);
    } catch {
      /* ignore */
    }
    this._handlers.clear();
    this.device?.gatt?.disconnect();
    this.device = null;
    this.rx = null;
    this.tx = null;
    this.setState('disconnected');
  }
}
