// src/App.tsx
// Application shell for the location-aware-exhibit-discovery feature.
//
// Responsibilities:
//  - Wrap the tree in LocationProvider so all children share location state.
//  - Render the always-visible, sticky DemoLocationSimulator (Req 2.1, 2.7).
//  - Show the FallbackNotification when geolocation fell back to a default
//    location, until the user dismisses it (Req 5.4).
//  - Provide simple tab navigation between the "Nearby Exhibit" and
//    "Facilities" views (Req 3.1, 4.1).

import { useState, type CSSProperties } from 'react';

import { LocationProvider, useLocationContext } from './context/LocationContext';
import { CaptureProvider, useCapture } from './context/CaptureContext';
import { QuestlineProvider, useQuestline } from './context/QuestlineContext';
import { DemoLocationSimulator } from './components/DemoLocationSimulator';
import { FallbackNotification } from './components/FallbackNotification';
import { NearbyExhibitCard } from './components/NearbyExhibitCard';
import { TakePhotoButton } from './components/TakePhotoButton';
import { ResultScreen } from './components/ResultScreen';
import { CollectionView } from './components/CollectionView';
import { FacilitiesTab } from './components/FacilitiesTab';
import { FoodWebSimulator } from './components/FoodWebSimulator';
import { DiningTab } from './components/DiningTab';
// Phase 6 (sprite-generation): the "My Collected Animals" gallery. It consumes
// useCapture() + useSpriteGeneration() internally, so it shares the same
// CaptureProvider collection instance and persistence (Req 5.1, 6.3).
import { GalleryView } from './components/GalleryView';

// Phase 5 (questline-progress): the persistent Progress Bar and the completion
// Redemption Voucher overlay. These consume useQuestline() from the
// QuestlineProvider wired in App() below (Req 1.1, 2.1, 2.7, 3.2).
import { ProgressBar } from './components/ProgressBar';
import { RedemptionVoucherScreen } from './components/RedemptionVoucherScreen';

// Phase 3 (audio-polish) enhancements. These wrap/augment the existing Phase
// 1/2 components without modifying their internals; if any throw, the
// AudioPolishBoundary falls back to the plain baseline component (Req 5.4).
import { AudioPolishBoundary } from './components/AudioPolishBoundary';
import { CardTransitionWrapper } from './components/CardTransitionWrapper';
import { RadarRing } from './components/RadarRing';
import { SoundTrigger } from './components/SoundTrigger';
import { FoodWebFadeWrapper } from './components/FoodWebFadeWrapper';
import { useAudioEngine } from './hooks/useAudioEngine';

// mandai.js is a plain JS data module (allowJs). Cast to the typed shape,
// mirroring the pattern used by the other consumer components.
import { exhibits as rawExhibits } from './data/mandai.js';
import type { Exhibit } from './types';

// Phase 7 (visual-theme): shared inline-style tokens for the "Mandai Echoes"
// look. Styling-only; no behavior change.
import { colors, radius, shadow, space, font, gradients } from './theme';

const exhibits = rawExhibits as Exhibit[];

type Tab =
  | 'exhibit'
  | 'facilities'
  | 'foodweb'
  | 'dining'
  | 'collection'
  | 'myanimals';

/**
 * Inner shell rendered inside the LocationProvider so it can consume the
 * location context (needed for the fallback notification flag).
 */
