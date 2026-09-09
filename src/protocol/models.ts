/**
 * Device model registry for Chihiros LEDs.
 *
 * Faithful port of the reference project's `models.py`. A `DeviceModel` carries
 * static metadata (channel map, generation family, fan support) used to
 * encode/decode frames for a given model.
 */

/** Readonly channel map: channel name -> protocol channel id. */
import { ColorChannels } from './protocol';

export interface DeviceModel {
  readonly name: string;
  /** BLE advertised-name prefixes that identify this model. */
  readonly advertisedCodes: readonly string[];
  readonly colorChannels: ColorChannels;
  /** Whether the BLE device must be paired with an explicit `deviceType`. */
  readonly needsDeviceType?: boolean;
  /** Marks a model used only as a last-resort fallback. */
  readonly fallback?: boolean;
  /** Whether the model has a cooling fan. */
  readonly hasFan?: boolean;
  /** Minimum fan speed (0.1 m/s). */
  readonly minFanSpeed?: number;
  /** Whether this is a Vivid3 family model. */
  readonly isVivid3?: boolean;
  /** SeaLed family encodes auto-curve points as [channel, hour, minute, level]. */
  readonly seaLedFamily: boolean;
}

const WHITE_CHANNELS: ColorChannels = { white: 0 };
const RGB_CHANNELS: ColorChannels = { red: 0, green: 1, blue: 2 };
const WRGB_CHANNELS: ColorChannels = { white: 3, red: 0, green: 1, blue: 2 };
// Commander family: red/green/blue/white on 0..3.
const COMMANDER_CHANNELS: ColorChannels = { red: 0, green: 1, blue: 2, white: 3 };
const X300_CHANNELS: ColorChannels = { white: 0, warm: 1 };
const DOSING_CHANNELS: ColorChannels = {};
const TINY_TERRARIUM_EGG_CHANNELS: ColorChannels = { red: 0, green: 1 };
const Z_LIGHT_TINY_CHANNELS: ColorChannels = { white: 0, warm: 1 };

const GENERIC_WHITE: DeviceModel = {
  name: 'Generic White LED',
  advertisedCodes: [],
  colorChannels: WHITE_CHANNELS,
  needsDeviceType: false,
  fallback: false,
  hasFan: false,
  minFanSpeed: 0,
  isVivid3: false,
  seaLedFamily: false,
};
const GENERIC_RGB: DeviceModel = {
  name: 'Generic RGB',
  advertisedCodes: [],
  colorChannels: RGB_CHANNELS,
  needsDeviceType: false,
  fallback: false,
  hasFan: false,
  minFanSpeed: 0,
  isVivid3: false,
  seaLedFamily: false,
};
const GENERIC_WRGB: DeviceModel = {
  name: 'Generic WRGB',
  advertisedCodes: [],
  colorChannels: WRGB_CHANNELS,
  needsDeviceType: false,
  fallback: false,
  hasFan: false,
  minFanSpeed: 0,
  isVivid3: false,
  seaLedFamily: false,
};
export const FALLBACK: DeviceModel = {
  name: 'fallback',
  advertisedCodes: [],
  colorChannels: COMMANDER_CHANNELS,
  needsDeviceType: true,
  fallback: true,
  hasFan: false,
  minFanSpeed: 0,
  isVivid3: false,
  seaLedFamily: false,
};
export const DOSING_PUMP: DeviceModel = {
  name: 'Dosing Pump',
  advertisedCodes: ['DYDOSE', 'DYDOSED', 'DYTDOS', 'DYNDOS'],
  colorChannels: DOSING_CHANNELS,
  needsDeviceType: false,
  fallback: false,
  hasFan: false,
  minFanSpeed: 0,
  isVivid3: false,
  seaLedFamily: false,
};

