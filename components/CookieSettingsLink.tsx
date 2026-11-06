'use client';

import { openCookieSettings } from './CookieConsent';

export function CookieSettingsLink() {
  return (
    <button type="button" className="link-btn" style={{ fontSize: 'inherit', textDecoration: 'underline', textUnderlineOffset: 2 }} onClick={openCookieSettings}>
      Çerez tercihleri
    </button>
  );
}
