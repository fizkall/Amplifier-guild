type P = { filled?: boolean; size?: number };
const base = (size = 26) => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
});

export const HomeIcon = ({ filled, size }: P) => (
  <svg {...base(size)} fill={filled ? 'currentColor' : 'none'}><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>
);
export const JobsIcon = ({ filled, size }: P) => (
  <svg {...base(size)} fill={filled ? 'currentColor' : 'none'}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke={filled ? 'var(--bg)' : 'currentColor'} /></svg>
);
export const PlusIcon = ({ size }: P) => (
  <svg {...base(size)}><rect x="3" y="3" width="18" height="18" rx="5" /><path d="M12 8v8M8 12h8" /></svg>
);
export const InboxIcon = ({ filled, size }: P) => (
  <svg {...base(size)} fill={filled ? 'currentColor' : 'none'}><path d="M4 13h4l2 3h4l2-3h4" /><path d="M5 5h14l2 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z" /></svg>
);
export const UserIcon = ({ filled, size }: P) => (
  <svg {...base(size)} fill={filled ? 'currentColor' : 'none'}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" /></svg>
);
export const HeartIcon = ({ filled, size = 20 }: P) => (
  <svg {...base(size)} fill={filled ? 'currentColor' : 'none'}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>
);
export const ReplyIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z" /></svg>
);
export const MenuIcon = ({ size }: P) => (
  <svg {...base(size)}><path d="M4 9h16M4 15h10" /></svg>
);
export const CheckIcon = ({ size = 15 }: P) => (
  <svg {...base(size)} strokeWidth={2.4}><path d="m5 12 5 5 9-10" /></svg>
);
export const SettingsIcon = ({ filled, size }: P) => (
  <svg {...base(size)}><circle cx="12" cy="12" r="3" fill={filled ? 'currentColor' : 'none'} /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
);
