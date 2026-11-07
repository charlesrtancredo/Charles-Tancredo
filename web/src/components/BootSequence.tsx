import { useEffect, useState } from 'react';

const LINES = [
  'Inicializando núcleo de energia…',
  'Calibrando matriz holográfica…',
  'Carregando módulos pessoais…',
  'Estabelecendo canal seguro…',
  'Sistemas operacionais.',
];

/** Sequência cinematográfica de inicialização. */
export function BootSequence({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (step < LINES.length) {
      const id = window.setTimeout(() => setStep((s) => s + 1), step === 0 ? 350 : 330);
      return () => window.clearTimeout(id);
    }
    const a = window.setTimeout(() => setLeaving(true), 350);
    const b = window.setTimeout(onDone, 1250);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [step, onDone]);

  const pct = Math.round((step / LINES.length) * 100);
  return (
    <div className={`boot ${leaving ? 'leaving' : ''}`} onClick={() => setStep(LINES.length)}>
      <div className="boot__inner">
        <div className="boot__title">J.A.R.V.I.S.</div>
        <div className="boot__bar">
          <i style={{ width: `${pct}%` }} />
        </div>
        <ul className="boot__lines mono">
          {LINES.slice(0, step).map((l, i) => (
            <li key={l} className={i === step - 1 ? 'cur' : ''}>
              <span>[{String(i + 1).padStart(2, '0')}]</span> {l}
            </li>
          ))}
        </ul>
        <div className="boot__pct mono">{pct}%</div>
      </div>
    </div>
  );
}