function AppShell() {
  const { fallbackNotificationVisible, nearestExhibit } = useLocationContext();
  // Phase 4 (checkpoint-photo-capture): the capture flow's phase/result drive
  // the Result Screen overlay and the error / camera-unavailable messages.
  const { phase, result, cameraUnavailable, dismissResult } = useCapture();
  // Phase 5 (questline-progress): completion decisioning for the voucher
  // overlay. The Progress Bar consumes the same provider internally (Req 2.1,
  // 2.7, 3.2).
  const { showVoucher, prizeLabel, voucherCode, markRedeemed } = useQuestline();
  const [activeTab, setActiveTab] = useState<Tab>('exhibit');
  const [dismissed, setDismissed] = useState(false);

  // Phase 3 (audio-polish) wiring. Derive the display state used by the card
  // transition, radar ring, and sound trigger from the nearest exhibit.
  const audioEngine = useAudioEngine();
  const isExhibitVisible = nearestExhibit !== null;
  const exhibitId = nearestExhibit?.exhibit.id ?? null;
  const exhibitName = nearestExhibit?.exhibit.name ?? null;

  const showFallback = fallbackNotificationVisible && !dismissed;

  // Tab button styling. IMPORTANT: use only individual border properties (never
  // the `border` shorthand together with `borderBottom`) so React does not warn
  // about mixing shorthand and longhand style properties during re-render.
  const tabStyle = (active: boolean): CSSProperties => ({
    flex: '1 1 auto',
    minWidth: '7rem',
    padding: '0.5rem 1rem',
    cursor: 'pointer',
    fontWeight: active ? 700 : 500,
    fontFamily: font.family,
    color: active ? colors.white : colors.forestGreen,
    backgroundColor: active ? colors.green : colors.leafTint,
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: active ? colors.green : colors.sandDark,
    borderRadius: radius.pill,
    transition: 'background-color 0.2s ease, color 0.2s ease',
  });

  return (
    <div
      style={{
        maxWidth: 640,
        margin: '0 auto',
        fontFamily: font.family,
        backgroundColor: colors.cream,
        color: colors.textDark,
        boxShadow: shadow.card,
        borderRadius: radius.lg,
        overflow: 'hidden',
        minHeight: '100vh',
      }}
    >
      {/* Phase 7: decorative brand header. Scrolls above the sticky simulator,
          which keeps its own position: sticky behavior below. */}
      <header
        style={{
          background: gradients.forest,
          color: colors.white,
          padding: `${space.lg}px ${space.lg}px`,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            letterSpacing: '0.02em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
          }}
        >
          <span aria-hidden="true">🌿</span>
          <span>Mandai Echoes</span>
          <span aria-hidden="true">🐾</span>
        </div>
        <div
          style={{
            fontSize: '0.8125rem',
            fontWeight: 600,
            opacity: 0.92,
            marginTop: '0.25rem',
          }}
        >
          Discover • Collect • Play
        </div>
      </header>

      <DemoLocationSimulator />

      <FallbackNotification
        visible={showFallback}
        onDismiss={() => setDismissed(true)}
      />

      {/* Phase 5: persistent questline Progress Bar above the tabs so it stays
          visible regardless of the active tab (Req 1.1). */}
      <ProgressBar />

      <nav
        role="tablist"
        aria-label="Views"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          padding: '0.75rem 1rem',
        }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'exhibit'}
          onClick={() => setActiveTab('exhibit')}
          style={tabStyle(activeTab === 'exhibit')}
        >
          Nearby Exhibit
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'facilities'}
          onClick={() => setActiveTab('facilities')}
          style={tabStyle(activeTab === 'facilities')}
        >
          Facilities
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'foodweb'}
          onClick={() => setActiveTab('foodweb')}
          style={tabStyle(activeTab === 'foodweb')}
        >
          Food Web
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'dining'}
          onClick={() => setActiveTab('dining')}
          style={tabStyle(activeTab === 'dining')}
        >
          Dining
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'collection'}
          onClick={() => setActiveTab('collection')}
          style={tabStyle(activeTab === 'collection')}
        >
          Collection
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'myanimals'}
          onClick={() => setActiveTab('myanimals')}
          style={tabStyle(activeTab === 'myanimals')}
        >
          My Animals
        </button>
      </nav>

      <main style={{ padding: '0 1rem 1rem' }}>
        {activeTab === 'exhibit' && (
          // Phase 3: compose the audio/visual polish around the baseline card.
          // If any Phase 3 enhancement throws, the boundary falls back to the
          // plain NearbyExhibitCard so the baseline experience is preserved
          // (Req 5.4).
          <AudioPolishBoundary fallback={<NearbyExhibitCard />}>
            <CardTransitionWrapper
              isVisible={isExhibitVisible}
              contentKey={exhibitId}
            >
              <div style={{ position: 'relative' }}>
                {/* Radar ring pulses behind the card content (Req 2.1, 2.3). */}
                <RadarRing visible={isExhibitVisible} />

                {/* Phase 1 card, unchanged. */}
                <NearbyExhibitCard />

                {/* Phase 4: capture trigger. Enabled only when in range; it
                    consumes the location + capture contexts internally. */}
                <TakePhotoButton />

                {/* Sound trigger only when an audio API is available. */}
                {audioEngine && (
                  <SoundTrigger
                    exhibitName={exhibitName}
                    audioEngine={audioEngine}
                  />
                )}
              </div>
            </CardTransitionWrapper>
          </AudioPolishBoundary>
        )}
        {activeTab === 'facilities' && <FacilitiesTab />}
        {activeTab === 'foodweb' && (
          // Phase 3: fade the food web in/out. Falls back to the plain
          // simulator if the fade wrapper throws (Req 4.1, 5.4).
          <AudioPolishBoundary
            fallback={<FoodWebSimulator exhibits={exhibits} />}
          >
            <FoodWebFadeWrapper>
              <FoodWebSimulator exhibits={exhibits} />
            </FoodWebFadeWrapper>
          </AudioPolishBoundary>
        )}
        {activeTab === 'dining' && <DiningTab />}
        {activeTab === 'collection' && <CollectionView />}
        {/* Phase 6: the "My Collected Animals" gallery. Shares the same
            CaptureProvider collection instance and drives lazy sprite
            generation while open (Req 5.1, 6.3). */}
        {activeTab === 'myanimals' && <GalleryView />}
      </main>

      {/* Phase 4: Result Screen overlay after a successful tag (Req 6.1, 7.3). */}
      {phase === 'result' && result !== null && (
        <ResultScreen result={result} onDismiss={dismissResult} />
      )}

      {/* Phase 4: no exhibit could be tagged — retain the image, offer dismiss
          (Req 4.5). */}
      {phase === 'error' && (
        <CaptureMessageOverlay
          message="No exhibit could be tagged. Move closer to an exhibit and try again."
          onDismiss={dismissResult}
        />
      )}

      {/* Phase 4: camera could not be opened (Req 1.7). */}
      {cameraUnavailable && (
        <CaptureMessageOverlay
          message="Camera unavailable. Please check your device camera and permissions."
          onDismiss={dismissResult}
        />
      )}

      {/* Phase 5: the Redemption Voucher overlay shows once the questline is
          complete and the voucher has not been redeemed (Req 2.1, 2.7, 3.2). */}
      {showVoucher && voucherCode !== null && (
        <RedemptionVoucherScreen
          prizeLabel={prizeLabel}
          voucherCode={voucherCode}
          onMarkRedeemed={markRedeemed}
        />
      )}
    </div>
  );
}

/**
 * Minimal dismissible message overlay used for the non-blocking capture
 * notices (no exhibit could be tagged, camera unavailable). Kept intentionally
 * simple so it never obscures or blocks the underlying app beyond a dismissible
 * banner (Req 1.7, 4.5).
 */
function CaptureMessageOverlay({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div
      role="alertdialog"
      aria-label="Capture notice"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        margin: '0 auto',
        maxWidth: 640,
        background: '#fff3e0',
        borderTop: '1px solid #ffb74d',
        color: '#5d4037',
        zIndex: 1000,
      }}
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        style={{
          flexShrink: 0,
          padding: '0.4rem 0.9rem',
          cursor: 'pointer',
          fontWeight: 600,
          border: 'none',
          borderRadius: '0.375rem',
          background: '#ef6c00',
          color: '#ffffff',
        }}
      >
        Dismiss
      </button>
    </div>
  );
}

/**
 * Root application component. Provides location state to the whole tree.
 */
export function App() {
  return (
    <LocationProvider>
      <CaptureProvider>
        <QuestlineProvider>
          <AppShell />
        </QuestlineProvider>
      </CaptureProvider>
    </LocationProvider>
  );
}

export default App;
