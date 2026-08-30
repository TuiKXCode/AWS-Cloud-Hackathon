// scripts/build-offline.mjs
//
// Produces ONE self-contained HTML file that runs from a file:// URL, for handing to
// people who should not have to install anything: judges opening it out of a shared
// Google Drive folder, or anyone on a laptop with no Node and no internet.
//
// Google Drive cannot host a running web app (it stopped serving static HTML in 2016),
// so the artifact that lives in Drive has to be a file the viewer DOWNLOADS and opens
// locally. That only works if the page carries everything with it.
//
// Run after `vite build --config vite.config.offline.ts`:
//   1. inline the stylesheet,
//   2. inline the script (already a classic IIFE, so file:// will execute it),
//   3. replace every /sprites/... reference with a data URI, since an absolute path
//      resolves against the filesystem root on a file:// page,
//   4. write dist-offline/mandai-echoes.html and delete the loose parts.
//
// What still needs the network: nothing, except the MobileNet weights behind "Take
// Photo". Every other feature — the exhibit card, facilities, food web, dining, the
// whole tycoon game — is fully offline.

import { readFileSync, writeFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const OUT_DIR = 'dist-offline';
// Both sprite folders: the body art and the animal photographs used as faces.
const SPRITE_DIRS = [
  join('public', 'sprites', 'bodies'),
  join('public', 'sprites', 'heads'),
];
const FINAL = join(OUT_DIR, 'mandai-echoes.html');

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml' };

function fail(message) {
  console.error(`\n[build-offline] ${message}\n`);
  process.exit(1);
}

if (!existsSync(join(OUT_DIR, 'index.html'))) {
  fail(`${OUT_DIR}/index.html not found — run the vite build first.`);
}

let html = readFileSync(join(OUT_DIR, 'index.html'), 'utf8');

// --- 1 + 2. Fold the emitted CSS and JS into the page ------------------------
// Rollup may emit beside index.html or under assets/, depending on the name templates,
// so look in both rather than assuming one.
const searchDirs = [OUT_DIR, join(OUT_DIR, 'assets')].filter((d) => existsSync(d));
const emitted = searchDirs.flatMap((dir) =>
  readdirSync(dir).map((name) => ({ name, path: join(dir, name) })),
);
const cssFile = emitted.find((f) => f.name.endsWith('.css'));
const jsFile = emitted.find((f) => f.name.endsWith('.js'));
if (!jsFile) fail('no JS bundle was emitted.');

/** Escape a filename for use inside a RegExp (the dot before the extension). */
const rx = (name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Every replacement below passes a FUNCTION rather than a string. A replacement string
// gives `$&`, `$'` and friends special meaning, and minified bundles are full of `$` —
// which silently re-inserted the original <script src> tag into its own replacement and
// left the page still pointing at a file that was about to be deleted.
if (cssFile) {
  const css = readFileSync(cssFile.path, 'utf8');
  html = html.replace(
    new RegExp(`\\s*<link[^>]*href="[^"]*${rx(cssFile.name)}"[^>]*>`),
    () => `\n    <style>\n${css}\n    </style>`,
  );
}

const jsName = jsFile.name;
const js = readFileSync(jsFile.path, 'utf8');
// The closing tag of an inline script cannot appear in its own text.
const safeJs = js.replace(/<\/script>/gi, '<\\/script>');

// Drop the original tag and re-add the code at the END OF BODY rather than in place.
// Vite puts the script in <head>, which is fine for `type="module"` because modules are
// deferred — but an inline classic script is not, so left in <head> it runs before
// <div id="root"> has been parsed and dies with "Root element #root not found".
html = html.replace(
  new RegExp(`\\s*<script[^>]*src="[^"]*${rx(jsName)}"[^>]*>\\s*</script>`),
  () => '',
);
html = html.replace(/<\/body>/i, () => `  <script>\n${safeJs}\n    </script>\n  </body>`);

if (!/<script>[\s\S]*<\/body>/i.test(html)) fail('the bundle did not land inside <body>.');

if (html.includes(jsName)) fail('the script tag was not inlined — check the build output.');

// --- 3. Sprite paths -> data URIs -------------------------------------------
let inlined = 0;
for (const dir of SPRITE_DIRS) {
  if (!existsSync(dir)) continue;
  const folder = dir.split(/[\\/]/).pop(); // "bodies" | "heads"
  for (const file of readdirSync(dir)) {
    const mime = MIME[extname(file).toLowerCase()];
    if (!mime) continue; // skips CREDITS.md and anything else non-image
    const dataUri = `data:${mime};base64,${readFileSync(join(dir, file)).toString('base64')}`;
    // Matches both "/sprites/<folder>/x.jpg" and "./sprites/<folder>/x.jpg".
    const pattern = new RegExp(`\\.?/sprites/${folder}/${rx(file)}`, 'g');
    const before = html;
    html = html.replace(pattern, () => dataUri);
    if (html !== before) inlined += 1;
  }
}

const leftover = html.match(/["'(]\.?\/(assets|sprites)\//);
if (leftover) fail(`an external reference survived: ${leftover[0]} — it would 404 on file://`);

// --- 4. One file out ---------------------------------------------------------
writeFileSync(FINAL, html);
// Leave exactly one file behind, so there is no ambiguity about what to upload.
const strays = ['assets', 'index.html', 'sprites', jsName, cssFile?.name].filter(Boolean);
for (const stray of strays) {
  rmSync(join(OUT_DIR, stray), { recursive: true, force: true });
}

const mb = (Buffer.byteLength(html) / 1024 / 1024).toFixed(2);
console.log(`\n[build-offline] ${FINAL}`);
console.log(`[build-offline] ${mb} MB, ${inlined} sprites inlined, zero external requests.`);
console.log('[build-offline] Double-click it, or drop it in Drive for others to download.\n');
