import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkBluetooth } from '../ble/availability';

describe('checkBluetooth', () => {
  const original = navigator;

  beforeEach(() => {
    // Restore a clean global so each test controls its own environment.
    vi.stubGlobal('navigator', original);
    vi.stubGlobal('window', { isSecureContext: true });
  });

  it('reports unsupported when navigator.bluetooth is missing', () => {
    const result = checkBluetooth();
    expect(result.supported).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  it('reports unsupported when not a secure context', () => {
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('window', { isSecureContext: false });
    const result = checkBluetooth();
    expect(result.supported).toBe(false);
    expect(result.reason).toMatch(/secure context/i);
  });
});
