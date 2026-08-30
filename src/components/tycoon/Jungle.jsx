import React, { memo } from 'react';

/**
 * The jungle the restaurant sits in: grass, the dirt path guests arrive along, a dense
 * canopy band around the edges, and palms standing on the margins.
 *
 * Two different scaling strategies on purpose. The soft stuff (grass, bush clusters, path)
 * is drawn in one SVG with `preserveAspectRatio="none"` so it always fills the frame
 * exactly — organic blobs do not mind being stretched. The palms and big leaves are
 * separate, absolutely positioned SVGs with a fixed `aspectRatio`, because a stretched
 * palm frond immediately reads as wrong.
 *
 * Path, canopy gaps and foliage positions all come from the layout, so the portrait board
 * gets a path down its right-hand side rather than across its top.
 */
function Jungle({ layout }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <GroundAndCanopy paths={layout.paths} gaps={layout.canopyGaps} />

      {layout.palms.map((palm) => (
        <PalmTree key={`palm-${palm.x}-${palm.y}`} {...palm} />
      ))}

      {layout.leaves.map((leaf) => (
        <BigLeaf key={`leaf-${leaf.x}-${leaf.y}`} {...leaf} />
      ))}
    </div>
  );
}

export default memo(Jungle);

function inAnyGap(value, ranges = []) {
  return ranges.some(([from, to]) => value >= from && value <= to);
}

/**
 * Grass, the dirt paths, and the layered bush band around the perimeter.
 *
 * The band is built by walking the four edges and dropping circles of varying radius, then
 * overprinting lighter tones on a subset so the mass gets highlights instead of reading as
 * one flat silhouette. Clusters are skipped where a path crosses the edge, so the arrival
 * route emerges through a gap in the leaves rather than from under them.
 */
const GroundAndCanopy = memo(function GroundAndCanopy({ paths, gaps }) {
  const clusters = [];

  for (let i = 0; i < 46; i += 1) {
    const t = -2 + i * 2.3;
    if (!inAnyGap(t, gaps.top)) {
      clusters.push({ cx: t, cy: 1.4 + (i % 5) * 1.5, r: 3 + ((i * 7) % 5) * 0.7 });
    }
    if (!inAnyGap(t, gaps.bottom)) {
      clusters.push({ cx: t + 1.1, cy: 98.6 - (i % 5) * 1.5, r: 3 + ((i * 5) % 5) * 0.7 });
    }
  }
  for (let i = 0; i < 30; i += 1) {
    const t = -2 + i * 3.6;
    if (!inAnyGap(t, gaps.left)) {
      clusters.push({ cx: 1.3 + (i % 5) * 1.4, cy: t, r: 3 + ((i * 3) % 5) * 0.65 });
    }
    if (!inAnyGap(t, gaps.right)) {
      clusters.push({ cx: 98.7 - (i % 5) * 1.4, cy: t + 1.6, r: 3 + ((i * 11) % 5) * 0.65 });
    }
  }

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full"
    >
      <defs>
        <linearGradient id="grass-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2F6B2E" stopOpacity="0.55" />
          <stop offset="45%" stopColor="#4C9A44" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#2C6329" stopOpacity="0.5" />
        </linearGradient>
      </defs>

      {/* grass */}
      <rect x="0" y="0" width="100" height="100" fill="#3F8A3C" />
      <rect x="0" y="0" width="100" height="100" fill="url(#grass-grad)" />

      {/* dirt the guests arrive along */}
      {paths.map((path, index) => (
        <rect
          key={`path-${index}`}
          x={path.left}
          y={path.top}
          width={path.right - path.left}
          height={path.bottom - path.top}
          fill="#C2A176"
        />
      ))}

      {/* scuffs so the dirt is not a flat slab */}
      <g fill="#A98757" opacity="0.5">
        {paths.map((path, index) => {
          const cx = (path.left + path.right) / 2;
          const cy = (path.top + path.bottom) / 2;
          return (
            <g key={`scuff-${index}`}>
              <ellipse cx={cx} cy={cy} rx="2.8" ry="1.3" />
              <ellipse cx={cx - 3} cy={cy + 6} rx="2" ry="1.1" />
              <ellipse cx={cx + 3} cy={cy - 7} rx="2.2" ry="1.2" />
            </g>
          );
        })}
      </g>

      {/* canopy band: dark mass, mid tone, then a few bright leaves */}
      <g fill="#14532D">
        {clusters.map((c, i) => (
          <circle key={`d-${i}`} cx={c.cx} cy={c.cy} r={c.r * 1.2} />
        ))}
      </g>
      <g fill="#186B34">
        {clusters.map((c, i) =>
          i % 2 === 0 ? (
            <circle key={`m-${i}`} cx={c.cx + 0.5} cy={c.cy - 0.5} r={c.r * 0.86} />
          ) : null
        )}
      </g>
      <g fill="#2C8F44">
        {clusters.map((c, i) =>
          i % 3 === 0 ? (
            <circle key={`l-${i}`} cx={c.cx - 0.4} cy={c.cy + 0.4} r={c.r * 0.55} />
          ) : null
        )}
      </g>
      <g fill="#49B45C" opacity="0.55">
        {clusters.map((c, i) =>
          i % 7 === 0 ? <circle key={`h-${i}`} cx={c.cx} cy={c.cy} r={c.r * 0.34} /> : null
        )}
      </g>
    </svg>
  );
});

