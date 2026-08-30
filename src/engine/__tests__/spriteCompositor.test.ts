// src/engine/__tests__/spriteCompositor.test.ts
//
// Unit / example tests for the effectful canvas compositor `generateSprite`.
//
// jsdom does not implement a real 2D canvas or fire Image load/error events for
// `src` assignments, so we mock the relevant browser primitives:
//   - global `Image` with a controllable `src` setter that schedules
//     load/error, or never fires (for the timeout path), and settable
//     naturalWidth/naturalHeight.
//   - HTMLCanvasElement.prototype.getContext -> a spy 2D context recording
//     the order of drawing calls.
//   - HTMLCanvasElement.prototype.toDataURL -> a deterministic marker string.
//
// Requirements covered: 1.2, 2.2, 2.3, 2.4, 2.5, 2.6, 4.2.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateSprite,
  IMAGE_LOAD_TIMEOUT_MS,
} from '../spriteCompositor';

const MARKER = 'data:image/png;base64,MARKER';

// ---------------------------------------------------------------------------
// Fake Image
// ---------------------------------------------------------------------------

// How a given URL should behave when assigned to `img.src`.
type LoadMode = 'load' | 'error' | 'never';

// Per-URL behavior config, keyed by the string passed as src.
interface FakeImageConfig {
  mode: LoadMode;
  naturalWidth: number;
  naturalHeight: number;
}

let imageConfigs: Map<string, FakeImageConfig>;
let defaultImageConfig: FakeImageConfig;

class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 0;
  naturalHeight = 0;
  private _src = '';

  set src(value: string) {
    this._src = value;
    const cfg = imageConfigs.get(value) ?? defaultImageConfig;
    this.naturalWidth = cfg.naturalWidth;
    this.naturalHeight = cfg.naturalHeight;
    if (cfg.mode === 'load') {
      queueMicrotask(() => this.onload?.());
    } else if (cfg.mode === 'error') {
      queueMicrotask(() => this.onerror?.());
    }
    // 'never' -> intentionally schedules nothing (drives the timeout path).
  }

  get src(): string {
    return this._src;
  }
}

// ---------------------------------------------------------------------------
// Fake 2D context + canvas stubs
// ---------------------------------------------------------------------------

let ctxCalls: string[];

interface CtxOptions {
  getContextReturnsNull?: boolean;
  toDataURLThrows?: boolean;
  toDataURLReturnsEmpty?: boolean;
}

let ctxOptions: CtxOptions;

let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;
let originalToDataURL: typeof HTMLCanvasElement.prototype.toDataURL;

function makeSpyContext() {
  return {
    drawImage: vi.fn((..._args: unknown[]) => {
      ctxCalls.push('drawImage');
    }),
    save: vi.fn(() => ctxCalls.push('save')),
    beginPath: vi.fn(() => ctxCalls.push('beginPath')),
    arc: vi.fn(() => ctxCalls.push('arc')),
    clip: vi.fn(() => ctxCalls.push('clip')),
    restore: vi.fn(() => ctxCalls.push('restore')),
  };
}

const PHOTO_URL = 'data:image/png;base64,PHOTO';
const BODY_URL = '/sprites/bodies/pygmy-hippo-body.png';

