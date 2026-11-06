'use client';

import { AppShell } from '@/components/AppShell';
import { Ventures } from '@/components/Ventures';
import { firebaseReady } from '@/lib/firebase';

export default function GirisimlerPage() {
  return <AppShell title="Girişimler" publicPage>{firebaseReady && <Ventures />}</AppShell>;
}
