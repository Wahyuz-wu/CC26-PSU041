// Helper format & konstanta gaya untuk panel hasil.

export function rupiahShort(n) {
  if (n == null || Number.isNaN(n)) return '—';
  const a = Math.abs(n);
  if (a >= 1e9) return `Rp ${(n / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 2 })} M`;
  if (a >= 1e6) return `Rp ${(n / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 2 })} jt`;
  if (a >= 1e3) return `Rp ${Math.round(n / 1e3).toLocaleString('id-ID')} rb`;
  return `Rp ${Math.round(n).toLocaleString('id-ID')}`;
}

export const TONE_DOT = {
  positive: '#16a34a',
  warning: 'var(--amber)',
  info: 'var(--blue)',
  purple: '#a78bfa',
};

export const REK_STYLE = {
  green: { border: '#16a34a', bg: '#f0fdf4', color: '#14532d', emoji: '🔴' },
  amber: { border: 'var(--amber)', bg: '#fefce8', color: '#78350f', emoji: '🟡' },
  blue: { border: 'var(--blue)', bg: '#eff6ff', color: '#1e40af', emoji: '🔵' },
};

export const CAUSE_COLORS = ['var(--green)', 'var(--sage)', 'var(--lime)', 'var(--wire)'];