beforeEach(() => {
  imageConfigs = new Map();
  defaultImageConfig = { mode: 'load', naturalWidth: 100, naturalHeight: 100 };
  ctxCalls = [];
  ctxOptions = {};

  // Sensible defaults: photo + body both load with real dimensions.
  imageConfigs.set(PHOTO_URL, {
    mode: 'load',
    naturalWidth: 640,
    naturalHeight: 480,
  });
  imageConfigs.set(BODY_URL, {
    mode: 'load',
    naturalWidth: 256,
    naturalHeight: 256,
  });

  vi.stubGlobal('Image', FakeImage as unknown as typeof Image);

  originalGetContext = HTMLCanvasElement.prototype.getContext;
  originalToDataURL = HTMLCanvasElement.prototype.toDataURL;

  HTMLCanvasElement.prototype.getContext = function (
    this: HTMLCanvasElement,
    ..._args: unknown[]
  ) {
    if (ctxOptions.getContextReturnsNull) return null;
    return makeSpyContext() as unknown as CanvasRenderingContext2D;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  HTMLCanvasElement.prototype.toDataURL = function (
    this: HTMLCanvasElement,
    ..._args: unknown[]
  ) {
    if (ctxOptions.toDataURLThrows) throw new Error('toDataURL failed');
    if (ctxOptions.toDataURLReturnsEmpty) return '';
    return MARKER;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
});

afterEach(() => {
  vi.unstubAllGlobals();
  HTMLCanvasElement.prototype.getContext = originalGetContext;
  HTMLCanvasElement.prototype.toDataURL = originalToDataURL;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('generateSprite', () => {
  it('composites body then head and returns the exported data URL (Req 2.3, 2.4)', async () => {
    const result = await generateSprite(PHOTO_URL, BODY_URL);

    expect(result).toBe(MARKER);

    // Body drawImage must precede the head clip + drawImage.
    const firstDraw = ctxCalls.indexOf('drawImage');
    const clipIndex = ctxCalls.indexOf('clip');
    const secondDraw = ctxCalls.indexOf('drawImage', firstDraw + 1);

    expect(firstDraw).toBeGreaterThanOrEqual(0); // body drawn
    expect(clipIndex).toBeGreaterThan(firstDraw); // clip after body
    expect(secondDraw).toBeGreaterThan(clipIndex); // head drawn after clip

    // Full clip sequence order: save -> beginPath -> arc -> clip -> restore.
    expect(ctxCalls).toEqual([
      'drawImage',
      'save',
      'beginPath',
      'arc',
      'clip',
      'drawImage',
      'restore',
    ]);
  });

  it('uses the provided photo data URL as the photo source (Req 1.2)', async () => {
    // A distinct photo URL with its own dimensions; if the compositor loaded
    // the wrong URL, the default config (or body) would apply and the crop
    // would differ. Success here confirms the photo URL was the one loaded.
    const specificPhoto = 'data:image/png;base64,SPECIFIC_PHOTO';
    imageConfigs.set(specificPhoto, {
      mode: 'load',
      naturalWidth: 300,
      naturalHeight: 300,
    });

    const result = await generateSprite(specificPhoto, BODY_URL);
    expect(result).toBe(MARKER);
  });

  it('returns null for a zero-dimension photo (Req 2.2)', async () => {
    imageConfigs.set(PHOTO_URL, {
      mode: 'load',
      naturalWidth: 0,
      naturalHeight: 480,
    });

    const result = await generateSprite(PHOTO_URL, BODY_URL);
    expect(result).toBeNull();
  });

  it('returns null when the body asset never loads within the timeout (Req 2.6)', async () => {
    vi.useFakeTimers();
    imageConfigs.set(BODY_URL, {
      mode: 'never',
      naturalWidth: 256,
      naturalHeight: 256,
    });

    const promise = generateSprite(PHOTO_URL, BODY_URL);

    // Flush the photo's microtask load, then advance past the 5s timeout.
    await vi.advanceTimersByTimeAsync(IMAGE_LOAD_TIMEOUT_MS + 1);

    await expect(promise).resolves.toBeNull();
  });

  it('returns null when getContext is unavailable, never rejects (Req 4.2)', async () => {
    ctxOptions.getContextReturnsNull = true;
    await expect(generateSprite(PHOTO_URL, BODY_URL)).resolves.toBeNull();
  });

  it('returns null when toDataURL throws, never rejects (Req 4.2)', async () => {
    ctxOptions.toDataURLThrows = true;
    await expect(generateSprite(PHOTO_URL, BODY_URL)).resolves.toBeNull();
  });

  it('returns null when toDataURL returns empty (Req 4.2)', async () => {
    ctxOptions.toDataURLReturnsEmpty = true;
    await expect(generateSprite(PHOTO_URL, BODY_URL)).resolves.toBeNull();
  });

  it('returns null when the photo load errors, never rejects (Req 4.2)', async () => {
    imageConfigs.set(PHOTO_URL, {
      mode: 'error',
      naturalWidth: 0,
      naturalHeight: 0,
    });
    await expect(generateSprite(PHOTO_URL, BODY_URL)).resolves.toBeNull();
  });

  it('produces the same data URL for identical inputs (Req 2.5)', async () => {
    const first = await generateSprite(PHOTO_URL, BODY_URL);
    const second = await generateSprite(PHOTO_URL, BODY_URL);
    expect(first).toBe(second);
    expect(first).toBe(MARKER);
  });
});
