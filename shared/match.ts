/**
 * Eşleştirme skoru (0-100). Hem istemcide ("Sana %80 uygun" rozeti) hem de
 * Cloud Functions'ta (başvuru anında kalıcı matchScore) aynı saf fonksiyon kullanılır.
 */
export interface MatchInput {
  applicant: {
    skillSlugs: string[];
    programs: { program: string }[];
    availability?: { hoursPerWeek: number } | null;
  };
  opportunity: {
    requiredSkillSlugs: string[];
    niceToHaveSkillSlugs: string[];
    commitment: { hoursPerWeek: number };
  };
}

const COMPETITIVE_PROGRAMS = new Set(['FRC', 'FTC', 'FLL', 'TEKNOFEST', 'WRO']);

export function computeMatchScore({ applicant, opportunity }: MatchInput): number {
  const have = new Set(applicant.skillSlugs);
  const overlap = (list: string[]) => list.filter((s) => have.has(s)).length;

  const required = opportunity.requiredSkillSlugs;
  const nice = opportunity.niceToHaveSkillSlugs;

  const skillScore = required.length ? (70 * overlap(required)) / required.length : 70;
  const niceScore = nice.length ? (15 * overlap(nice)) / nice.length : 0;
  const progScore = applicant.programs.some((p) => COMPETITIVE_PROGRAMS.has(p.program)) ? 10 : 0;
  const availScore =
    (applicant.availability?.hoursPerWeek ?? 0) >= opportunity.commitment.hoursPerWeek ? 5 : 0;

  return Math.min(100, Math.round(skillScore + niceScore + progScore + availScore));
}

/** "Takım Liderliği" → "takim-liderligi" */
export function toSlug(label: string): string {
  const map: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', İ: 'i', ö: 'o', ş: 's', ü: 'u' };
  return label
    .trim()
    .replace(/[çğıİöşü]/g, (ch) => map[ch] ?? ch)
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
