'use client';

import { AppShell } from '@/components/AppShell';
import { OpportunityList } from '@/components/Opportunities';
import { firebaseReady } from '@/lib/firebase';

export default function IlanlarPage() {
  return <AppShell title="İlanlar">{firebaseReady && <OpportunityList />}</AppShell>;
}
