/**
 * Drawn animal faces, one per exhibit, in the style of the reference art.
 *
 * These are vector rather than emoji on purpose: emoji inside an SVG <text> element does
 * not size reliably across browsers (it rendered as a speck at the intended font size),
 * and the references show drawn characters anyway.
 *
 * Everything is drawn centred on (0, 0) inside a head of radius 30, so the caller can
 * scale it with a single transform.
 *
 * Split into two halves so a real photo can be dropped in between them:
 *   FaceBehind — ears, mane, horns: the silhouette that identifies the species
 *   FaceFront  — eyes, muzzle, markings: skipped when a photo takes the face's place
 */

const EYE = '#2A1A0C';

export function FaceBehind({ exhibit }) {
  const { fur, dark } = exhibit?.palette ?? { fur: '#D8A263', dark: '#8C4A0C' };

  switch (exhibit?.id) {
    case 'lion':
      return (
        <g>
          <circle cx="-19" cy="-19" r="8" fill={dark} />
          <circle cx="19" cy="-19" r="8" fill={dark} />
          <path d={MANE_OUTER} fill="#8C4A0C" />
          <path d={MANE_INNER} fill="#B36514" />
        </g>
      );

    case 'malayan-tiger':
      return (
        <g>
          <circle cx="-21" cy="-20" r="9" fill={dark} />
          <circle cx="21" cy="-20" r="9" fill={dark} />
          <circle cx="-21" cy="-20" r="4.5" fill="#7C4A12" />
          <circle cx="21" cy="-20" r="4.5" fill="#7C4A12" />
        </g>
      );

    case 'giant-panda':
      return (
        <g>
          <circle cx="-21" cy="-21" r="9" fill="#27272A" />
          <circle cx="21" cy="-21" r="9" fill="#27272A" />
        </g>
      );

    case 'asian-elephant':
      return (
        <g>
          {/* big ears fanning out either side */}
          <ellipse cx="-25" cy="-2" rx="13" ry="19" fill={dark} />
          <ellipse cx="25" cy="-2" rx="13" ry="19" fill={dark} />
          <ellipse cx="-24" cy="-2" rx="8" ry="13" fill="#B6BCC4" />
          <ellipse cx="24" cy="-2" rx="8" ry="13" fill="#B6BCC4" />
        </g>
      );

    case 'flamingo':
      return (
        <g>
          {/* head tuft */}
          <path
            d="M-6 -28 Q0 -38 7 -27"
            stroke={dark}
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      );

    case 'giraffe':
      return (
        <g>
          {/* ossicones */}
          <rect x="-15" y="-38" width="5" height="14" rx="2.5" fill={dark} />
          <rect x="10" y="-38" width="5" height="14" rx="2.5" fill={dark} />
          <circle cx="-12.5" cy="-38" r="4" fill="#6B4A12" />
          <circle cx="12.5" cy="-38" r="4" fill="#6B4A12" />
          {/* ears */}
          <ellipse cx="-26" cy="-14" rx="8" ry="5" fill={dark} transform="rotate(-25 -26 -14)" />
          <ellipse cx="26" cy="-14" rx="8" ry="5" fill={dark} transform="rotate(25 26 -14)" />
        </g>
      );

    case 'pygmy-hippo':
    default:
      return (
        <g>
          <circle cx="-17" cy="-24" r="6.5" fill={dark} />
          <circle cx="17" cy="-24" r="6.5" fill={dark} />
          <circle cx="-17" cy="-24" r="3" fill={fur} />
          <circle cx="17" cy="-24" r="3" fill={fur} />
        </g>
      );
  }
}

