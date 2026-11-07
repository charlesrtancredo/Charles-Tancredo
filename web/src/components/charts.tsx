import { useId } from 'react';

/** Linha holográfica com preenchimento em gradiente. */
export function Sparkline({ data, height = 44, accent = false }: { data: number[]; height?: number; accent?: boolean }) {
  const id = useId();
  const w = 200;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, height - 4 - ((v - min) / span) * (height - 8)]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const color = accent ? 'var(--gold)' : 'var(--cyan)';
  const last = pts[pts.length - 1];
  return (
    <svg className="sparkline" viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${w},${height} L0,${height} Z`} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill={color} />
    </svg>
  );
}

/** Anel de progresso. */
export function Ring({ value, size = 56, label }: { value: number; size?: number; label?: string }) {
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="ring-chart" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth="3" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--cyan)"
        strokeWidth="3"
        strokeDasharray={`${(c * value) / 100} ${c}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <circle cx={size / 2} cy={size / 2} r={r - 6} fill="none" stroke="var(--line)" strokeWidth="1" strokeDasharray="2 3" />
      {label && (
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="ring-label">
          {label}
        </text>
      )}
    </svg>
  );
}

/** Radar das áreas da vida. */
export function Radar({ items, size = 200 }: { items: { name: string; score: number }[]; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 28;
  const n = items.length;
  const pt = (i: number, f: number) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return [cx + Math.cos(a) * R * f, cy + Math.sin(a) * R * f];
  };
  const poly = items.map((it, i) => pt(i, it.score / 100).join(',')).join(' ');
  return (
    <svg viewBox={`-24 -4 ${size + 48} ${size + 8}`} className="radar" aria-hidden>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={items.map((_, i) => pt(i, f).join(',')).join(' ')} fill="none" stroke="var(--line)" strokeWidth="1" />
      ))}
      {items.map((_, i) => {
        const [x, y] = pt(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--line)" strokeWidth="1" />;
      })}
      <polygon points={poly} fill="rgba(43,217,255,0.18)" stroke="var(--cyan)" strokeWidth="1.5" />
      {items.map((it, i) => {
        const [x, y] = pt(i, it.score / 100);
        const [lx, ly] = pt(i, 1.2);
        return (
          <g key={it.name}>
            <circle cx={x} cy={y} r="2.6" fill="var(--cyan)" />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" className="radar-label">
              {it.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Barra segmentada estilo HUD. */
export function SegBar({ value, segments = 24, warn = 85 }: { value: number; segments?: number; warn?: number }) {
  const on = Math.round((Math.min(100, value) / 100) * segments);
  return (
    <div className="segbar" aria-hidden>
      {Array.from({ length: segments }, (_, i) => (
        <span key={i} className={i < on ? (value >= warn ? 'on warn' : 'on') : ''} />
      ))}
    </div>
  );
}
