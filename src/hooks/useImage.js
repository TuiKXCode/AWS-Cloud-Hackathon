// src/hooks/useImage.js
//
// Probe an image before using it. The sprite's head asset is optional — drop a real
// lion cutout at /public/sprites/heads/lion-head.png and it gets used; if the file
// isn't there, `ready` stays false and the sprite draws vector art instead of showing
// a broken image.

import { useEffect, useState } from 'react';

export function useImage(src) {
  const [status, setStatus] = useState(() => (src ? 'loading' : 'idle'));

  useEffect(() => {
    if (!src) {
      setStatus('idle');
      return undefined;
    }

    let cancelled = false;
    setStatus('loading');

    const image = new Image();
    image.onload = () => {
      if (!cancelled) setStatus('ready');
    };
    image.onerror = () => {
      if (!cancelled) setStatus('error');
    };
    image.src = src;

    return () => {
      cancelled = true;
    };
  }, [src]);

  return { status, ready: status === 'ready' };
}