export function FaceFront({ exhibit }) {
  const { fur, dark, belly } = exhibit?.palette ?? {
    fur: '#D8A263',
    dark: '#8C4A0C',
    belly: '#F5E4C8',
  };

  switch (exhibit?.id) {
    case 'lion':
      return (
        <g>
          <ellipse cx="0" cy="-8" rx="18" ry="10" fill="#F0BA6C" />
          <ellipse cx="0" cy="10" rx="15" ry="11" fill={belly} />
          <Eyes y={-5} />
          <path d="M-4.5 4 L4.5 4 L0 8.5 Z" fill="#5B2F10" />
          <Smile y={8.5} />
          <Whiskers stroke={dark} />
        </g>
      );

    case 'malayan-tiger':
      return (
        <g>
          {/* forehead stripes */}
          <g stroke="#5B2F10" strokeWidth="3" strokeLinecap="round">
            <path d="M-13 -20 L-11 -11" />
            <path d="M-4 -23 L-4 -14" />
            <path d="M4 -23 L4 -14" />
            <path d="M13 -20 L11 -11" />
            <path d="M-24 -4 L-17 -3" />
            <path d="M24 -4 L17 -3" />
          </g>
          <ellipse cx="0" cy="10" rx="16" ry="11" fill={belly} />
          <Eyes y={-4} />
          <path d="M-4.5 4 L4.5 4 L0 8.5 Z" fill="#5B2F10" />
          <Smile y={8.5} />
          <Whiskers stroke="#8C6136" />
        </g>
      );

    case 'giant-panda':
      return (
        <g>
          {/* the eye patches are the whole character */}
          <ellipse cx="-11" cy="-4" rx="9" ry="11" fill="#27272A" transform="rotate(-12 -11 -4)" />
          <ellipse cx="11" cy="-4" rx="9" ry="11" fill="#27272A" transform="rotate(12 11 -4)" />
          <circle cx="-10" cy="-4" r="3.4" fill="#FFFFFF" />
          <circle cx="10" cy="-4" r="3.4" fill="#FFFFFF" />
          <circle cx="-9.4" cy="-4.6" r="1.6" fill={EYE} />
          <circle cx="10.6" cy="-4.6" r="1.6" fill={EYE} />
          <ellipse cx="0" cy="10" rx="7" ry="4.5" fill="#27272A" />
          <Smile y={14} width={7} />
        </g>
      );

    case 'asian-elephant':
      return (
        <g>
          {/* trunk */}
          <path
            d="M0 4 Q-2 18 3 26 Q6 31 11 29"
            stroke={dark}
            strokeWidth="9"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M0 4 Q-2 18 3 26 Q6 31 11 29"
            stroke="#B6BCC4"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
            opacity="0.5"
          />
          {/* tusks */}
          <path d="M-9 12 Q-12 20 -9 24" stroke="#FEF9EC" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d="M9 12 Q12 20 9 24" stroke="#FEF9EC" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <Eyes y={-6} spread={11} />
        </g>
      );

    case 'flamingo':
      return (
        <g>
          <Eyes y={-6} spread={8} radius={3} />
          {/* hooked beak */}
          <path d="M-3 2 L16 8 Q22 10 20 16 Q14 18 8 13 L-3 9 Z" fill="#F2F2F2" />
          <path d="M14 12 Q22 11 20 16 Q16 17 13 14 Z" fill="#27272A" />
          <ellipse cx="0" cy="16" rx="9" ry="6" fill={fur} opacity="0.7" />
        </g>
      );

    case 'giraffe':
      return (
        <g>
          {/* patches */}
          <g fill={dark} opacity="0.55">
            <circle cx="-17" cy="-12" r="5.5" />
            <circle cx="16" cy="-14" r="5" />
            <circle cx="-20" cy="2" r="4.5" />
            <circle cx="20" cy="1" r="4.5" />
            <circle cx="0" cy="-19" r="5" />
          </g>
          <Eyes y={-5} spread={11} />
          {/* long muzzle */}
          <ellipse cx="0" cy="14" rx="13" ry="10" fill={belly} />
          <ellipse cx="-4.5" cy="12" rx="2" ry="2.6" fill="#6B4A12" />
          <ellipse cx="4.5" cy="12" rx="2" ry="2.6" fill="#6B4A12" />
          <Smile y={18} width={6} />
        </g>
      );

    case 'pygmy-hippo':
    default:
      return (
        <g>
          <Eyes y={-8} spread={11} />
          {/* wide snout */}
          <ellipse cx="0" cy="11" rx="18" ry="12" fill={belly} />
          <ellipse cx="-7" cy="7" rx="3" ry="3.6" fill={dark} />
          <ellipse cx="7" cy="7" rx="3" ry="3.6" fill={dark} />
          <path
            d="M-10 16 Q0 21 10 16"
            stroke={dark}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      );
  }
}

/* ------------------------------------------------------------ shared pieces */

function Eyes({ y = -5, spread = 9, radius = 3.4 }) {
  return (
    <g>
      <ellipse cx={-spread} cy={y} rx={radius} ry={radius * 1.12} fill={EYE} />
      <ellipse cx={spread} cy={y} rx={radius} ry={radius * 1.12} fill={EYE} />
      <circle cx={-spread + 1.2} cy={y - 1.4} r={radius * 0.34} fill="#FFFFFF" />
      <circle cx={spread + 1.2} cy={y - 1.4} r={radius * 0.34} fill="#FFFFFF" />
    </g>
  );
}

function Smile({ y = 9, width = 8 }) {
  return (
    <path
      d={`M${-width} ${y} Q0 ${y + 4.5} ${width} ${y}`}
      stroke="#5B2F10"
      strokeWidth="1.8"
      fill="none"
      strokeLinecap="round"
    />
  );
}

function Whiskers({ stroke }) {
  return (
    <g stroke={stroke} strokeWidth="1.1" strokeLinecap="round" opacity="0.75">
      <path d="M-14 9 L-24 7" />
      <path d="M-14 12 L-24 13" />
      <path d="M14 9 L24 7" />
      <path d="M14 12 L24 13" />
    </g>
  );
}

/** Star-shaped mane ring, built once at module scope. */
function spikedRing(spikes, inner, outer) {
  const points = [];
  for (let i = 0; i < spikes * 2; i += 1) {
    const angle = (Math.PI * i) / spikes;
    const radius = i % 2 === 0 ? outer : inner;
    points.push(`${(Math.cos(angle) * radius).toFixed(2)},${(Math.sin(angle) * radius).toFixed(2)}`);
  }
  return `M${points.join('L')}Z`;
}

const MANE_OUTER = spikedRing(17, 26, 37);
const MANE_INNER = spikedRing(17, 24, 32);
