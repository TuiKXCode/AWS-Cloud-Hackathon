// src/data/__tests__/spriteAssets.test.ts
// Asset smoke check (Phase 6, Task 1.2): verifies that every `spriteBodyAsset`
// path referenced by the exhibits dataset in mandai.js has a corresponding file
// on disk under the app's `public/` directory. This guards against dangling
// body-art references that would otherwise only surface as a broken image at
// runtime. Requirements: 5.3.

import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
// mandai.js is authored in JS; the exhibits export is an array of exhibit records.
import { exhibits } from '../mandai.js';

describe('sprite body-art assets', () => {
  // Only exhibits that actually declare a spriteBodyAsset need a backing file.
  const withBodyAsset = (exhibits as Array<{ id?: string; spriteBodyAsset?: string }>)
    .filter((e) => typeof e.spriteBodyAsset === 'string' && e.spriteBodyAsset.length > 0);

  it('has at least one exhibit with a spriteBodyAsset to check', () => {
    expect(withBodyAsset.length).toBeGreaterThan(0);
  });

  it.each(withBodyAsset.map((e) => [e.id ?? '(unknown)', e.spriteBodyAsset as string]))(
    'exhibit %s references an existing body-art file: %s',
    (_id, assetPath) => {
      // Asset URLs are absolute paths served from public/ (e.g.
      // "/sprites/bodies/pygmy-hippo-body.png"). Strip the leading slash and
      // resolve against <projectRoot>/public.
      const relative = assetPath.replace(/^\/+/, '');
      const fsPath = path.join(process.cwd(), 'public', relative);
      expect(existsSync(fsPath)).toBe(true);
    },
  );
});
