// src/engine/recognition.ts
// Recognition/tagging logic for the checkpoint-photo-capture feature (Phase 4).
//
// Pure, deterministic functions that decide which exhibit a captured image is
// tagged to and how (via the on-device classifier or via location fallback).
// This module performs no I/O and has no React or TensorFlow.js dependency, so
// it is fully unit- and property-testable in isolation. The effectful
// classifier adapter normalizes all failures to `null` predictions before
// calling into this module (see design "Layering").

import type {
  Exhibit,
  ExhibitWithDistance,
  Prediction,
  RecognitionMethod,
} from '../types';

/**
 * The default minimum confidence a matching prediction must meet or exceed for
 * a classifier match to be accepted, on a 0.0 to 1.0 scale (Requirement 4.1).
 */
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.6;

/**
 * The outcome of resolving a capture to an exhibit: the tagged exhibit and how
 * it was recognized.
 */
export interface TagResult {
  exhibit: Exhibit;
  recognizedVia: RecognitionMethod; // 'classifier' | 'location-fallback'
}

/**
 * Split a (possibly comma-separated MobileNet) className into its individual
 * synonym parts, lowercased and trimmed, dropping empty parts.
 *
 * MobileNet class names can be comma-separated synonym lists such as
 * "hippopotamus, hippo", so each part is considered independently when
 * matching against an exhibit's `imagenetLabels` (design "Data Models").
 */
function normalizeClassNameParts(className: string): string[] {
  return className
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part.length > 0);
}

/**
 * Build a lookup from a case-insensitive label string to the index of the
 * earliest exhibit (in dataset order) whose `imagenetLabels` contains it.
 * Earlier exhibits win, which drives the dataset-order tiebreak in
 * {@link matchExhibitByLabel} (Requirement 3.2).
 */
function buildLabelIndex(exhibits: Exhibit[]): Map<string, number> {
  const labelToExhibitIndex = new Map<string, number>();
  for (let i = 0; i < exhibits.length; i++) {
    const labels = exhibits[i].imagenetLabels;
    if (!Array.isArray(labels)) {
      continue;
    }
    for (const label of labels) {
      if (typeof label !== 'string') {
        continue;
      }
      const key = label.trim().toLowerCase();
      if (key.length === 0) {
        continue;
      }
      // Keep the earliest exhibit for a given label (do not overwrite).
      if (!labelToExhibitIndex.has(key)) {
        labelToExhibitIndex.set(key, i);
      }
    }
  }
  return labelToExhibitIndex;
}

/**
 * Find the highest-confidence prediction whose className case-insensitively
 * exactly matches an entry in some exhibit's `imagenetLabels`.
 *
 * MobileNet class names may be comma-separated synonym lists, so the className
 * is split on commas and trimmed; a match occurs when any part equals
 * (case-insensitive) any `imagenetLabels` entry.
 *
 * On a probability tie among matching predictions, the exhibit appearing
 * earliest in the `exhibits` array is chosen (Requirement 3.2).
 *
 * @param predictions Ranked predictions from the classifier, or null when the
 *   classifier was unavailable.
 * @param exhibits The exhibits dataset (order significant for tiebreaks).
 * @returns The matched exhibit and its probability, or null when nothing
 *   matches, `predictions` is null, or `predictions` is empty.
 */
export function matchExhibitByLabel(
  predictions: Prediction[] | null,
  exhibits: Exhibit[],
): { exhibit: Exhibit; probability: number } | null {
  if (predictions == null || predictions.length === 0) {
    return null;
  }

  const labelIndex = buildLabelIndex(exhibits);
  if (labelIndex.size === 0) {
    return null;
  }

  let best: { exhibitIndex: number; probability: number } | null = null;

  for (const prediction of predictions) {
    if (
      prediction == null ||
      typeof prediction.className !== 'string' ||
      typeof prediction.probability !== 'number' ||
      !Number.isFinite(prediction.probability)
    ) {
      continue;
    }

    // Determine the earliest matching exhibit for this prediction's labels.
    let matchedExhibitIndex: number | null = null;
    for (const part of normalizeClassNameParts(prediction.className)) {
      const idx = labelIndex.get(part);
      if (idx !== undefined && (matchedExhibitIndex === null || idx < matchedExhibitIndex)) {
        matchedExhibitIndex = idx;
      }
    }
    if (matchedExhibitIndex === null) {
      continue;
    }

    if (best === null || prediction.probability > best.probability) {
      // Strictly higher probability wins outright.
      best = { exhibitIndex: matchedExhibitIndex, probability: prediction.probability };
    } else if (
      prediction.probability === best.probability &&
      matchedExhibitIndex < best.exhibitIndex
    ) {
      // Tie on probability: prefer the earlier exhibit in dataset order.
      best = { exhibitIndex: matchedExhibitIndex, probability: prediction.probability };
    }
  }

  if (best === null) {
    return null;
  }
  return { exhibit: exhibits[best.exhibitIndex], probability: best.probability };
}

/**
 * Resolve the final tag for a capture.
 *
 * - If {@link matchExhibitByLabel} finds a match whose probability is at or
 *   above `threshold`, tag via the classifier (Requirement 3.3).
 * - Otherwise, if `nearestExhibit` is non-null, tag the nearest exhibit via
 *   location fallback (Requirements 4.1, 4.2).
 * - Otherwise return null; no exhibit can be tagged (Requirement 4.5).
 *
 * A null `predictions` (classifier unavailable/threw) behaves identically to
 * an empty prediction list — it never throws and never produces a distinct
 * failure outcome (Requirements 3.4, 4.4).
 *
 * @param predictions Ranked predictions from the classifier, or null.
 * @param exhibits The exhibits dataset.
 * @param nearestExhibit The location-provider's nearest exhibit, or null.
 * @param threshold Minimum confidence for a classifier match. Defaults to
 *   {@link DEFAULT_CONFIDENCE_THRESHOLD}.
 * @returns The resolved tag, or null when nothing can be tagged.
 */
export function resolveTag(
  predictions: Prediction[] | null,
  exhibits: Exhibit[],
  nearestExhibit: ExhibitWithDistance | null,
  threshold: number = DEFAULT_CONFIDENCE_THRESHOLD,
): TagResult | null {
  const match = matchExhibitByLabel(predictions, exhibits);
  if (match !== null && match.probability >= threshold) {
    return { exhibit: match.exhibit, recognizedVia: 'classifier' };
  }
  if (nearestExhibit != null) {
    return { exhibit: nearestExhibit.exhibit, recognizedVia: 'location-fallback' };
  }
  return null;
}
