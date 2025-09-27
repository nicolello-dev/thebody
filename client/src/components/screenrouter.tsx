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
    setActiveSection(key);
    setMenuOpen(false);

    const link = icons.find(i => i.key === key)?.href;
    if (link) {
      navigate(link, { replace: false }); // forza la navigazione
    }
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
            className={`icon-container ${activeSection === key ? 'active' : ''}`}
            onClick={() => handleIconClick(key)}
            aria-pressed={activeSection === key}
          >
            <FontAwesomeIcon icon={icon} size='2x' />
          </button>
        ))}
      </div>
    </div>
  );
};

export default ScreenRouter;
