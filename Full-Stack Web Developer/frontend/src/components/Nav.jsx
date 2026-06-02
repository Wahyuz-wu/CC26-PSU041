import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Logo = () => (
  <svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M2 14 L6 9 L10 11 L16 4"
      stroke="#c6f135"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="16" cy="4" r="1.5" fill="#c6f135" />
  </svg>
);

export default function Nav() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  // Tambahkan kelas .scrolled saat halaman digulir (efek bayangan navbar).
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`nav${scrolled ? ' scrolled' : ''}`} id="mainNav">
      <div className="nav-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
        <div className="nav-logo-mark">
          <Logo />
        </div>
        <span className="nav-logo-next">Foreca</span>
      </div>
      <div className="nav-right">
        <button className="nav-link" onClick={() => navigate('/')}>
          Beranda
        </button>
        <button className="nav-cta" onClick={() => navigate('/dashboard')}>
          Mulai Analisis
        </button>
      </div>
    </nav>
  );
}
