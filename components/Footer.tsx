export const INSTAGRAM_URL = 'https://www.instagram.com/amplifierguild/';

function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="ig-link">
        <InstagramIcon /> @amplifierguild
      </a>
      <div className="meta">Amplifier Guild ©2027</div>
    </footer>
  );
}
