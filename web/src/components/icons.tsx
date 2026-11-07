import type { ModuleId } from '../state/types';

type P = { size?: number };
const base = (size = 20) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

export const MicIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);
export const StopIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <rect x="7" y="7" width="10" height="10" rx="1.5" />
  </svg>
);
export const SendIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M4 12l16-8-6 16-2.5-6.5L4 12z" />
  </svg>
);
export const GridIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <rect x="4" y="4" width="6" height="6" rx="1" />
    <rect x="14" y="4" width="6" height="6" rx="1" />
    <rect x="4" y="14" width="6" height="6" rx="1" />
    <rect x="14" y="14" width="6" height="6" rx="1" />
  </svg>
);
export const GearIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
);
export const PhoneOffIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M3 13.5c4.9-4.4 13.1-4.4 18 0l-2.2 2.6-3.6-1.4v-2.6a12 12 0 0 0-6.4 0v2.6l-3.6 1.4z" />
  </svg>
);
export const CloseIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

const VoiceIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 7v10M21 12h0" />
  </svg>
);
const FinanceIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M3 17l5-5 4 3 8-8" />
    <path d="M15 7h5v5" />
    <path d="M3 21h18" />
  </svg>
);
const AgendaIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <rect x="3.5" y="5" width="17" height="15" rx="2" />
    <path d="M3.5 10h17M8 3v4M16 3v4M8 14h3" />
  </svg>
);
const TasksIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M4 6.5l1.8 1.8L9 5M4 12.5l1.8 1.8L9 11M4 18.5l1.8 1.8L9 17M12 7h8M12 13h8M12 19h8" />
  </svg>
);
const StrategyIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="0.8" />
    <path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" />
  </svg>
);
const MemoryIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <rect x="6" y="6" width="12" height="12" rx="1.5" />
    <rect x="9.5" y="9.5" width="5" height="5" />
    <path d="M9 2.5v3M15 2.5v3M9 18.5v3M15 18.5v3M2.5 9h3M2.5 15h3M18.5 9h3M18.5 15h3" />
  </svg>
);
const CommandsIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <rect x="3" y="4.5" width="18" height="15" rx="2" />
    <path d="M7 10l3 2.5L7 15M12.5 15H17" />
  </svg>
);

export const MODULE_ICON: Record<ModuleId, (p: P) => React.JSX.Element> = {
  voice: VoiceIcon,
  finance: FinanceIcon,
  agenda: AgendaIcon,
  tasks: TasksIcon,
  strategy: StrategyIcon,
  memory: MemoryIcon,
  commands: CommandsIcon,
};

export const ReactorLogo = ({ size = 28 }: P) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
    <defs>
      <radialGradient id="rl" cx="50%" cy="50%" r="50%">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.35" stopColor="#7ff3ff" />
        <stop offset="1" stopColor="#0a5bff" stopOpacity="0" />
      </radialGradient>
    </defs>
    <circle cx="24" cy="24" r="22" fill="none" stroke="#2bd9ff" strokeOpacity="0.5" strokeWidth="1" />
    <circle cx="24" cy="24" r="17" fill="none" stroke="#2bd9ff" strokeWidth="2.2" strokeDasharray="7 3.7" />
    <circle cx="24" cy="24" r="10" fill="url(#rl)" />
    <path d="M24 13l9.5 16.5h-19z" fill="none" stroke="#bff8ff" strokeWidth="1.4" />
  </svg>
);
