import type { MetadataRoute } from 'next';
import { docId, queryPublic, SITE } from '@/lib/server-firestore';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const statics: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE}/kesfet`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE}/girisimler`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE}/hakkinda`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE}/iletisim`, lastModified: now, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${SITE}/kvkk`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE}/kullanim-kosullari`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];
  const projects = await queryPublic('', 'projects', 'status', 'active');
  const projectUrls: MetadataRoute.Sitemap = projects.map((p) => ({
    url: `${SITE}/proje/${docId(p)}`, lastModified: p.updateTime ? new Date(p.updateTime) : now, changeFrequency: 'weekly', priority: 0.7,
  }));
  const opps = (await Promise.all(projects.map(async (p) => {
    const list = await queryPublic(`projects/${docId(p)}`, 'opportunities', 'status', 'open');
    return list.map((o) => ({
      url: `${SITE}/ilan/${docId(p)}/${docId(o)}`, lastModified: o.updateTime ? new Date(o.updateTime) : now,
      changeFrequency: 'daily' as const, priority: 0.8,
    }));
  }))).flat();
  return [...statics, ...projectUrls, ...opps];
}
