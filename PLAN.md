# Chihiros LED Control — PWA (Community Replacement for the Vendor App)

> Independent, unofficial, community project. Not affiliated with Chihiros Aquatic Studio.

## Goal

Build a **web PWA** that controls Chihiros aquarium LEDs over **Web Bluetooth**,
replacing the vendor app. Works on desktop Chrome/Edge and mobile Safari (iOS 16.4+).

## Decisions

| Item | Decision |
| --- | --- |
| Platform | Web PWA (installable, runs on phone + desktop) |
| Stack | Vite + TypeScript, Svelte UI, native Web Bluetooth API |
| BLE transport | Web Bluetooth → Nordic UART Service `6E400001-B5A3-F393-E0A9-E50E24DCCA9E` (RX `...0002`, TX `...0003`) |
| Protocol | Reuse & port the reference repo's transport-agnostic layer |
| Reference repo | `github.com/TheMicDiet/chihiros-led-control` (MIT) |
| Testing strategy | Build UI first (no device on hand); verify protocol with unit tests using the repo's test vectors; live BLE test later when a device is available |

### Supported devices (target)
WRGB 1st gen, WRGB 2 Pro (owner's devices) first, then all models the
reference repo supports (A2, R2, R3, S2, S3, NVG, WRGB II, VIVID III, etc.).

## Architecture

```
src/
├── ble/            Web Bluetooth transport: requestDevice, connect, write RX, subscribe TX notifications
├── protocol/       PORTED from Python: frame encode/decode, commands, models, const, weekday encoding
├── devices/        Per-model adapters + factory (WRGB1, WRGB2Pro, A2, S3, ...)
├── ui/             Screens: device picker → dashboard → channel editor → scenes → schedules
├── store/          State, reconnection, persistence (localStorage)
└── tests/          Unit tests for protocol (byte-level, using repo test vectors)
```

**Separation of concerns:** `protocol/` = pure, unit-testable encode/decode;
`ble/` = transport; `devices/` = adapters mapping generic commands ↔ model specifics.

## Porting strategy (reuse reference repo)

Copy and port these (transport-agnostic, no BLE code) into `src/protocol/`:
- `protocol.py` — frame encode/decode, `0x5A` sequence-byte logic, packet parser
- `commands.py` — command builders
- `models.py` — data models
- `const.py`, `weekday_encoding.py`, `schedule_validation.py`
- Reuse `tests/` vectors to verify byte-identical framing.

## Phases

### Phase A — Scaffold + connect (done)
- Vite + TS + Svelte PWA project, manifest, service worker.
- `ble/` wrapper: `requestDevice` → `gatt.connect` → service/characteristics → write + subscribe.
- HTTPS/localhost + iOS 16.4+ UA check with a friendly banner.

### Phase B — Protocol port + differential verification (done)
- Port `protocol/commands/const` to TS.
- **Differential test**: 36 command vectors generated from the original Python reference (`/tmp/diff/gen_vectors.py` → `src/protocol/fixtures/vectors.json`) and replayed through the TS builders with byte-for-byte comparison (`src/protocol/differential.test.ts`, 37 tests).
- End-to-end: connect → read firmware/status notification (needs a physical light).

### Phase C — Core control
- On/off, per-channel intensity, colors, scenes on WRGB1 + WRGB2Pro first, then expand.
- Write → read-back verification.

### Phase D — UI
- Device picker → dashboard → channel sliders → scene list → schedules.
- Reconnection UI, error states.

### Phase E — Expand
- Remaining model adapters, scene library, export/import.

## Risks
- **iOS Safari BLE** needs iOS 16.4+ and HTTPS; desktop Chrome is the reliable fallback.
- **WRGB 1st gen** (older) may differ from newer frames — verify with repo tests; sniff the official app if needed.

## Status
- [x] Plan documented (PLAN.md)
- [x] Phase A scaffolded: Vite + TypeScript + Svelte PWA
- [x] Web Bluetooth transport layer (`src/ble/`): availability checks, connector
- [x] App shell (`App.svelte`): connection UI + iOS/secure-context checks
- [x] PWA config (manifest, service worker, installable)
- [x] Typecheck clean, unit tests pass, production build OK
- [x] Phase B: protocol port + differential test (37/37 byte-for-byte vs Python reference; 46 tests total, svelte-check 0 errors)
- [ ] ...

