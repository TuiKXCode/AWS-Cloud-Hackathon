// src/context/CaptureContext.tsx
// CaptureProvider / useCapture: orchestration for the checkpoint-photo-capture
// feature (Phase 4). Owns the capture phase state and the persisted collection,
// wiring together the pure logic modules (recognition, collection) and the
// effectful adapters (classifier, storage) around the Phase 1 location context.
//
// Responsibilities:
//  - On mount, restore the collection from localStorage and derive Player_Total
//    (Req 7.3, 7.4).
//  - When a captured file arrives, read it to a data URL + image element, snapshot
//    the nearest exhibit at activation (Req 1.5), classify (Req 3.1), resolve the
//    tag via the pure recognition logic (Req 3.x/4.x), award points with
//    deduplication (Req 5.x), persist the record (Req 7.1, 7.2), and surface the
//    result (Req 6.1).
//  - This module never reads geolocation directly; it consumes useLocationContext().

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useLocationContext } from './LocationContext';

import {
  DEFAULT_CONFIDENCE_THRESHOLD,
  resolveTag,
} from '../engine/recognition';
import {
  appendRecord,
  computePlayerTotal,
  isFirstTag,
  isPointsAwardable,
  parseCollection,
} from '../engine/collection';
import { readRawCollection, writeCollection } from '../engine/storage';
import { setSpriteDataUrl } from '../engine/spriteSelection';
import { createMobileNetClassifier, type Classifier } from '../engine/classifier';

import { exhibits as rawExhibits } from '../data/mandai.js';

import type {
  CollectedRecord,
  Exhibit,
  RecognitionMethod,
} from '../types';

const exhibits = rawExhibits as Exhibit[];

/**
 * The lifecycle phase of a capture:
 *  - 'idle': no capture in progress (initial and post-dismiss state).
 *  - 'classifying': a captured image is being read/classified/tagged.
 *  - 'result': a tag was resolved and the Result Screen should be shown.
 *  - 'error': no exhibit could be tagged (no confident match and no nearest
 *    exhibit in range); the captured image is retained (Req 4.5).
 */
export type CapturePhase = 'idle' | 'classifying' | 'result' | 'error';

/**
 * The outcome surfaced to the Result Screen after a successful tag.
 */
export interface CaptureResult {
  exhibit: Exhibit;
  recognizedVia: RecognitionMethod;
  /** Points added to Player_Total for this capture; 0 for duplicates or
   * missing/out-of-range points (Req 5.2, 5.4). */
  pointsAwarded: number;
  /** Whether this was the first tag of this exhibit id (Req 5.1). */
  firstTag: boolean;
  /** False when the localStorage write failed; the record is still retained
   * in memory (Req 7.2). */
  saveOk: boolean;
}

export interface CaptureContextValue {
  phase: CapturePhase;
  /** True when the native camera could not be opened (Req 1.7). */
  cameraUnavailable: boolean;
  result: CaptureResult | null;
  collection: CollectedRecord[];
  playerTotal: number;
  /** Retained data URL of the last captured image when no exhibit could be
   * tagged (Req 4.5); null otherwise. */
  retainedImage: string | null;
  /** Whether classification fell back to location tagging (used by the UI to
   * surface a "recognition unavailable" note; Req 4.4). */
  recognitionUnavailable: boolean;
  /** Process a File produced by the native camera input. */
  handleCapturedFile: (file: File) => Promise<void>;
  /** The native input opened but produced no file (Req 2.4). */
  handleCaptureCancelled: () => void;
  /** Signal that the camera could not be opened (Req 1.7). */
  reportCameraUnavailable: () => void;
  /** Dismiss the result/error and return to idle. */
  dismissResult: () => void;
  /**
   * Phase 6 (sprite-generation): set `spriteDataUrl` on the record(s) matched
   * by the stable record key (`${exhibitId}-${timestamp}`) and persist.
   * Preserves photo, exhibitId, recognizedVia, and timestamp (Req 3.4). The
   * in-memory collection is updated first, then a write is attempted; on write
   * failure the in-memory update is kept and no records are discarded
   * (Req 3.1, 3.3).
   */
  updateSpriteDataUrl: (recordKey: string, spriteDataUrl: string) => void;
}

