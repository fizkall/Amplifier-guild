export function SetupNotice() {
  return (
    <div className="notice">
      <b>Firebase henüz bağlanmadı.</b> Vercel → Project Settings → Environment Variables bölümüne{' '}
      <code>NEXT_PUBLIC_FIREBASE_*</code> değişkenlerini ekleyip yeniden deploy edin (bkz. <code>.env.example</code>).
    </div>
  );
}
