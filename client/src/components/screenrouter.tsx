import React, { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBox,
  faDatabase,
  faHammer,
  faMap,
  faUser,
  faList,
} from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';

export type SectionKey =
  | 'inventario'
  | 'database'
  | 'crafting'
  | 'mappa'
  | 'utente';

interface IconConfig {
  key: SectionKey;
  icon: any;
  href: string;
}

const icons: IconConfig[] = [
  { key: 'inventario', icon: faBox, href: '/inventory' },
  { key: 'database', icon: faDatabase, href: '/database' },
  { key: 'crafting', icon: faHammer, href: '/crafting' },
  { key: 'mappa', icon: faMap, href: '/map' },
  { key: 'utente', icon: faUser, href: '/user' },
];

const ScreenRouter: React.FC<{
  activeSection: SectionKey | null;
  setActiveSection: (key: SectionKey | null) => void;
}> = ({ activeSection, setActiveSection }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const [isAuthed, setIsAuthed] = useState<boolean>(false);

  // simple auth reader from localStorage + listeners
  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem('thebody.auth');
        const parsed = raw ? JSON.parse(raw) : null;
        setIsAuthed(!!(parsed && parsed.user));
      } catch {
        setIsAuthed(false);
      }
    };
    read();
    const onStorage = () => read();
    const onAuthChanged = () => read();
    window.addEventListener('storage', onStorage);
    window.addEventListener('thebody-auth-changed' as any, onAuthChanged);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('thebody-auth-changed' as any, onAuthChanged);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleIconClick = (key: SectionKey) => {
    if (!isAuthed) return; // lock until login
    setActiveSection(key);
    setMenuOpen(false);
    const link = icons.find(i => i.key === key)?.href;
    if (link) navigate(link, { replace: false });
  };

  return (
    <div className='toggle-container' ref={containerRef}>
      <button
        className='circle toggle-circle'
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(v => !v)}
        title='Menu'
      >
        <span className='inner'>
          <FontAwesomeIcon icon={faList} size='2x' />
        </span>
      </button>

      <div className={`sliding-icons ${menuOpen ? 'open' : ''}`} role='menu'>
        {icons.map(({ key, icon }) => (
          <button
            key={key}
            className={`icon-container ${
              activeSection === key ? 'active' : ''
            } ${!isAuthed ? 'disabled' : ''}`}
            onClick={() => handleIconClick(key)}
            aria-pressed={activeSection === key}
            aria-disabled={!isAuthed}
            style={
              !isAuthed
                ? {
                    opacity: 0.6,
                    filter: 'grayscale(20%)',
                    cursor: 'not-allowed',
                  }
                : undefined
            }
          >
            <FontAwesomeIcon icon={icon} size='2x' />
          </button>
        ))}
      </div>
    </div>
  );
};

export default ScreenRouter;
