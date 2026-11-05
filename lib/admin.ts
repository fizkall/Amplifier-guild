/**
 * Guild yöneticileri (tam yetki). firestore.rules içindeki ADMIN listesiyle aynı tutulmalı.
 * İleride custom claim (admin: true) ile değiştirilebilir; kurallar ikisini de kabul eder.
 */
export const ADMIN_UIDS = ['A3gNGw4d54T9QE3fCXfN2T5mLn63'];

export function isAdminUid(uid: string | null | undefined): boolean {
  return Boolean(uid && ADMIN_UIDS.includes(uid));
}