export const SUPPORTED_MODELS: readonly DeviceModel[] = [
  { name: 'Z Light TINY', advertisedCodes: ['DYSSD', 'DYZSD'], colorChannels: Z_LIGHT_TINY_CHANNELS, seaLedFamily: true },
  { name: 'Tiny Terrarium Egg', advertisedCodes: ['DYDD'], colorChannels: TINY_TERRARIUM_EGG_CHANNELS, seaLedFamily: true },
  { name: 'A II', advertisedCodes: ['DYNA2', 'DYNA2N'], colorChannels: WHITE_CHANNELS, seaLedFamily: true },
  { name: 'A Series', advertisedCodes: ['DYA'], colorChannels: WHITE_CHANNELS, seaLedFamily: true },
  { name: 'New C', advertisedCodes: ['DYC'], colorChannels: WHITE_CHANNELS, seaLedFamily: false },
  { name: 'New C', advertisedCodes: ['DYNC2'], colorChannels: WHITE_CHANNELS, seaLedFamily: true },
  { name: 'RGB+APLUS', advertisedCodes: ['DYARGB', 'DYRGBA+', 'DYRGBA'], colorChannels: RGB_CHANNELS, seaLedFamily: false },
  { name: 'RGB+APLUS', advertisedCodes: ['DYNARGB'], colorChannels: RGB_CHANNELS, seaLedFamily: true },
  { name: 'RGB VIVID', advertisedCodes: ['DYREE'], colorChannels: RGB_CHANNELS, seaLedFamily: false },
  { name: 'RGB VIVID II', advertisedCodes: ['DYRGBV'], colorChannels: RGB_CHANNELS, seaLedFamily: false },
  { name: 'RGB VIVID II', advertisedCodes: ['DYNVVD', 'DYNV'], colorChannels: RGB_CHANNELS, seaLedFamily: true },
  { name: 'SEA_LED', advertisedCodes: ['DYSEA'], colorChannels: WRGB_CHANNELS, seaLedFamily: true },
  { name: 'Commander X', advertisedCodes: ['DYONE'], colorChannels: WHITE_CHANNELS, seaLedFamily: false },
  { name: 'X300', advertisedCodes: ['DYTWO'], colorChannels: X300_CHANNELS, seaLedFamily: false },
  { name: 'WRGB II', advertisedCodes: ['DYWRGB'], colorChannels: RGB_CHANNELS, seaLedFamily: false },
  { name: 'WRGB II', advertisedCodes: ['DYNT90', 'DYNW30', 'DYNW45', 'DYNW60', 'DYNW90', 'DYNW12P', 'DYNWRGB'], colorChannels: RGB_CHANNELS, seaLedFamily: true },
  { name: 'WRGB II Pro', advertisedCodes: ['DYWPRO30', 'DYWPRO45', 'DYWPRO60', 'DYWPRO80', 'DYWPRO90', 'DYWPR120'], colorChannels: WRGB_CHANNELS, seaLedFamily: true },
  { name: 'WRGB II Slim', advertisedCodes: ['DYSILN', 'DYSL30', 'DYSL45', 'DYSL60', 'DYSL90', 'DYSL120', 'DYSL12'], colorChannels: RGB_CHANNELS, seaLedFamily: true },
  { name: 'WRGB VIVID III', advertisedCodes: ['DYVVD3'], colorChannels: WRGB_CHANNELS, hasFan: true, minFanSpeed: 25, isVivid3: true, seaLedFamily: true },
  { name: 'C II', advertisedCodes: ['DYNC2N'], colorChannels: WHITE_CHANNELS, seaLedFamily: true },
  { name: 'C II RGB', advertisedCodes: ['DYNCRGP', 'DYNCRGB'], colorChannels: RGB_CHANNELS, seaLedFamily: true },
  { name: 'Universal WRGB', advertisedCodes: ['DYU550', 'DYU600', 'DYU700', 'DYU800', 'DYU920', 'DYU1000', 'DYU1200', 'DYU1500'], colorChannels: WRGB_CHANNELS, seaLedFamily: true },
  { name: 'Commander 1', advertisedCodes: ['DYCOM'], colorChannels: COMMANDER_CHANNELS, needsDeviceType: true, seaLedFamily: false },
  { name: 'Commander 4', advertisedCodes: ['DYLED'], colorChannels: WRGB_CHANNELS, seaLedFamily: false },
  { name: 'Commander 4', advertisedCodes: ['DYNLED'], colorChannels: WRGB_CHANNELS, seaLedFamily: true },
  DOSING_PUMP,
];

export const GENERIC_MODELS_BY_DEVICE_TYPE: Readonly<Record<string, DeviceModel>> = {
  white: GENERIC_WHITE,
  rgb: GENERIC_RGB,
  wrgb: GENERIC_WRGB,
};

const MODEL_BY_CODE: Readonly<Record<string, DeviceModel>> = Object.fromEntries(
  SUPPORTED_MODELS.flatMap((model) => model.advertisedCodes.map((code) => [code, model])),
);

/** Return model codes sorted so longer prefixes win during detection. */
export function iterModelCodesBySpecificity(): readonly (readonly [string, DeviceModel])[] {
  return Object.entries(MODEL_BY_CODE).sort((a, b) => b[0].length - a[0].length);
}
