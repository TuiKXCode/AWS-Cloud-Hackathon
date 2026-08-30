// src/components/__tests__/GalleryView.test.tsx
// Feature: sprite-generation (Phase 6) — component tests for the GalleryView.
//
// Covers:
//  - A collection with N records renders N sprite entries (Req 5.1).
//  - An empty collection shows the no-animals indication (Req 5.4).
//
// Approach:
//  - Mock ../../data/mandai.js with deterministic exhibits so name/body-art
//    resolution is stable.
//  - Mock ../../hooks/useSpriteGeneration to a no-op ({ generating: false }) so
//    the gallery does not attempt real canvas work under jsdom.
//  - Mock ../../context/CaptureContext useCapture to return a controlled
//    collection, isolating the gallery from the real provider/persistence.

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CollectedRecord } from '../../types';

// Deterministic exhibits fixture. Only id/name/spriteBodyAsset/iucnStatus are
// consulted by the gallery + SpriteImage + IUCNBadge.
const { mockData } = vi.hoisted(() => ({
  mockData: {
    exhibits: [
      {
        id: 'pygmy-hippo',
        name: 'Pygmy Hippopotamus',
        iucnStatus: 'Endangered',
        spriteBodyAsset: '/sprites/bodies/pygmy-hippo-body.png',
      },
      {
        id: 'malayan-tiger',
        name: 'Malayan Tiger',
        iucnStatus: 'Critically Endangered',
        spriteBodyAsset: '/sprites/bodies/malayan-tiger-body.png',
      },
    ],
  },
}));

vi.mock('../../data/mandai.js', () => ({
  exhibits: mockData.exhibits,
}));

// No-op the generation hook so no canvas work happens during rendering.
vi.mock('../../hooks/useSpriteGeneration', () => ({
  useSpriteGeneration: () => ({ generating: false }),
}));

// Controllable capture context: each test sets `mockCollection` before render.
const { captureState } = vi.hoisted(() => ({
  captureState: { collection: [] as CollectedRecord[] },
}));

vi.mock('../../context/CaptureContext', () => ({
  useCapture: () => ({ collection: captureState.collection }),
}));

import { GalleryView } from '../GalleryView';

function makeRecord(overrides: Partial<CollectedRecord>): CollectedRecord {
  return {
    photo: 'data:image/png;base64,PHOTO',
    exhibitId: 'pygmy-hippo',
    recognizedVia: 'classifier',
    timestamp: 1000,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  captureState.collection = [];
});

describe('GalleryView', () => {
  it('renders one sprite entry per collected record (Req 5.1)', () => {
    captureState.collection = [
      makeRecord({ exhibitId: 'pygmy-hippo', timestamp: 1000 }),
      makeRecord({ exhibitId: 'malayan-tiger', timestamp: 2000 }),
      makeRecord({
        exhibitId: 'pygmy-hippo',
        timestamp: 3000,
        spriteDataUrl: 'data:image/png;base64,SPRITE',
      }),
    ];

    render(<GalleryView />);

    // Three list items, one per record.
    const items = document.querySelectorAll('.gallery-view__item');
    expect(items).toHaveLength(3);

    // Names resolve from the exhibits fixture.
    expect(screen.getAllByText('Pygmy Hippopotamus')).toHaveLength(2);
    expect(screen.getByText('Malayan Tiger')).toBeInTheDocument();

    // The record with a spriteDataUrl shows its composited sprite.
    const sprite = document.querySelector('.sprite-image--sprite');
    expect(sprite).not.toBeNull();
    expect(sprite).toHaveAttribute('src', 'data:image/png;base64,SPRITE');
  });

  it('shows the no-animals indication for an empty collection (Req 5.4)', () => {
    captureState.collection = [];

    render(<GalleryView />);

    expect(screen.getByText('No animals collected yet')).toBeInTheDocument();
    expect(document.querySelectorAll('.gallery-view__item')).toHaveLength(0);
  });
});
