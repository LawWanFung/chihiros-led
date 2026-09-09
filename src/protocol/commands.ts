/**
 * High-level Chihiros command builders.
 *
 * Faithful TypeScript port of the reference project's `commands.py`. Each
 * builder returns the exact byte frame the LED expects.
 */

import { createCommandEncoding, encodeTimestamp, MessageId } from './protocol';

/** Number of parameters in an add-auto-setting command. */
export const AUTO_SETTING_PARAMETER_COUNT = 14;
/** Metadata parameters (time/ramp/weekdays) within an auto-setting command. */
export const AUTO_SETTING_METADATA_PARAMETER_COUNT = 6;
/** Dosing pump volume bucket size in 0.1 mL units. */
export const DOSE_VOLUME_BUCKET_TENTHS_ML = 256;
/** Maximum minutes in a single auto-curve point (0..2880 for cross-day curves). */
export const AUTO_POINT_MAX_MINUTES = 2880;

export interface TimeOfDay {
  readonly hour: number;
  readonly minute: number;
}

/** Base LED auth/status command used at connection startup (getDeviceInfo). */
export function createBaseAuthCommand(msgId: MessageId): Uint8Array {
  return createCommandEncoding(90, 4, msgId, [1]);
}

/** Encode a dosing pump volume as 25.6 mL buckets plus 0.1 mL remainder. */
/**
 * Python-compatible round half to even (banker's rounding).
 * Python's `round()` rounds .5 to the nearest even integer, while
 * JS `Math.round` rounds .5 up. The reference firmware protocol
 * depends on the Python behavior.
 */
function roundHalfEven(value: number): number {
  const rounded = Math.round(value);
  const isHalfway =
    Math.abs(value - Math.floor(value)) === 0.5 && value >= 0;
  if (isHalfway && rounded % 2 !== 0) {
    return rounded - 1;
  }
  return rounded;
}

export function splitDoseVolumeMl(ml: number): readonly [number, number] {
  if (ml < 0.2 || ml > 999.9) {
    throw new Error('Dose volume must be between 0.2 and 999.9 mL');
  }
  const tenthsMl = roundHalfEven(ml * 10);
  return [
    Math.floor(tenthsMl / DOSE_VOLUME_BUCKET_TENTHS_ML),
    tenthsMl % DOSE_VOLUME_BUCKET_TENTHS_ML,
  ];
}

export function createDoseAuth1Command(msgId: MessageId): Uint8Array {
  return createCommandEncoding(165, 4, msgId, [4]);
}

export function createDoseAuth2Command(msgId: MessageId): Uint8Array {
  return createCommandEncoding(165, 4, msgId, [5]);
}

/**
 * Manual dosing command for one pump (0..7). Volumes encode as
 * `high * 25.6 mL + low * 0.1 mL`. Reserved-byte avoidance is disabled so the
 * payload bytes are sent verbatim.
 */
export function createManualDoseCommand(
  msgId: MessageId,
  pumpIdx: number,
  volumeMl: number,
): Uint8Array {
  if (pumpIdx < 0 || pumpIdx > 7) {
    throw new Error('Pump index must be between 0 and 7');
  }
  const [high, low] = splitDoseVolumeMl(volumeMl);
  return createCommandEncoding(
    165,
    27,
    msgId,
    [pumpIdx, 0, 0, high, low],
    false,
  );
}

export function createSetTimeCommand(
  msgId: MessageId,
  timestamp: Date | undefined = undefined,
): Uint8Array {
  return createCommandEncoding(90, 9, msgId, encodeTimestamp(timestamp ?? new Date()));
}

export function createSetBrightnessCommand(
  msgId: MessageId,
  color: number,
  brightnessLevel: number,
): Uint8Array {
  return createCommandEncoding(90, 7, msgId, [color, brightnessLevel]);
}

/** Ask legacy LED devices for runtime/status notifications. */
export function createQueryStatusCommand(msgId: MessageId): Uint8Array {
  return createBaseAuthCommand(msgId);
}

/** Add an auto schedule setting (sunrise/sunset, ramp, weekdays, channels). */
export function createAddAutoSettingCommand(
  msgId: MessageId,
  sunrise: TimeOfDay,
  sunset: TimeOfDay,
  brightness: readonly number[],
  rampUpMinutes: number,
  weekdays: number,
): Uint8Array {
  if (brightness.length > AUTO_SETTING_PARAMETER_COUNT - AUTO_SETTING_METADATA_PARAMETER_COUNT) {
    throw new Error('Auto setting brightness has too many channel values');
  }
  const parameters: number[] = [
    sunrise.hour,
    sunrise.minute,
    sunset.hour,
    sunset.minute,
    rampUpMinutes,
    weekdays,
    ...brightness,
  ];
  while (parameters.length < AUTO_SETTING_PARAMETER_COUNT) {
    parameters.push(255);
  }
  return createCommandEncoding(165, 25, msgId, parameters);
}

