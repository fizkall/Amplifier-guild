/**
 * Sunucu tarafı (metadata, sitemap) için Firestore REST okuması.
 * Yalnızca güvenlik kurallarının herkese açtığı veriler okunur (yayındaki projeler, açık ilanlar).
 */
const PROJECT = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'amp-guild';
const KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDh13g6q6Vl_N3U6X7bt9dgPdcA9lBul0c';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

type FsValue = { stringValue?: string; integerValue?: string; booleanValue?: boolean; nullValue?: null; timestampValue?: string; mapValue?: { fields?: Record<string, FsValue> } };
export type FsDoc = { name: string; fields?: Record<string, FsValue>; updateTime?: string };

export const str = (d: FsDoc | null | undefined, f: string) => d?.fields?.[f]?.stringValue ?? '';
export const docId = (d: FsDoc) => d.name.split('/').pop() as string;

export async function getPublicDoc(path: string): Promise<FsDoc | null> {
  try {
    const r = await fetch(`${BASE}/${path}?key=${KEY}`, { next: { revalidate: 300 } });
    return r.ok ? ((await r.json()) as FsDoc) : null;
  } catch {
    return null;
  }
}

export async function queryPublic(parent: string, collectionId: string, field: string, value: string): Promise<FsDoc[]> {
  try {
    const r = await fetch(`${BASE}${parent ? `/${parent}` : ''}:runQuery?key=${KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId }],
          where: { fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: { stringValue: value } } },
          limit: 500,
        },
      }),
      next: { revalidate: 600 },
    });
    if (!r.ok) return [];
    const rows = (await r.json()) as { document?: FsDoc }[];
    return rows.flatMap((x) => (x.document ? [x.document] : []));
  } catch {
    return [];
  }
}

export const SITE = 'https://amplifierguild.online';
export const clip = (s: string, n = 160) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
