'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Members } from '@/components/Members';
import { OpportunityList } from '@/components/Opportunities';
import { Ventures } from '@/components/Ventures';
import { firebaseReady } from '@/lib/firebase';

type Tab = 'girisimler' | 'uyeler' | 'alimlar';
const TABS: [Tab, string][] = [['girisimler', 'Girişimler'], ['uyeler', 'Üyeler'], ['alimlar', 'Alımlar']];

function Explore() {
  const [tab, setTab] = useState<Tab>('girisimler');
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('sekme') as Tab | null;
    if (t && TABS.some(([k]) => k === t)) setTab(t);
  }, []);
  function choose(t: Tab) {
    setTab(t);
    const u = new URL(window.location.href); u.searchParams.set('sekme', t); window.history.replaceState(null, '', u);
  }
  return (
    <>
      <div className="tabs" role="tablist">
        {TABS.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={`tab${tab === k ? ' active' : ''}`} onClick={() => choose(k)}>{l}</button>
        ))}
      </div>
      {tab === 'girisimler' && <Ventures />}
      {tab === 'uyeler' && <Members />}
      {tab === 'alimlar' && <OpportunityList />}
    </>
  );
}

export default function KesfetPage() {
  return <AppShell title="Keşfet" publicPage>{firebaseReady && <Explore />}</AppShell>;
}
