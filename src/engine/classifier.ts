// src/engine/classifier.ts
// MobileNet classifier adapter (effectful).
//
// Wraps TensorFlow.js + MobileNet to classify a captured image entirely
// in-browser. The image is never transmitted to an external service
// (Requirement 3.5). All failures — model load failure or a throwing
// classify call — are normalized to `null` so the caller can route to the
// location fallback without special-casing (Requirements 3.4, 4.4).

import * as mobilenet from '@tensorflow-models/mobilenet';
import type { Prediction } from '../types';

/**
 * Produces ranked predictions for an image, or `null` when classification is
 * unavailable (the model failed to load, or classification threw). This method
 * never rejects and never throws.
 *
 * Runs entirely in the browser; the image is never sent to any external
 * service.
 */
export interface Classifier {
  classify(image: HTMLImageElement): Promise<Prediction[] | null>;
}

/**
 * Creates a MobileNet-backed {@link Classifier}. The underlying model is loaded
 * lazily and only once: the load promise is cached in this closure so repeated
 * captures reuse the already-loaded model rather than reloading it.
 *
 * A load failure or a throwing `classify` call is caught and surfaced as `null`
 * (Requirements 3.4, 4.4). A failed load is not cached, so a later capture may
 * retry loading the model.
 */
export function createMobileNetClassifier(): Classifier {
  let modelPromise: Promise<mobilenet.MobileNet> | null = null;

  function loadModel(): Promise<mobilenet.MobileNet> {
    if (modelPromise === null) {
      // Cache the in-flight/resolved load promise. If the load rejects, clear
      // the cache so a subsequent classify can attempt to load again.
      modelPromise = mobilenet.load().catch((error) => {
        modelPromise = null;
        throw error;
      });
    }
    return modelPromise;
  }

  return {
    async classify(image: HTMLImageElement): Promise<Prediction[] | null> {
      try {
        const model = await loadModel();
        const predictions = await model.classify(image);
        return predictions.map((p) => ({
          className: p.className,
          probability: p.probability,
        }));
      } catch {
        // Normalize every failure (load or classify) to null so the caller can
        // fall back to location tagging without a distinct failure state.
        return null;
      }
    },
  };
}
