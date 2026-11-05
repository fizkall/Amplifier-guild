import type { Timestamp } from 'firebase/firestore';

export function timeAgo(ts: Timestamp | null | undefined): string {
  if (!ts) return 'şimdi';
  const s = Math.max(0, (Date.now() - ts.toMillis()) / 1000);
  if (s < 60) return 'şimdi';
  if (s < 3600) return `${Math.floor(s / 60)}d`;
  if (s < 86400) return `${Math.floor(s / 3600)}s`;
  if (s < 604800) return `${Math.floor(s / 86400)}g`;
  return ts.toDate().toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

export const ROLE_TYPE_LABEL: Record<string, string> = {
  volunteer: 'Gönüllü',
  internship: 'Staj',
  part_time: 'Yarı zamanlı',
  project_based: 'Proje bazlı',
};

export const APP_STATUS_LABEL: Record<string, string> = {
  submitted: 'Gönderildi',
  in_review: 'İnceleniyor',
  shortlisted: 'Kısa listede',
  accepted: 'Kabul edildi',
  rejected: 'Bu sefer olmadı',
  withdrawn: 'Geri çekildi',
};
