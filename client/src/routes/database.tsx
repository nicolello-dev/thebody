import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../components/homepage.css';
import '../components/database.css';

interface DatabaseProps {
  healthValue?: number;
  hungerValue?: number;
  thirstValue?: number;
  temperature?: number;
  circleCenterX?: number | null;
  onCenterChange?: (x: number) => void;
}

export default function Database(props: DatabaseProps) {
  const [iconsVisible, setIconsVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setIconsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const buttons = [
    {
      src: '/flora.png',
      label: '_FLORA//',
      position: 'top-left',
      route: '/flora',
    },
    {
      src: '/fauna.png',
      label: '_FAUNA//',
      position: 'top-right',
      route: '/fauna',
    },
    {
      src: '/recipes.png',
      label: '_RICETTE//',
      position: 'bottom-left',
      route: '/recipes',
    },
    {
      src: '/dossier.png',
      label: '_DOSSIER//',
      position: 'bottom-right',
      route: '/dossier',
    },
  ];

  return (
    <div className='homepage-container'>
      {/* ScreenRouter o altri componenti interattivi */}
      <div className='screen-router-container'>
        {/* se vuoi mantenere ScreenRouter lo rimetti qui */}
      </div>

      {/* GIF centrale, non intercettabile dai click */}
      <div className='database-gif-container'>
        <img
          src='/database-searching.gif'
          alt='Database Animation'
          className='database-gif'
        />
      </div>

      {/* Icone pulsanti sopra la GIF */}
      <div className='database-icons-container'>
        {buttons.map(btn => (
          <button
            key={btn.label}
            className={`database-icon-button ${btn.position} ${
              iconsVisible ? 'visible' : ''
            }`}
            onClick={() => navigate(btn.route)}
            aria-label={`Vai a ${btn.label}`}
          >
            <img src={btn.src} alt={btn.label} className='icon-img' />
            <span className='icon-label'>{btn.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
