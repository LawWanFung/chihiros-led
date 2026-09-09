/**
 * Chihiros BLE protocol helpers.
 *
 * This is a faithful TypeScript port of the transport-agnostic protocol logic
 * from the reference project https://github.com/TheMicDiet/chihiros-led-control
 * (MIT). It is deliberately independent of the transport (Web Bluetooth in this
 * app) so it can be unit-tested without a device.
 *
 * Frame layout (shared by the 0x5B "legacy" and 0xB6 "newer" generations):
 *
 *   [0] header     0x5B or 0xB6
 *   [1] firmware
 *   [2] length
 *   [3] message-id high
 *   [4] message-id low
 *   [5] mode
 *   [6..] payload
 *   [last] checksum
 */

/** The byte the app's encoder never uses as a *parameter* value. */
export const RESERVED_BYTE = 0x5a;

/**
 * Message-id bytes that must be avoided so they are not confused with the
 * notification header 0x5B. The app only skips 0x5A here (0x5B is a valid
 * sequence byte), so both 0x5A values are reserved.
 */
export const RESERVED_MESSAGE_ID_BYTES = new Set([RESERVED_BYTE]);

/** Size (in bytes) of one schedule point in a snapshot payload. */
export const SCHEDULE_POINT_SIZE = 3;

/** First index of schedule points within a snapshot payload. */
export const SCHEDULE_SNAPSHOT_POINTS_START = 25;

export type MessageId = readonly [number, number];

export type ColorChannels = Readonly<Record<string, number>>;

/** A parsed inbound notification. `raw` is excluded from value equality. */
export interface Notification {
  readonly raw: Uint8Array;
}

export class RuntimeNotification implements Notification {
  constructor(
    readonly firmwareVersion: number,
    readonly runtimeMinutes: number,
    readonly raw: Uint8Array,
  ) {}

  equals(other: Notification): boolean {
    return (
      other instanceof RuntimeNotification &&
      other.firmwareVersion === this.firmwareVersion &&
      other.runtimeMinutes === this.runtimeMinutes
    );
  }
}

export class FanStatusNotification implements Notification {
  constructor(
    readonly firmwareVersion: number,
    readonly fanRpm: number,
    readonly temperatureCelsius: number,
    readonly raw: Uint8Array,
  ) {}

  equals(other: Notification): boolean {
    return (
      other instanceof FanStatusNotification &&
      other.firmwareVersion === this.firmwareVersion &&
      other.fanRpm === this.fanRpm &&
      other.temperatureCelsius === this.temperatureCelsius
    );
  }
}

export class SchedulePoint {
  constructor(
    readonly hour: number,
    readonly minute: number,
    readonly levels: Readonly<Record<string, number>>,
  ) {}
}

export class ScheduleSnapshotNotification implements Notification {
  constructor(
    readonly firmwareVersion: number,
    readonly points: readonly SchedulePoint[],
    readonly raw: Uint8Array,
  ) {}

  equals(other: Notification): boolean {
    return (
      other instanceof ScheduleSnapshotNotification &&
      other.firmwareVersion === this.firmwareVersion &&
      other.points.length === this.points.length &&
      this.points.every((p, i) => p.hour === other.points[i]!.hour && p.minute === other.points[i]!.minute)
    );
  }
}

export class DosingTotalsNotification implements Notification {
  constructor(
    readonly totalDosedUl: readonly number[],
    readonly raw: Uint8Array,
  ) {}

  equals(other: Notification): boolean {
    return (
      other instanceof DosingTotalsNotification &&
      other.totalDosedUl.length === this.totalDosedUl.length &&
      this.totalDosedUl.every((v, i) => other.totalDosedUl[i] === v)
    );
  }
}

export class DosingDailyNotification implements Notification {
  constructor(
    readonly doseUseInDayUl: readonly number[],
    readonly raw: Uint8Array,
  ) {}

  equals(other: Notification): boolean {
    return (
      other instanceof DosingDailyNotification &&
      other.doseUseInDayUl.length === this.doseUseInDayUl.length &&
      this.doseUseInDayUl.every((v, i) => other.doseUseInDayUl[i] === v)
    );
  }
}

export class Vivid3FanStatusNotification implements Notification {
  constructor(
    readonly fanRpm: number,
    readonly temperatureCelsius: number,
    readonly raw: Uint8Array,
  ) {}

