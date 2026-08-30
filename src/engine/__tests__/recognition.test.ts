// src/engine/__tests__/recognition.test.ts
// Unit / example tests for the recognition/tagging logic. These cover the
// concrete behaviors of comma-separated MobileNet class names, case
// insensitivity, and the confidence threshold boundary (Requirements 3.2, 3.3).

import { describe, it, expect } from 'vitest';
import {
  matchExhibitByLabel,
  resolveTag,
  DEFAULT_CONFIDENCE_THRESHOLD,
} from '../recognition';
import type { Exhibit, ExhibitWithDistance, Prediction } from '../../types';

function makeExhibit(id: string, imagenetLabels: string[]): Exhibit {
  return {
    id,
    name: id,
    lat: 0,
    lng: 0,
    iucnStatus: 'Least Concern',
    funFact: '',
    feedingTimes: [],
    diet: '',
    dietTags: [],
    trophicRole: '',
    dependsOn: [],
    predatorOf: [],
    ecosystemImpactIfRemoved: '',
    imagenetLabels,
    spriteBodyAsset: '',
    points: 0,
  };
}

const hippo = makeExhibit('hippo', ['hippopotamus', 'hippo']);
const tiger = makeExhibit('tiger', ['tiger']);
const panda = makeExhibit('panda', ['giant panda', 'panda']);
const exhibits = [hippo, tiger, panda];

const nearest: ExhibitWithDistance = { exhibit: tiger, distance: 42 };

describe('recognition unit tests', () => {
  describe('matchExhibitByLabel — comma-separated MobileNet class names', () => {
    it('matches when a comma-separated synonym part equals an exhibit label', () => {
      const predictions: Prediction[] = [{ className: 'hippopotamus, hippo', probability: 0.9 }];
      const result = matchExhibitByLabel(predictions, exhibits);
      expect(result).not.toBeNull();
      expect(result!.exhibit.id).toBe('hippo');
      expect(result!.probability).toBe(0.9);
    });

    it('matches on a later synonym part when the first part does not match', () => {
      // "giant panda" is the first part; exhibit label "panda" is the second.
      const predictions: Prediction[] = [{ className: 'red panda, panda', probability: 0.8 }];
      const result = matchExhibitByLabel(predictions, exhibits);
      expect(result).not.toBeNull();
      expect(result!.exhibit.id).toBe('panda');
    });
  });

  describe('matchExhibitByLabel — case-insensitivity', () => {
    it('matches regardless of case', () => {
      const predictions: Prediction[] = [{ className: 'TiGeR', probability: 0.7 }];
      const result = matchExhibitByLabel(predictions, exhibits);
      expect(result).not.toBeNull();
      expect(result!.exhibit.id).toBe('tiger');
    });

    it('matches an upper-case exhibit label against a lower-case prediction', () => {
      const upperExhibit = makeExhibit('zebra', ['ZEBRA']);
      const predictions: Prediction[] = [{ className: 'zebra', probability: 0.65 }];
      const result = matchExhibitByLabel(predictions, [upperExhibit]);
      expect(result).not.toBeNull();
      expect(result!.exhibit.id).toBe('zebra');
    });
  });

  describe('matchExhibitByLabel — no match / edge cases', () => {
    it('returns null when nothing matches', () => {
      const predictions: Prediction[] = [{ className: 'automobile', probability: 0.99 }];
      expect(matchExhibitByLabel(predictions, exhibits)).toBeNull();
    });

    it('returns null for null predictions', () => {
      expect(matchExhibitByLabel(null, exhibits)).toBeNull();
    });

    it('returns null for empty predictions', () => {
      expect(matchExhibitByLabel([], exhibits)).toBeNull();
    });
  });

  describe('resolveTag — threshold boundary', () => {
    it('probability exactly == threshold counts as confident (classifier tag)', () => {
      const predictions: Prediction[] = [
        { className: 'tiger', probability: DEFAULT_CONFIDENCE_THRESHOLD },
      ];
      const result = resolveTag(predictions, exhibits, nearest);
      expect(result).not.toBeNull();
      expect(result!.recognizedVia).toBe('classifier');
      expect(result!.exhibit.id).toBe('tiger');
    });

    it('probability just below threshold falls back to nearest', () => {
      const predictions: Prediction[] = [{ className: 'hippo', probability: 0.59 }];
      const result = resolveTag(predictions, exhibits, nearest, 0.6);
      expect(result).not.toBeNull();
      expect(result!.recognizedVia).toBe('location-fallback');
      expect(result!.exhibit.id).toBe(nearest.exhibit.id);
    });

    it('probability above threshold produces a classifier tag', () => {
      const predictions: Prediction[] = [{ className: 'hippo', probability: 0.95 }];
      const result = resolveTag(predictions, exhibits, nearest, 0.6);
      expect(result).not.toBeNull();
      expect(result!.recognizedVia).toBe('classifier');
      expect(result!.exhibit.id).toBe('hippo');
    });

    it('no confident match and null nearest yields null', () => {
      const predictions: Prediction[] = [{ className: 'hippo', probability: 0.1 }];
      expect(resolveTag(predictions, exhibits, null, 0.6)).toBeNull();
    });
  });

  describe('resolveTag — dataset-order tiebreak (Req 3.2)', () => {
    it('on a probability tie, the earliest exhibit in dataset order wins', () => {
      const predictions: Prediction[] = [
        { className: 'panda', probability: 0.8 },
        { className: 'hippo', probability: 0.8 },
      ];
      const result = resolveTag(predictions, exhibits, null, 0.6);
      expect(result).not.toBeNull();
      // hippo appears before panda in `exhibits`.
      expect(result!.exhibit.id).toBe('hippo');
    });
  });
});
