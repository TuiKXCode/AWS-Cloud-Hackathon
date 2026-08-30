import TycoonGame from './components/tycoon/TycoonGame.jsx';

/**
 * Phase 7 prototype harness.
 *
 * The shipping app mounts <TycoonGame /> inside its own tab alongside Phases 1-6.
 * Until those exist, the tycoon game *is* the app. Nothing else is scaffolded here
 * on purpose.
 */
export default function App() {
  return (
    <div className="h-full bg-gradient-to-b from-emerald-950 via-emerald-900 to-stone-900">
      <TycoonGame />
    </div>
  );
}