  equals(other: Notification): boolean {
    return (
      other instanceof Vivid3FanStatusNotification &&
      other.fanRpm === this.fanRpm &&
      other.temperatureCelsius === this.temperatureCelsius
    );
  }
}

export type ParsedNotification =
  | RuntimeNotification
  | FanStatusNotification
  | ScheduleSnapshotNotification
  | DosingTotalsNotification
  | DosingDailyNotification
  | Vivid3FanStatusNotification;

/**
 * Generate the next Bluetooth message id, skipping the reserved byte(s).
 * The app skips only 0x5A (the notification header), never 0x5B.
 */
export function nextMessageId(current: MessageId = [0, 0]): MessageId {
  let higher = current[0];
  let lower = current[1];
  for (;;) {
    if (higher === 255 && lower === 255) {
      higher = 0;
      lower = 1;
    } else if (lower === 255) {
      higher = (higher + 1) % 256;
      lower = 0;
    } else {
      lower += 1;
    }

    if (!RESERVED_MESSAGE_ID_BYTES.has(higher) && !RESERVED_MESSAGE_ID_BYTES.has(lower)) {
      return [higher, lower];
    }
  }
}

/**
 * Calculate the command checksum: start from byte[1] and XOR bytes[2..].
 * Commands must contain at least 7 bytes.
 */
export function calculateChecksum(input: Uint8Array): number {
  if (input.length < 7) {
    throw new Error('Commands must contain at least 7 bytes');
  }
  let checksum = input[1]!;
  for (let i = 2; i < input.length; i++) {
    checksum ^= input[i]!;
  }
  return checksum;
}

/**
 * Return a message id safe for the selected protocol variant. When
 * `avoidReservedByte` is set, ids touching 0x5A are bumped to the next id.
 */
export function normalizeMessageId(
  msgId: MessageId,
  avoidReservedByte = true,
): MessageId {
  if (!avoidReservedByte) {
    return msgId;
  }
  if (RESERVED_MESSAGE_ID_BYTES.has(msgId[0]) || RESERVED_MESSAGE_ID_BYTES.has(msgId[1])) {
    return nextMessageId(msgId);
  }
  return msgId;
}

/**
 * Encode a Chihiros BLE command.
 *
 * Layout: `[cmd_id, 1, length, msg_hi, msg_lo, cmd_mode, ...params, checksum]`.
 * When `avoidReservedByte` is set, parameter bytes equal to 0x5A are rewritten
 * to 0x59 (the app escapes them), and command encoding retries with a fresh
 * message id if the checksum would itself be 0x5A.
 */
export function createCommandEncoding(
  cmdId: number,
  cmdMode: number,
  msgId: MessageId,
  parameters: readonly number[],
  avoidReservedByte = true,
): Uint8Array {
  const safeMsgId = normalizeMessageId(msgId, avoidReservedByte);
  const sanitizedParams = parameters.map((value) =>
    !avoidReservedByte || value !== RESERVED_BYTE ? value : RESERVED_BYTE - 1,
  );

  const command = new Uint8Array(6 + sanitizedParams.length);
  command[0] = cmdId;
  command[1] = 1;
  command[2] = sanitizedParams.length + 5;
  command[3] = safeMsgId[0];
  command[4] = safeMsgId[1];
  command[5] = cmdMode;
  sanitizedParams.forEach((value, i) => {
    command[6 + i] = value;
  });

  const verificationByte = calculateChecksum(command);
  if (avoidReservedByte && verificationByte === RESERVED_BYTE) {
    return createCommandEncoding(
      cmdId,
      cmdMode,
      nextMessageId(safeMsgId),
      sanitizedParams,
      avoidReservedByte,
    );
  }

  const out = new Uint8Array(command.length + 1);
  out.set(command);
  out[command.length] = verificationByte;
  return out;
}

/**
 * Encode a timestamp as Chihiros command parameters:
 * [year-2000, month, isoweekday, hour, minute, second].
 */
export function encodeTimestamp(ts: Date): number[] {
  return [
    ts.getFullYear() - 2000,
    ts.getMonth() + 1,
    ts.getDay() === 0 ? 7 : ts.getDay(), // getDay(): 0 (Sun) .. 6 (Sat) -> ISO 1..7
    ts.getHours(),
    ts.getMinutes(),
    ts.getSeconds(),
  ];
}

