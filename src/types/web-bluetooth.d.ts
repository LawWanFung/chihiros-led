// Minimal Web Bluetooth API declarations.
// Not present in this TypeScript lib.dom build, so we declare what the app uses.
declare global {
  type UUID = string | ArrayBuffer;

  interface Bluetooth {
    requestDevice(options: BluetoothDeviceRequestOptions): Promise<BluetoothDevice>;
  }

  interface BluetoothDevice {
    readonly gatt: BluetoothGATTConnection;
    addEventListener(type: string, listener: EventListener): void;
    removeEventListener(type: string, listener: EventListener): void;
  }

  interface BluetoothGATTConnection {
    readonly connected: boolean;
    connect(): Promise<void>;
    disconnect(): void;
    getPrimaryService(service: UUID): Promise<BluetoothRemoteGATTService>;
    addEventListener(type: string, listener: EventListener): void;
    removeEventListener(type: string, listener: EventListener): void;
  }

  interface BluetoothRemoteGATTService {
    getCharacteristic(characteristic: UUID): Promise<BluetoothRemoteGATTCharacteristic>;
  }

  interface BluetoothRemoteGATTCharacteristic {
    readonly value: DataView | null;
    writeValue(data: ArrayBuffer | Uint8Array): Promise<void>;
    subscribeToNotifications(enabled: boolean): Promise<void>;
    unsubscribeFromNotifications(enabled: boolean): Promise<void>;
    oncharacteristicvaluechanged: ((this: EventTarget, ev: Event) => any) | null;
    addEventListener(type: string, listener: EventListener): void;
    removeEventListener(type: string, listener: EventListener): void;
  }

  interface BluetoothDeviceRequestOptions {
    filters?: Array<{ services?: UUID[] }>;
    optionalServices?: UUID[];
    services?: UUID[];
    acceptLegacy?: boolean;
  }

  interface Navigator {
    bluetooth?: Bluetooth;
  }
}

export {};
