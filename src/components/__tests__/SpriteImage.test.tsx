// src/components/__tests__/SpriteImage.test.tsx
// Feature: sprite-generation (Phase 6) — component tests for the SpriteImage
// fallback chain.
//
// Covers:
//  - spriteDataUrl present -> renders an <img> whose src is the sprite (Req 5.2).
//  - no spriteDataUrl, bodyAssetUrl present -> renders the body <img> (Req 4.2).
//  - body <img> onError -> falls back to the Placeholder_Fallback and no body/
//    sprite <img> remains (Req 4.3).
//  - full precedence chain sprite -> body -> placeholder (Req 5.3).

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { SpriteImage } from '../SpriteImage';

afterEach(() => {
  cleanup();
});

describe('SpriteImage', () => {
  it('shows the composited sprite when spriteDataUrl is present (Req 5.2)', () => {
    const sprite = 'data:image/png;base64,SPRITE';
    render(
      <SpriteImage
        spriteDataUrl={sprite}
        bodyAssetUrl="/sprites/bodies/pygmy-hippo-body.png"
        alt="Pygmy Hippopotamus"
      />,
    );

    const img = screen.getByRole('img', { name: 'Pygmy Hippopotamus' });
    expect(img.tagName).toBe('IMG');
    expect(img).toHaveAttribute('src', sprite);
    // No placeholder is rendered when the sprite is available.
    expect(screen.queryByTestId('sprite-placeholder')).not.toBeInTheDocument();
  });

  it('shows the body art when there is no sprite but a body asset (Req 4.2)', () => {
    const body = '/sprites/bodies/pygmy-hippo-body.png';
    render(<SpriteImage bodyAssetUrl={body} alt="Pygmy Hippopotamus" />);

    const img = screen.getByRole('img', { name: 'Pygmy Hippopotamus' });
    expect(img.tagName).toBe('IMG');
    expect(img).toHaveAttribute('src', body);
    expect(screen.queryByTestId('sprite-placeholder')).not.toBeInTheDocument();
  });

  it('falls back to the placeholder when the body art errors, with no broken image (Req 4.3)', () => {
    const body = '/sprites/bodies/missing.png';
    render(<SpriteImage bodyAssetUrl={body} alt="Pygmy Hippopotamus" />);

    const bodyImg = screen.getByRole('img', { name: 'Pygmy Hippopotamus' });
    expect(bodyImg.tagName).toBe('IMG');

    // Simulate the body <img> failing to load.
    fireEvent.error(bodyImg);

    // The placeholder is now shown, and no <img> element remains at all
    // (so a broken image is never displayed).
    expect(screen.getByTestId('sprite-placeholder')).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
    // The placeholder still exposes the accessible label.
    expect(screen.getByRole('img', { name: 'Pygmy Hippopotamus' })).toBe(
      screen.getByTestId('sprite-placeholder'),
    );
  });

  it('renders the placeholder directly when neither sprite nor body asset is given (Req 5.3)', () => {
    render(<SpriteImage alt="Unknown Animal" />);

    expect(screen.getByTestId('sprite-placeholder')).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
  });

  it('follows the full precedence chain sprite -> body -> placeholder (Req 5.3)', () => {
    // 1. Sprite present -> sprite wins.
    const { rerender } = render(
      <SpriteImage
        spriteDataUrl="data:image/png;base64,SPRITE"
        bodyAssetUrl="/sprites/bodies/pygmy-hippo-body.png"
        alt="Pygmy Hippopotamus"
      />,
    );
    expect(screen.getByRole('img', { name: 'Pygmy Hippopotamus' })).toHaveAttribute(
      'src',
      'data:image/png;base64,SPRITE',
    );
    expect(screen.queryByTestId('sprite-placeholder')).not.toBeInTheDocument();

    // 2. No sprite, body present -> body art shown.
    rerender(
      <SpriteImage
        bodyAssetUrl="/sprites/bodies/pygmy-hippo-body.png"
        alt="Pygmy Hippopotamus"
      />,
    );
    const bodyImg = screen.getByRole('img', { name: 'Pygmy Hippopotamus' });
    expect(bodyImg).toHaveAttribute('src', '/sprites/bodies/pygmy-hippo-body.png');

    // 3. Body errors -> placeholder.
    fireEvent.error(bodyImg);
    expect(screen.getByTestId('sprite-placeholder')).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
  });
});