/** Return notification channels sorted by protocol channel id. */
function notificationChannels(
  colorChannels: ColorChannels,
): readonly [string, number][] {
  return Object.entries(colorChannels).sort((a, b) => a[1] - b[1]);
}

/** Per-channel 16-bit big-endian counters from a dosing notification. */
function parseDosingChannelValues(data: Uint8Array): readonly number[] {
  const channelCount = (data.length - 6) >> 1;
  const out: number[] = [];
  for (let i = 0; i < channelCount; i++) {
    const hi = data[6 + 2 * i]!;
    const lo = data[7 + 2 * i]!;
    out.push(((hi << 8) | lo) * 100);
  }
  return out;
}

function isValidSchedulePoint(
  hour: number,
  minute: number,
  level: number,
  levels: Readonly<Record<string, number>>,
): boolean {
  if (hour > 23 || minute > 59 || level > 100) {
    return false;
  }
  // Drop the all-channel-off midnight placeholder the devices report.
  if (hour === 0 && minute === 0) {
    return Object.values(levels).some((v) => v !== 0);
  }
  return true;
}

function parseSchedulePoints(
  data: Uint8Array,
  channels: readonly [string, number][],
): readonly SchedulePoint[] {
  const points: SchedulePoint[] = [];
  for (let index = SCHEDULE_SNAPSHOT_POINTS_START; index + SCHEDULE_POINT_SIZE <= data.length; index += SCHEDULE_POINT_SIZE) {
    const hour = data[index]!;
    const minute = data[index + 1]!;
    const level = data[index + 2]!;
    const levels: Record<string, number> = {};
    channels.forEach(([color]) => {
      levels[color] = level;
    });
    if (isValidSchedulePoint(hour, minute, level, levels)) {
      points.push(new SchedulePoint(hour, minute, levels));
    }
  }
  return points;
}

function parseLegacyNotification(
  data: Uint8Array,
  mode: number,
  colorChannels: ColorChannels | undefined,
): ParsedNotification | undefined {
  const firmwareVersion = data[1]!;
  if (mode === 0x0a) {
    return parseRuntimeNotification(data, firmwareVersion);
  }
  if (mode === 0x0b) {
    return parseFanStatusNotification(data, firmwareVersion);
  }
  if (mode === 0xfe) {
    const channels = notificationChannels(colorChannels!);
    const points = parseSchedulePoints(data, channels);
    return new ScheduleSnapshotNotification(firmwareVersion, points, data);
  }
  return undefined;
}

function parseRuntimeNotification(
  data: Uint8Array,
  firmwareVersion: number,
): RuntimeNotification {
  const runtimeMinutes = (data[6]! << 8) | data[7]!;
  return new RuntimeNotification(firmwareVersion, runtimeMinutes, data);
}

function parseFanStatusNotification(
  data: Uint8Array,
  firmwareVersion: number,
): FanStatusNotification {
  const fanRpm = (data[6]! << 8) | data[7]!;
  const temperatureCelsius = data[8]!;
  return new FanStatusNotification(firmwareVersion, fanRpm, temperatureCelsius, data);
}

function parseNewerNotification(
  data: Uint8Array,
  mode: number,
): ParsedNotification | undefined {
  if (mode === 0x3c && data.length >= 8) {
    return new DosingTotalsNotification(parseDosingChannelValues(data), data);
  }
  if (mode === 0x44 && data.length >= 8) {
    return new DosingDailyNotification(parseDosingChannelValues(data), data);
  }
  if (mode === 0x16 && data.length >= 9) {
    const fanRpm = (data[6]! << 8) | data[7]!;
    const temperatureCelsius = data[8]!;
    return new Vivid3FanStatusNotification(fanRpm, temperatureCelsius, data);
  }
  return undefined;
}

/**
 * Parse a known Chihiros notification payload.
 *
 * Some devices do not provide a reliable declared length or trailing
 * checksum, so the header/mode fields are parsed defensively.
 */
export function parseNotification(
  data: Uint8Array,
  colorChannels: ColorChannels | undefined = undefined,
): ParsedNotification | undefined {
  if (data.length < 7) {
    return undefined;
  }
  const mode = data[5]!;
  if (data[0] === 0x5b) {
    return parseLegacyNotification(data, mode, colorChannels);
  }
  if (data[0] === 0xb6) {
    return parseNewerNotification(data, mode);
  }
  return undefined;
}
