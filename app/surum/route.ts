import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Yayındaki sürüm: istemci kendi sürümüyle karşılaştırıp eskiyse sayfayı yeniler. */
export function GET() {
  return NextResponse.json(
    { version: process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev' },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  );
}
