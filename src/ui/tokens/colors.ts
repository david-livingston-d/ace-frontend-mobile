export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
export type TonePair = { fg: string; bg: string };
export type Colors = {
  bg: string; surface: string; surfaceSunken: string;
  text: string; textStrong: string; textMuted: string; textSubtle: string;
  border: string; borderStrong: string;
  inverseBg: string; inverseText: string;
  solidBg: string; solidFg: string; ghostHover: string; disabledBg: string; disabledFg: string; focus: string;
  tone: Record<StatusTone, TonePair>;
};

export const n = { 0: '#ffffff', 25: '#fafafa', 50: '#f4f4f4', 100: '#ebebeb', 200: '#dcdcdc', 300: '#c4c4c4', 400: '#9b9b9b', 500: '#767676', 600: '#5a5a5a', 700: '#414141', 800: '#2b2b2b', 900: '#1a1a1a', 950: '#0d0d0d' } as const;

const semantic = {
  positive: { fg: '#3f6b4f', bg: '#e6ede8' }, caution: { fg: '#8a6b2f', bg: '#f2ece0' },
  critical: { fg: '#8c3a34', bg: '#f3e6e5' }, info: { fg: '#3a5470', bg: '#e6eaef' },
};

export const light: Colors = {
  bg: n[50], surface: n[0], surfaceSunken: n[100],
  text: n[800], textStrong: n[950], textMuted: n[500], textSubtle: n[400],
  border: 'rgba(43,43,43,0.14)', borderStrong: n[800],
  inverseBg: n[950], inverseText: n[50],
  solidBg: n[950], solidFg: n[50], ghostHover: n[100], disabledBg: n[200], disabledFg: n[400], focus: n[950],
  tone: { neutral: { fg: n[600], bg: n[100] }, info: semantic.info, success: semantic.positive, warning: semantic.caution, danger: semantic.critical },
};

export const dark: Colors = {
  bg: n[950], surface: '#161616', surfaceSunken: '#080808',
  text: n[50], textStrong: '#ffffff', textMuted: 'rgba(244,244,244,0.60)', textSubtle: 'rgba(244,244,244,0.40)',
  border: 'rgba(244,244,244,0.16)', borderStrong: n[50],
  inverseBg: n[0], inverseText: n[950],
  solidBg: n[50], solidFg: n[950], ghostHover: 'rgba(244,244,244,0.10)', disabledBg: n[800], disabledFg: n[600], focus: n[50],
  tone: {
    neutral: { fg: n[300], bg: n[800] }, info: { fg: '#9fb3c8', bg: '#1e2a36' }, success: { fg: '#9cc4a8', bg: '#1f2e24' },
    warning: { fg: '#d6b878', bg: '#332a17' }, danger: { fg: '#d9948e', bg: '#3a1f1d' },
  },
};
