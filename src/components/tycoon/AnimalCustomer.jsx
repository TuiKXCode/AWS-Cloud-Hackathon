import { memo } from 'react';
import { CUSTOMER_STATE, bubbleAnchorFor, clampToScene } from '../../game/constants.js';
import { AnimalAvatarGroup } from './AnimalAvatar.jsx';
import OrderBubble from './OrderBubble.jsx';

const SEATED_STATES = new Set([
  CUSTOMER_STATE.SEATED,
  CUSTOMER_STATE.ORDERING,
  CUSTOMER_STATE.EATING,
]);

/**
 * One animal customer: a chibi body in its species colours with a drawn head.
 *
 * Two poses, no in-between frames. Walking to or from a chair it is drawn standing, with a
 * simple leg swing. Once it is at the table it switches to a seated pose — legs and tail
 * dropped, forearms resting forward — and drops behind the table top in the depth stack, so
 * the furniture hides the half of the body that would be under the table anyway. That
 * single swap is what buys the reference's "animals sitting at tables" look without any
 * sit-down animation.
 */
function AnimalCustomer({
  layout,
  customer,
  exhibit,
  photoSrc,
  isSelected,
  isServeTarget,
  onSelect,
}) {
  const palette = exhibit?.palette ?? { fur: '#D8A263', dark: '#8C4A0C', belly: '#F5E4C8' };
  const seated = SEATED_STATES.has(customer.state);
  const swing = customer.moving ? Math.sin(customer.walkPhase) * 16 : 0;
  const bob = customer.moving ? -Math.abs(Math.sin(customer.walkPhase)) * 2 : 0;
  const depth = 0.9 + (customer.y / 100) * 0.22;

  const isWaiting = customer.state === CUSTOMER_STATE.ORDERING;
  const isEating = customer.state === CUSTOMER_STATE.EATING;
  const isAngry = customer.state === CUSTOMER_STATE.STORMING;
  const selectable = isWaiting && !customer.awaitingDelivery;

  const body = (
    <>
      {isWaiting && customer.order ? (
        <OrderBubble
          order={customer.order}
          exhibit={exhibit}
          photoSrc={photoSrc}
          patience={customer.patience}
          mood={customer.mood}
          anchor={bubbleAnchorFor(layout, customer.x)}
          isSelected={isSelected}
          isServeTarget={isServeTarget}
          awaitingDelivery={customer.awaitingDelivery}
        />
      ) : null}

      {isEating ? (
        <div className="absolute inset-x-0 top-[6%] text-center text-[10px] leading-none sm:text-sm">
          <span className="animate-pulse" aria-hidden="true">
            ✨
          </span>
        </div>
      ) : null}

      {isAngry ? (
        <div
          className="absolute inset-x-0 top-0 text-center text-xs leading-none sm:text-base"
          aria-hidden="true"
        >
          💢
        </div>
      ) : null}

      <svg
        viewBox="0 0 100 130"
        className="h-full w-full overflow-visible"
        style={{ transform: customer.facing === -1 ? 'scaleX(-1)' : 'none' }}
        aria-hidden="true"
      >
        {seated ? null : <ellipse cx="50" cy="126" rx="19" ry="4" fill="rgba(0,0,0,0.25)" />}

        {isSelected ? (
          <circle
            cx="50"
            cy="44"
            r="38"
            fill="none"
            stroke="#FBBF24"
            strokeWidth="4"
            className="animate-pulse"
          />
        ) : null}

        <g transform={`translate(0 ${seated ? 8 : bob})`}>
          {seated ? null : (
            <>
              {/* tail */}
              <path
                d="M70 92 Q80 88 78 76"
                stroke={palette.dark}
                strokeWidth="5"
                strokeLinecap="round"
                fill="none"
              />
              {/* legs */}
              <g transform={`rotate(${swing} 42 100)`}>
                <rect x="38" y="97" width="8.5" height="21" rx="4" fill={palette.dark} />
                <ellipse cx="42" cy="119" rx="6.5" ry="3.6" fill={palette.dark} />
              </g>
              <g transform={`rotate(${-swing} 58 100)`}>
                <rect x="53.5" y="97" width="8.5" height="21" rx="4" fill={palette.dark} />
                <ellipse cx="58" cy="119" rx="6.5" ry="3.6" fill={palette.dark} />
              </g>
            </>
          )}

          {/* torso + chest patch */}
          <rect x="30" y="60" width="40" height="48" rx="19" fill={palette.fur} />
          <ellipse cx="50" cy="86" rx="12" ry="13" fill={palette.belly ?? '#F5E4C8'} />

          {/* arms — folded forward onto the table when seated */}
          <rect
            x="22"
            y="68"
            width="9.5"
            height="26"
            rx="4.75"
            fill={palette.dark}
            transform={`rotate(${seated ? -48 : swing * 0.5} 26.75 72)`}
          />
          <rect
            x="68.5"
            y="68"
            width="9.5"
            height="26"
            rx="4.75"
            fill={palette.dark}
            transform={`rotate(${seated ? 48 : -swing * 0.5} 73.25 72)`}
          />

          <g transform="translate(50 40)">
            <AnimalAvatarGroup exhibit={exhibit} photoSrc={photoSrc} radius={28} />
          </g>
        </g>
      </svg>
    </>
  );

  // Sized by width, not height: a share of the height means a very different sprite in a 16:9
  // box than in a 9:16 one.
  const style = {
    left: `${clampToScene(layout, customer.x)}%`,
    top: `${customer.y}%`,
    width: `${layout.spriteWidth.customer}%`,
    aspectRatio: '100 / 130',
    transformOrigin: '50% 100%',
    transform: `translate(-50%, -100%) scale(${depth})`,
    zIndex: Math.round((customer.y - (seated ? layout.seatedZLift : 0)) * 10),
  };

  if (!selectable) {
    return (
      <div className="pointer-events-none absolute" style={style}>
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(customer.id)}
      className="absolute cursor-pointer rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
      style={style}
      aria-label={`${exhibit?.name ?? 'Customer'} wants ${customer.order?.name ?? 'an order'}${
        isSelected ? ' (selected)' : ''
      }`}
      aria-pressed={isSelected}
    >
      {body}
    </button>
  );
}

export default memo(AnimalCustomer);
