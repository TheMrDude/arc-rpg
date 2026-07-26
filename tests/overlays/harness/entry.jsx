import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import Overlay, { overlayTone } from '@/app/components/Overlay';
import {
  useOverlaySlot, OVERLAY_PRIORITY, resetQueue, queueSnapshot, currentHolder,
} from '@/lib/overlayQueue';
import { scrollLockDepth } from '@/lib/scrollLock';

// Three queued overlays at different priorities, so the test can prove that only
// the best one is ever in the DOM.
function Queued({ id, priority, active, title, children }) {
  const visible = useOverlaySlot(id, priority, active);
  return (
    <Overlay open={visible} onClose={() => window.__close(id)} title={title}>
      <div data-testid={`body-${id}`}>{children}</div>
    </Overlay>
  );
}

function App() {
  const [open, setOpen] = useState({});
  const [tall, setTall] = useState(false);
  const [tone, setTone] = useState('light');

  window.__open = (id) => setOpen((o) => ({ ...o, [id]: true }));
  window.__close = (id) => setOpen((o) => ({ ...o, [id]: false }));
  window.__setTall = setTall;
  window.__setTone = setTone;
  window.__reset = () => { resetQueue(); setOpen({}); };
  window.__queue = () => ({ snapshot: queueSnapshot(), holder: currentHolder() });
  window.__lockDepth = () => scrollLockDepth();

  return (
    <div>
      {/* Tall page so body scroll is meaningful. */}
      <div style={{ height: '400vh', padding: 20 }}>
        <button onClick={() => window.__open('solo')}>open solo</button>
        <p>page content</p>
      </div>

      {/* Plain shell, the subject of the invariant assertions. */}
      <Overlay
        open={!!open.solo}
        onClose={() => window.__close('solo')}
        title="Solo overlay"
        tone={tone}
      >
        <p data-testid="solo-text">Readable body copy in the overlay.</p>
        <p style={{ color: overlayTone(tone).muted }} data-testid="solo-muted">
          Muted secondary line.
        </p>
        {/* Proves the detector is live: a raw Tailwind text utility inside the
            portal, which is how DiceRoll ended up at 1.2:1. Only mounted when the
            negative test asks for it. */}
        {window.__showHazard && (
          <p className="text-navy/60" data-testid="hazard-text">Hazardous muted line.</p>
        )}
        {tall && (
          <div data-testid="tall-content">
            {Array.from({ length: 60 }, (_, i) => (
              <p key={i}>Filler line {i} to force the body past the viewport height.</p>
            ))}
            <button data-testid="deep-button">Deep action</button>
          </div>
        )}
      </Overlay>

      <Queued id="ask" priority={OVERLAY_PRIORITY.ASK} active={!!open.ask} title="An upsell">
        upsell
      </Queued>
      <Queued id="narrative" priority={OVERLAY_PRIORITY.NARRATIVE} active={!!open.narrative} title="A story beat">
        narrative
      </Queued>
      <Queued id="reward" priority={OVERLAY_PRIORITY.REWARD} active={!!open.reward} title="You earned it">
        reward
      </Queued>
      <Queued id="user" priority={OVERLAY_PRIORITY.USER} active={!!open.user} title="You asked for this">
        user
      </Queued>
    </div>
  );
}
createRoot(document.getElementById('root')).render(<App />);
