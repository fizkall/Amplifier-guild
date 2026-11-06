/* eslint-disable @next/next/no-img-element */
export default function Loading() {
  return (
    <div className="page-loading" role="status" aria-live="polite">
      <img className="logo-img" src="/logo.png" alt="Amplifier Guild" width={56} height={56} />
      <div className="bars" aria-hidden><span /><span /><span /><span /><span /></div>
      <span className="sr-only">Yükleniyor…</span>
    </div>
  );
}