/**
 * One palm: a tapered, slightly curved trunk with ringed bark and seven fronds.
 *
 * Anchored bottom-centre at (x, y) and sized by height only, so the aspect ratio holds
 * whatever shape the scene box is.
 */
const PalmTree = memo(function PalmTree({ x, y, h, flip = false }) {
  return (
    <svg
      viewBox="0 0 120 200"
      className="absolute"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        height: `${h}%`,
        aspectRatio: '120 / 200',
        transform: `translate(-50%, -100%)${flip ? ' scaleX(-1)' : ''}`,
        transformOrigin: '50% 100%',
      }}
    >
      {/* trunk */}
      <path
        d="M52 200 Q48 140 56 96 Q60 72 66 58 L78 60 Q70 78 68 100 Q64 148 70 200 Z"
        fill="#8A5A2B"
      />
      <path
        d="M52 200 Q48 140 56 96 Q60 72 66 58 L71 59 Q62 80 60 102 Q56 150 61 200 Z"
        fill="#A06E38"
      />
      <g stroke="#6B4423" strokeWidth="2.4" opacity="0.5" strokeLinecap="round">
        <path d="M53 186 Q61 183 69 186" />
        <path d="M52 168 Q60 165 68 168" />
        <path d="M53 150 Q61 147 68 150" />
        <path d="M55 132 Q62 129 68 132" />
        <path d="M57 114 Q63 111 68 114" />
        <path d="M59 96 Q64 93 69 96" />
        <path d="M62 78 Q66 75 71 78" />
      </g>

      {/* fronds — each one a leaf blade with a darker spine */}
      <g transform="translate(72 58)">
        {[-152, -118, -84, -52, -22, 12, 40].map((angle, index) => (
          <g key={angle} transform={`rotate(${angle})`}>
            <path
              d="M0 0 Q30 -16 62 -6 Q34 12 0 8 Z"
              fill={index % 2 === 0 ? '#1E7A38' : '#25913F'}
            />
            <path d="M0 2 Q32 -8 60 -5" stroke="#14532D" strokeWidth="2" fill="none" />
          </g>
        ))}
        <circle cx="0" cy="0" r="7" fill="#6B4423" />
        {/* coconuts */}
        <circle cx="-6" cy="9" r="4.5" fill="#7A4E22" />
        <circle cx="3" cy="12" r="4.5" fill="#8A5A2B" />
      </g>
    </svg>
  );
});

/** A single broad understorey leaf, for filling gaps along the frame. */
const BigLeaf = memo(function BigLeaf({ x, y, h, rotate = 0 }) {
  return (
    <svg
      viewBox="0 0 90 120"
      className="absolute"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        height: `${h}%`,
        aspectRatio: '90 / 120',
        transform: `translate(-50%, -100%) rotate(${rotate}deg)`,
        transformOrigin: '50% 100%',
      }}
    >
      <path d="M45 120 Q42 84 44 60" stroke="#1B6B30" strokeWidth="5" fill="none" />
      <path d="M45 62 Q6 54 10 22 Q16 -4 45 6 Q74 -4 80 22 Q84 54 45 62 Z" fill="#23883C" />
      <path d="M45 60 V8" stroke="#14532D" strokeWidth="3" />
      <g stroke="#14532D" strokeWidth="2" opacity="0.55">
        <path d="M45 20 L22 14" />
        <path d="M45 32 L18 28" />
        <path d="M45 44 L20 44" />
        <path d="M45 20 L68 14" />
        <path d="M45 32 L72 28" />
        <path d="M45 44 L70 44" />
      </g>
    </svg>
  );
});
