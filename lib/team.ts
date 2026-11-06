import type { ProgramEntry } from '@/shared/models';

/** Takım kodu: büyük harf + rakam, en fazla 10 karakter (FRC 6232, VEX 1234A). */
export const cleanTeamCode = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);

export const teamCodeOf = (p: ProgramEntry) => p.teamCode || (p.teamNumber ? String(p.teamNumber) : '');

export const programLabel = (p: string) => (p === 'OTHER' ? 'Diğer' : p === 'TUBITAK' ? 'TÜBİTAK' : p === 'VEX' ? 'VEX (RECF)' : p);

/** "FRC #6232 · Yazılım" */
export const programChip = (p: ProgramEntry) => {
  const code = teamCodeOf(p);
  return `${programLabel(p.program)}${code ? ` #${code}` : ''}${p.role ? ` · ${p.role}` : ''}`;
};