const CaptureContext = createContext<CaptureContextValue | null>(null);

/**
 * Read a File into a data URL. Never rejects: on any FileReader failure the
 * promise resolves to an empty string so the flow can continue defensively.
 */
function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(typeof reader.result === 'string' ? reader.result : '');
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    } catch {
      resolve('');
    }
  });
}

/**
 * Build an HTMLImageElement from a data URL for the classifier. Never rejects;
 * resolves to the image element once it loads (or errors). In environments
 * where Image is unavailable or never fires load/error (jsdom), this resolves
 * to null rather than hanging.
 */
function loadImageElement(dataURL: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (typeof Image !== 'function' || dataURL.length === 0) {
      resolve(null);
      return;
    }
    try {
      const img = new Image();
      let settled = false;
      const done = (value: HTMLImageElement | null) => {
        if (!settled) {
          settled = true;
          resolve(value);
        }
      };
      img.onload = () => done(img);
      img.onerror = () => done(null);
      img.src = dataURL;
      // jsdom never fires load/error for data URLs; resolve on next tick so we
      // never hang. The classifier is expected to normalize a null image.
      setTimeout(() => done(img), 0);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Provides capture orchestration to the tree. `classifier` is injectable for
 * tests; it defaults to the MobileNet adapter.
 */
export function CaptureProvider({
  classifier,
  children,
}: {
  classifier?: Classifier;
  children: ReactNode;
}) {
  const { nearestExhibit } = useLocationContext();

  // The classifier is created once. A caller-provided classifier (tests) takes
  // precedence; otherwise the MobileNet adapter is created lazily via a ref.
  const defaultClassifierRef = useRef<Classifier | null>(null);
  const getClassifier = useCallback((): Classifier => {
    if (classifier) {
      return classifier;
    }
    if (defaultClassifierRef.current === null) {
      defaultClassifierRef.current = createMobileNetClassifier();
    }
    return defaultClassifierRef.current;
  }, [classifier]);

  const [phase, setPhase] = useState<CapturePhase>('idle');
  const [cameraUnavailable, setCameraUnavailable] = useState(false);
  const [result, setResult] = useState<CaptureResult | null>(null);
  const [retainedImage, setRetainedImage] = useState<string | null>(null);
  const [recognitionUnavailable, setRecognitionUnavailable] = useState(false);

  // Restore the collection from localStorage on mount (Req 7.3, 7.4).
  const [collection, setCollection] = useState<CollectedRecord[]>(() =>
    parseCollection(readRawCollection()),
  );
  const [playerTotal, setPlayerTotal] = useState<number>(() =>
    computePlayerTotal(parseCollection(readRawCollection()), exhibits),
  );

  // Snapshot of the nearest exhibit, kept in a ref so the async capture handler
  // reads the value reported at activation time (Req 1.5).
  const nearestRef = useRef(nearestExhibit);
  useEffect(() => {
    nearestRef.current = nearestExhibit;
  }, [nearestExhibit]);

  const handleCapturedFile = useCallback(
    async (file: File) => {
      setPhase('classifying');
      setRecognitionUnavailable(false);

      // Snapshot the nearest exhibit at activation as the fallback target
      // (Req 1.5).
      const snapshotNearest = nearestRef.current;

      // Read the file to a data URL (retained for the record regardless of
      // whether the image element loads) and build an image for the classifier.
      const dataURL = await readFileAsDataURL(file);
      const image = await loadImageElement(dataURL);

      // Classify. The adapter normalizes all failures to null (Req 3.4, 4.4).
      let predictions = null;
      if (image !== null) {
        predictions = await getClassifier().classify(image);
      }

      const tag = resolveTag(
        predictions,
        exhibits,
        snapshotNearest,
        DEFAULT_CONFIDENCE_THRESHOLD,
      );

      if (tag === null) {
        // No confident match and no nearest exhibit in range: keep the image
        // and report that nothing could be tagged (Req 4.5).
        setRetainedImage(dataURL);
        setResult(null);
        setPhase('error');
        return;
      }

      // Surface a "recognition unavailable" hint when we fell back to location
      // tagging (Req 4.4).
      setRecognitionUnavailable(tag.recognizedVia === 'location-fallback');

      const record: CollectedRecord = {
        photo: dataURL,
        exhibitId: tag.exhibit.id,
        recognizedVia: tag.recognizedVia,
        timestamp: Date.now(),
      };

      const firstTag = isFirstTag(collection, tag.exhibit.id);
      const pointsAwarded =
        firstTag && isPointsAwardable(tag.exhibit) ? tag.exhibit.points : 0;

      const newCollection = appendRecord(collection, record);
      setCollection(newCollection);
      setPlayerTotal(computePlayerTotal(newCollection, exhibits));

      const saveOk = writeCollection(JSON.stringify(newCollection));

      setResult({
        exhibit: tag.exhibit,
        recognizedVia: tag.recognizedVia,
        pointsAwarded,
        firstTag,
        saveOk,
      });
      setRetainedImage(null);
      setPhase('result');
    },
    [collection, getClassifier],
  );

  const handleCaptureCancelled = useCallback(() => {
    // No record created; return to the card (Req 2.4).
    setPhase('idle');
    setResult(null);
    setRetainedImage(null);
    setRecognitionUnavailable(false);
  }, []);

  const reportCameraUnavailable = useCallback(() => {
    setCameraUnavailable(true);
  }, []);

  const dismissResult = useCallback(() => {
    setPhase('idle');
    setResult(null);
    setRetainedImage(null);
    setRecognitionUnavailable(false);
    setCameraUnavailable(false);
  }, []);

  const updateSpriteDataUrl = useCallback(
    (recordKey: string, spriteDataUrl: string) => {
      // Build the next collection immutably: only the record whose key matches
      // gets its spriteDataUrl set; all other fields and records are unchanged
      // (Req 3.4). Update in-memory state first so the sprite keeps displaying
      // even if the write fails (Req 3.1, 3.3).
      setCollection((current) => {
        const next = setSpriteDataUrl(current, recordKey, spriteDataUrl);
        // Persist; a false result (quota/serialize/unavailable) is tolerated —
        // the in-memory update is retained and no records are discarded
        // (Req 3.3).
        writeCollection(JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  const value = useMemo<CaptureContextValue>(
    () => ({
      phase,
      cameraUnavailable,
      result,
      collection,
      playerTotal,
      retainedImage,
      recognitionUnavailable,
      handleCapturedFile,
      handleCaptureCancelled,
      reportCameraUnavailable,
      dismissResult,
      updateSpriteDataUrl,
    }),
    [
      phase,
      cameraUnavailable,
      result,
      collection,
      playerTotal,
      retainedImage,
      recognitionUnavailable,
      handleCapturedFile,
      handleCaptureCancelled,
      reportCameraUnavailable,
      dismissResult,
      updateSpriteDataUrl,
    ],
  );

  return (
    <CaptureContext.Provider value={value}>{children}</CaptureContext.Provider>
  );
}

/**
 * Consumer hook for the capture context. Throws if used outside a
 * {@link CaptureProvider} so misuse is caught early.
 */
export function useCapture(): CaptureContextValue {
  const ctx = useContext(CaptureContext);
  if (ctx === null) {
    throw new Error('useCapture must be used within a CaptureProvider');
  }
  return ctx;
}

export { CaptureContext };