/** Delete an auto setting (add with all-off brightness). */
export function createDeleteAutoSettingCommand(
  msgId: MessageId,
  sunrise: TimeOfDay,
  sunset: TimeOfDay,
  rampUpMinutes: number,
  weekdays: number,
  brightnessChannels = 3,
): Uint8Array {
  return createAddAutoSettingCommand(
    msgId,
    sunrise,
    sunset,
    new Array(brightnessChannels).fill(255),
    rampUpMinutes,
    weekdays,
  );
}

/** Reset all auto settings. */
export function createResetAutoSettingsCommand(msgId: MessageId): Uint8Array {
  return createCommandEncoding(90, 5, msgId, [5, 255, 255]);
}

function validateAutoPointParameters(channel: number, minutes: number, level: number): void {
  if (channel < 0 || channel > 7) {
    throw new Error('Channel must be between 0 and 7');
  }
  if (minutes < 0 || minutes > AUTO_POINT_MAX_MINUTES) {
    throw new Error(`Minutes must be between 0 and ${AUTO_POINT_MAX_MINUTES}`);
  }
  if (level < 0 || level > 100) {
    throw new Error('Level must be between 0 and 100');
  }
}

/**
 * Encode the auto-curve point payload for a model family.
 * SeaLed: [channel, hour, minute, level]; BleLed/NewBleLed:
 * [channel, 30-min-slot, level] with the app's rounding rule.
 */
function autoPointParameters(
  channel: number,
  minutes: number,
  level: number,
  seaLedFamily: boolean,
): number[] {
  if (seaLedFamily) {
    const [hour, minute] = [Math.floor(minutes / 60), minutes % 60];
    return [channel, hour, minute, level];
  }
  let timeIndex = Math.floor(minutes / 30);
  if (minutes % 30 > 14) {
    timeIndex += 1;
  }
  return [channel, timeIndex, level];
}

/**
 * Create one auto-curve point (0x5A, 6) for a Commander/LED device. Payload
 * bytes are sent verbatim (reserved-byte avoidance disabled).
 */
export function createAutoPointCommand(
  msgId: MessageId,
  channel: number,
  minutes: number,
  level: number,
  seaLedFamily: boolean,
): Uint8Array {
  validateAutoPointParameters(channel, minutes, level);
  const parameters = autoPointParameters(channel, minutes, level, seaLedFamily);
  return createCommandEncoding(90, 6, msgId, parameters, false);
}

/** Switch to auto mode (schedule-driven scene frame). */
export function createSwitchToAutoModeCommand(msgId: MessageId): Uint8Array {
  return createCommandEncoding(90, 5, msgId, [18, 255, 255]);
}

/** Switch to manual mode. */
export function createSwitchToManualModeCommand(msgId: MessageId): Uint8Array {
  return createCommandEncoding(90, 5, msgId, [11, 255, 255]);
}

/** Fan speed command for fan-equipped LED devices. */
export function createSetFanSpeedCommand(msgId: MessageId, speedPercent: number): Uint8Array {
  if (speedPercent < 0 || speedPercent > 100) {
    throw new Error('Fan speed must be between 0 and 100 percent');
  }
  return createCommandEncoding(90, 15, msgId, [speedPercent]);
}

/** Fan auto mode command (starts/stops the fan from temperature thresholds). */
export function createFanAutoModeCommand(msgId: MessageId): Uint8Array {
  return createCommandEncoding(90, 5, msgId, [0x11, 0xff, 0xff]);
}

/** VIVID3 fan start/stop temperature command (0..255). */
export function createVivid3FanStartStopTempCommand(
  msgId: MessageId,
  startTemp: number,
  stopTemp: number,
): Uint8Array {
  if (startTemp < 0 || startTemp > 255 || stopTemp < 0 || stopTemp > 255) {
    throw new Error('Fan temperatures must be between 0 and 255');
  }
  return createCommandEncoding(165, 45, msgId, [startTemp, stopTemp], false);
}

/** VIVID3 temperature-protection switch (0x31 on, 0x30 off). */
export function createVivid3TempProtectCommand(msgId: MessageId, enabled: boolean): Uint8Array {
  return createCommandEncoding(90, 5, msgId, [enabled ? 0x31 : 0x30, 0xff, 0xff]);
}

/** VIVID3 indicator-LED switch (0x32/0x31 on/off). */
export function createVivid3BluetoothLedCommand(msgId: MessageId, enabled: boolean): Uint8Array {
  return createCommandEncoding(90, 5, msgId, [enabled ? 0x32 : 0x31, 0xff, 0xff]);
}
