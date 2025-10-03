import React from 'react';
import { useLocation } from 'react-router-dom';
import '../components/homepage.css';
import '../components/fauna.css';

// Utility: converte il titolo in filename (slug)
const slugifyFileName = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/&/g, 'e')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export default function Dossier() {
  const location = useLocation();
  // title/description possono arrivare da querystring o state; fallback demo
  const params = new URLSearchParams(location.search);
  const qTitle = params.get('title');
  const qDesc = params.get('desc');
  const stateAny = location.state as any;

  const title: string = stateAny?.title || qTitle || 'DOSSIER ESEMPIO';
  const description: string =
    stateAny?.description ||
    qDesc ||
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ' +
      'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. ' +
      'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. ' +
      'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';

  const imageName = `/${slugifyFileName(title)}.png`;

  // Container scrollabile a pagina piena (senza spostare elementi fissi)
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        overflowY: 'auto',
        overflowX: 'hidden',
        background: 'url(/bg.png) center/cover no-repeat',
        color: '#dfffff',
        fontFamily: 'eurostile, sans-serif',
        paddingLeft: 150,
        paddingTop: 150,
      }}
    >
      <div
        style={{
          width: 'min(96vw, 1400px)',
          margin: '0 auto 80px',
          position: 'relative',
        }}
      >
        {/* Cover 2:1 massimizzata */}
        <div
          aria-label='dossier cover'
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '2 / 1',
            backgroundImage: `url(${imageName})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            borderTop: '1px solid rgba(223,255,255,0.15)',
          }}
        >
          {/* Titolo in overlay in alto a sinistra (stile titolo standard) */}
          <div style={{ position: 'absolute', top: 10, left: 10 }}>
            <div className='title-wrapper'>
              <img src='/bg-title.png' alt='title bg' />
              <div className='title-text'>
                <h1 style={{ margin: 0 }}>{title}</h1>
              </div>
            </div>
          </div>
        </div>

        {/* Rettangolo descrizione: si adatta al contenuto (scroll della pagina) */}
        <div
          style={{
            marginTop: 16,
            width: '100%',
            minHeight: 300,
            background:
              'linear-gradient(180deg, rgba(5,16,36,0.75) 0%, rgba(10,30,50,0.65) 100%)',
            boxShadow: 'none',
            padding: '22px 26px',
            lineHeight: 1.45,
            letterSpacing: 0.5,
          }}
        >
          <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {description}
          </div>
        </div>
      </div>
    </div>
  );
}
