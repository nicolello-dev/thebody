import React from 'react';
import { useNavigate } from 'react-router-dom';
import './homepage.css';

const cardImages = [
  { key: 'inventario', src: '/selectioncardinventory.png', href: '/inventory' },
  { key: 'database', src: '/selectioncarddatabase.png', href: '/database' },
  { key: 'crafting', src: '/selectioncardcrafting.png', href: '/crafting' },
  { key: 'mappa', src: '/selectioncardmap.png', href: '/map' },
  { key: 'utente', src: '/selectioncarduser.png', href: '/user' },
];

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className='homepage-container'>
      {/* central logo */}
      <div className='central-content' role='main'>
        <img src='/tarsazure.png' alt='TARS Logo' className='logo' />
      </div>

      {/* selection cards */}
      <div className='selection-overlay'>
        <div className='row top'>
          {cardImages.slice(0, 3).map(card => (
            <a href={card.href}>
              <div key={card.key} className='card'>
                <img src={card.src} alt={card.key} className='card-bg' />
              </div>
            </a>
          ))}
        </div>
        <div className='row bottom'>
          {cardImages.slice(3).map(card => (
            <>
              <a href={card.href}>
                <div className='card'>
                  <img src={card.src} alt={card.key} className='card-bg' />
                </div>
              </a>
            </>
          ))}
        </div>
      </div>
    </div>
  );
}
