import { STATE_LABEL, type AssistantState } from '../state/types';
import { useNow } from './useNow';

/** Marcações HUD em torno do núcleo (cantos, telemetria e rótulo de estado). */
export function CoreOverlay({ state }: { state: AssistantState }) {
  const now = useNow(250);
  const t = now / 1000;
  const az = ((t * 7.3) % 360).toFixed(1);
  const el = (Math.sin(t * 0.4) * 18).toFixed(1);
  const freq = (state === 'speaking' ? 180 + Math.sin(t * 9) * 40 : state === 'listening' ? 96 + Math.sin(t * 5) * 20 : 42 + Math.sin(t) * 3).toFixed(0);
  return (
    <div className={`core-overlay s-${state}`} aria-hidden>
      <span className="corner tl" />
      <span className="corner tr" />
      <span className="corner bl" />
      <span className="corner br" />
      <span className="tele tl mono">
        NÚCLEO // ARC-07
        <br />
        AZ {az}° · EL {el}°
      </span>
      <span className="tele tr mono">
        FREQ {freq} Hz
        <br />
        SYNC 99.98%
      </span>
      <div className="core-state">
        <span className="core-state__label">{STATE_LABEL[state]}</span>
        <span className="core-state__bars">
          {Array.from({ length: 9 }, (_, i) => (
            <i key={i} style={{ animationDelay: `${i * 70}ms` }} />
          ))}
        </span>
      </div>
    </div>
  );
}
