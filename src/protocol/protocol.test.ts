import { describe, it, expect } from 'vitest';
import {
  parseNotification,
  encodeTimestamp,
  createBaseAuthCommand,
  calculateChecksum,
  RuntimeNotification,
} from './index';

/**
 * Byte-level test vectors verified against the reference project
 * (TheMicDiet/chihiros-led-control/src/chihiros_led_control/protocol.py).
 */

describe('parseNotification', () => {
  it('parses the runtime notification (legacy 0x5B frame)', () => {
    // header=0x5b, len=7, msg=0x0001, mode=0x0a, runtime=(data[6]<<8)|data[7]
    const frame = new Uint8Array([
      0x5b, 0x07, 0x00, 0x01, 0x00, 0x0a, 0x00, 0x05,
    ]);
    const parsed = parseNotification(frame);
    expect(parsed).toBeInstanceOf(RuntimeNotification);
    if (parsed instanceof RuntimeNotification) {
      expect(parsed.firmwareVersion).toBe(7);
      expect(parsed.runtimeMinutes).toBe(5);
    }
  });

  it('returns undefined for a non-0x5B / non-0xB6 header', () => {
    const frame = new Uint8Array([0x5c, 0x0c, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00]);
    expect(parseNotification(frame)).toBeUndefined();
  });

  it('returns undefined for a malformed frame (too short)', () => {
    const frame = new Uint8Array([0x5b, 0x01, 0x00]);
    expect(parseNotification(frame)).toBeUndefined();
  });
});

describe('encodeTimestamp', () => {
  it('encodes year-2000, month, ISO weekday, hour, minute, second', () => {
    // 2024-05-15 14:30:00 -> year=24, month=5, ISO weekday=3 (Wednesday)
    const ts = new Date(2024, 4, 15, 14, 30, 0);
    const encoded = encodeTimestamp(ts);
    expect(encoded).toEqual([24, 5, 3, 14, 30, 0]);
  });
});

describe('calculateChecksum', () => {
  it('returns a single checksum byte in range', () => {
    const checksum = calculateChecksum(new Uint8Array([0x5a, 0x01, 0x06, 0x00, 0x00, 0x04, 0x01]));
    expect(checksum).toBeGreaterThanOrEqual(0);
    expect(checksum).toBeLessThanOrEqual(255);
  });
});

describe('createBaseAuthCommand', () => {
  it('matches the reference vector byte-for-byte', () => {
    // Reference: create_command_encoding(90, 4, (0, 0), [1])
    const frame = createBaseAuthCommand([0, 0]);
    expect(Array.from(frame)).toEqual([90, 1, 6, 0, 0, 4, 1, 2]);
  });

  it('ends with a checksum byte over the body', () => {
    const frame = createBaseAuthCommand([0, 0]);
    expect(frame.length).toBe(8);
    expect(calculateChecksum(frame.slice(0, -1))).toBe(frame[frame.length - 1]);
  });
});
