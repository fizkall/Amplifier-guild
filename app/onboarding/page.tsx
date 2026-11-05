'use client';

import { doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { Program } from '@/shared/models';
import { toSlug } from '@/shared/match';
import { VerifyEmail } from '@/components/VerifyEmail';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';

const PROGRAMS: Program[] = ['FRC', 'FTC', 'FLL', 'TEKNOFEST', 'TUBITAK', 'WRO', 'MUN', 'OTHER'];
const SUGGESTED = ['Python', 'Java', 'C++', 'CAD', 'Elektronik', 'Mekanik', 'Web', 'Tasarım', 'Video', 'Sosyal Medya', 'Sponsorluk', 'Takım Liderliği'];
const HANDLE_RE = /^[a-z0-9_.]{3,24}$/;

function ageFrom(date: string) {
  const b = new Date(date);
  const n = new Date();
  return n.getFullYear() - b.getFullYear() - (n < new Date(n.getFullYear(), b.getMonth(), b.getDate()) ? 1 : 0);
}

export default function Onboarding() {
  const { user, profile, loading, emailVerified } = useAuth();
  const router = useRouter();

  const [handle, setHandle] = useState('');
  const [handleState, setHandleState] = useState<'idle' | 'checking' | 'free' | 'taken' | 'invalid'>('idle');
  const [displayName, setDisplayName] = useState('');
  const [headline, setHeadline] = useState('');
  const [school, setSchool] = useState('');
  const [city, setCity] = useState('');
  const [gradYear, setGradYear] = useState(new Date().getFullYear() + 1);
  const [birthDate, setBirthDate] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [program, setProgram] = useState<Program | ''>('FRC');
  const [teamNumber, setTeamNumber] = useState('');
  const [teamRole, setTeamRole] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [hours, setHours] = useState(5);
  const [openToWork, setOpenToWork] = useState(true);
  const [kvkk, setKvkk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (profile?.onboardingComplete) router.replace('/feed');
    else {
      setDisplayName((d) => d || user.displayName || '');
      setHandle((h) => h || toSlug(user.email?.split('@')[0] ?? '').replace(/-/g, '_').slice(0, 24));
    }
  }, [user, profile, loading, emailVerified, router]);

  useEffect(() => {
    if (!handle) return setHandleState('idle');
    if (!HANDLE_RE.test(handle)) return setHandleState('invalid');
    setHandleState('checking');
    const t = setTimeout(async () => {
      const snap = await getDoc(doc(db, 'handles', handle));
      setHandleState(!snap.exists() || snap.data().uid === user?.uid ? 'free' : 'taken');
    }, 350);
    return () => clearTimeout(t);
  }, [handle, user?.uid]);

  const isMinor = birthDate ? ageFrom(birthDate) < 18 : false;
  const canSubmit = useMemo(
    () => handleState === 'free' && displayName.trim() && birthDate && kvkk && skills.length > 0
      && (!isMinor || (guardianName.trim() && /\S+@\S+\.\S+/.test(guardianEmail))),
    [handleState, displayName, birthDate, kvkk, skills, isMinor, guardianName, guardianEmail],
  );

  function addSkill(s: string) {
    const v = s.trim();
    if (v && !skills.some((x) => toSlug(x) === toSlug(v)) && skills.length < 30) setSkills([...skills, v]);
    setSkillInput('');
  }

  async function submit() {
    if (!user || !canSubmit) return;
    setBusy(true);
    setErr('');
    try {
      const batch = writeBatch(db);
      const handleRef = doc(db, 'handles', handle);
      const existing = await getDoc(handleRef);
      if (!existing.exists()) batch.set(handleRef, { uid: user.uid, createdAt: serverTimestamp() });

      batch.set(doc(db, 'users', user.uid), {
        uid: user.uid,
        handle,
        displayName: displayName.trim().slice(0, 60),
        photoURL: user.photoURL ?? null,
        headline: headline.trim().slice(0, 120),
        bio: '',
        accountType: 'student',
        school: school.trim() ? { name: school.trim(), city: city.trim(), gradYear } : null,
        skills,
        skillSlugs: skills.map(toSlug),
        interests: [],
        programs: program
          ? [{ program, ...(teamNumber ? { teamNumber: Number(teamNumber) } : {}), seasons: [new Date().getFullYear()], ...(teamRole ? { role: teamRole } : {}) }]
          : [],
        links: {},
        openToWork,
        availability: { hoursPerWeek: hours, remote: true, city: city.trim() || null },
        visibility: 'public',
        stats: { followers: 0, following: 0, posts: 0, projectsJoined: 0 },
        badges: [],
        onboardingComplete: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      batch.set(doc(db, 'users', user.uid, 'private', 'profile'), {
        email: user.email ?? '',
        phone: null,
        birthDate,
        isMinor,
        guardianConsent: isMinor ? { name: guardianName.trim(), email: guardianEmail.trim(), consentedAt: serverTimestamp() } : null,
        kvkkConsentAt: serverTimestamp(),
        marketingConsent: false,
        cvFileUrl: null,
      });

      await batch.commit();
      router.replace('/feed');
    } catch (e) {
      console.error(e);
      setErr('Profil kaydedilemedi. Lütfen tekrar dene.');
    } finally {
      setBusy(false);
    }
  }

  const handleHint = {
    idle: '', checking: 'Kontrol ediliyor…', free: '✓ Müsait', taken: 'Bu kullanıcı adı alınmış',
    invalid: '3–24 karakter: küçük harf, rakam, _ ve .',
  }[handleState];

  if (user && !emailVerified) return <VerifyEmail />;

  return (
    <main className="shell">
      <div className="main pad" style={{ maxWidth: 520 }}>
        <h1 className="h1" style={{ margin: '24px 0 4px' }}>Profilini oluştur</h1>
        <p className="meta" style={{ marginBottom: 24 }}>Profilin, başvurularda kullanılan CV'ndir.</p>

        <div className="field">
          <label htmlFor="h">Kullanıcı adı</label>
          <input id="h" className="input" value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase())} />
          <span className={handleState === 'free' ? 'meta' : 'error'}>{handleHint}</span>
        </div>
        <div className="field">
          <label htmlFor="n">Ad Soyad</label>
          <input id="n" className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={60} />
        </div>
        <div className="field">
          <label htmlFor="hl">Kısa başlık</label>
          <input id="hl" className="input" placeholder="FRC #6232 Yazılım · Full-stack meraklısı" value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={120} />
        </div>

        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div className="field" style={{ flex: 2 }}>
            <label htmlFor="s">Okul</label>
            <input id="s" className="input" value={school} onChange={(e) => setSchool(e.target.value)} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="g">Mezuniyet</label>
            <input id="g" className="input" type="number" value={gradYear} onChange={(e) => setGradYear(Number(e.target.value))} />
          </div>
        </div>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="c">Şehir</label>
            <input id="c" className="input" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="b">Doğum tarihi</label>
            <input id="b" className="input" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          </div>
        </div>

        {isMinor && (
          <div className="notice" style={{ margin: '0 0 16px' }}>
            <p style={{ marginTop: 0 }}>18 yaşından küçük olduğun için veli bilgisi gerekiyor.</p>
            <div className="field"><label htmlFor="gn">Veli adı</label><input id="gn" className="input" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} /></div>
            <div className="field" style={{ marginBottom: 0 }}><label htmlFor="ge">Veli e-postası</label><input id="ge" className="input" type="email" value={guardianEmail} onChange={(e) => setGuardianEmail(e.target.value)} /></div>
          </div>
        )}

        <div className="field">
          <label>Program / topluluk</label>
          <div className="chips">
            {PROGRAMS.map((p) => (
              <button key={p} type="button" className={`chip${program === p ? ' on' : ''}`} onClick={() => setProgram(program === p ? '' : p)}>
                {p === 'OTHER' ? 'Diğer' : p === 'TUBITAK' ? 'TÜBİTAK' : p}
              </button>
            ))}
          </div>
        </div>
        {program && (
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="tn">Takım no</label>
              <input id="tn" className="input" inputMode="numeric" value={teamNumber} onChange={(e) => setTeamNumber(e.target.value.replace(/\D/g, ''))} />
            </div>
            <div className="field" style={{ flex: 2 }}>
              <label htmlFor="tr">Takımdaki rolün</label>
              <input id="tr" className="input" placeholder="Yazılım Kaptanı" value={teamRole} onChange={(e) => setTeamRole(e.target.value)} />
            </div>
          </div>
        )}

        <div className="field">
          <label htmlFor="sk">Yetenekler</label>
          <div className="chips" style={{ marginBottom: 8 }}>
            {skills.map((s) => (
              <button key={s} type="button" className="chip on" onClick={() => setSkills(skills.filter((x) => x !== s))}>{s} ✕</button>
            ))}
          </div>
          <input
            id="sk" className="input" placeholder="Yaz ve Enter'a bas" value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addSkill(skillInput); } }}
          />
          <div className="chips" style={{ marginTop: 8 }}>
            {SUGGESTED.filter((s) => !skills.includes(s)).map((s) => (
              <button key={s} type="button" className="chip" onClick={() => addSkill(s)}>+ {s}</button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="hr">Haftada ayırabileceğin saat: {hours}</label>
          <input id="hr" type="range" min={1} max={30} value={hours} onChange={(e) => setHours(Number(e.target.value))} />
        </div>
        <label className="row" style={{ marginBottom: 12 }}>
          <input type="checkbox" checked={openToWork} onChange={(e) => setOpenToWork(e.target.checked)} />
          Projelerde yer almaya açığım
        </label>
        <label className="row" style={{ marginBottom: 20 }}>
          <input type="checkbox" checked={kvkk} onChange={(e) => setKvkk(e.target.checked)} />
          KVKK aydınlatma metnini okudum, kişisel verilerimin işlenmesine onay veriyorum.
        </label>

        {err && <p className="error">{err}</p>}
        <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={!canSubmit || busy} onClick={submit}>
          {busy ? 'Kaydediliyor…' : 'Loncaya katıl'}
        </button>
      </div>
    </main>
  );
}
