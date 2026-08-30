// src/engine/__tests__/classifier.test.ts
// Example-based unit tests for the MobileNet classifier adapter.
//
// TensorFlow.js / MobileNet is mocked so these tests exercise only the
// adapter's mapping and failure-normalization behavior (Requirements 3.1,
// 3.4, 4.4), never the real model.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as mobilenet from '@tensorflow-models/mobilenet';
import { createMobileNetClassifier } from '../classifier';

// Mock the mobilenet module with a controllable `load` mock. Individual tests
// configure `load`'s behavior (resolve with a fake model, or reject).
vi.mock('@tensorflow-models/mobilenet', () => ({
  load: vi.fn(),
}));

const loadMock = vi.mocked(mobilenet.load);

// A stand-in for an image element. The model is mocked, so the concrete type
// is never inspected — a plain object cast is sufficient.
const fakeImage = {} as HTMLImageElement;

/** Build a fake MobileNet whose `classify` resolves/throws as configured. */
function makeFakeModel(classify: () => Promise<Array<{ className: string; probability: number }>>) {
  return {
    load: vi.fn(),
    infer: vi.fn(),
    classify: vi.fn(classify),
  } as unknown as mobilenet.MobileNet;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createMobileNetClassifier', () => {
  it('maps model.classify results to Prediction[] on success', async () => {
    const rawResults = [
      { className: 'tiger', probability: 0.92 },
      { className: 'hippopotamus, hippo', probability: 0.05 },
    ];
    loadMock.mockResolvedValue(makeFakeModel(() => Promise.resolve(rawResults)));

    const classifier = createMobileNetClassifier();
    const result = await classifier.classify(fakeImage);

    expect(result).toEqual([
      { className: 'tiger', probability: 0.92 },
      { className: 'hippopotamus, hippo', probability: 0.05 },
    ]);
  });

  it('returns null when the model fails to load', async () => {
    loadMock.mockRejectedValue(new Error('model load failed'));

    const classifier = createMobileNetClassifier();
    const result = await classifier.classify(fakeImage);

    expect(result).toBeNull();
  });

  it('returns null when model.classify throws', async () => {
    loadMock.mockResolvedValue(
      makeFakeModel(() => Promise.reject(new Error('classify blew up'))),
    );

    const classifier = createMobileNetClassifier();
    const result = await classifier.classify(fakeImage);

    expect(result).toBeNull();
  });

  it('loads the model only once across repeated classify calls', async () => {
    const model = makeFakeModel(() => Promise.resolve([{ className: 'panda', probability: 0.7 }]));
    loadMock.mockResolvedValue(model);

    const classifier = createMobileNetClassifier();
    await classifier.classify(fakeImage);
    await classifier.classify(fakeImage);

    expect(loadMock).toHaveBeenCalledTimes(1);
  });
});
