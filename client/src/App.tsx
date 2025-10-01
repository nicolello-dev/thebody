import React, { useEffect, useRef, useState } from 'react';
import {
  Routes,
  Route,
  useNavigate,
  useLocation,
  Navigate,
} from 'react-router-dom';
import HomePage from './components/homepage';
import LoginPage from './routes/login';
import MonitorWidget from './components/monitorwidget';
import Inventory from './routes/inventory';
import Database from './routes/database';
import Crafting from './routes/crafting';
import MapPage from './routes/map';
import User from './routes/user';

// nuove pagine collegate alle icone del Database
import Flora from './routes/flora';
import Fauna from './routes/fauna';
import Recipes from './routes/recipes';
import Dossier from './routes/dossier';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faExpand,
  faCompress,
  faBox,
  faDatabase,
  faHammer,
  faMap,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import './components/homepage.css';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  // auth semplice basato su localStorage
  const [isAuthed, setIsAuthed] = useState<boolean>(false);
  const [showWelcome, setShowWelcome] = useState<boolean>(false);
  const readAuth = React.useCallback(() => {
    try {
      const raw = localStorage.getItem('thebody.auth');
      const parsed = raw ? JSON.parse(raw) : null;
      setIsAuthed(!!(parsed && parsed.user));
      return parsed as { user?: string } | null;
    } catch {
      setIsAuthed(false);
      return null;
    }
  }, []);
  useEffect(() => {
    const initial = readAuth();
    // evita il "benvenuto" su reload quando già autenticato
    authedRef.current = !!(initial && (initial as any).user);
    const onStorage = () => readAuth();
    window.addEventListener('storage', onStorage);
    const onAuthChanged = () => readAuth();
    // evento custom per aggiornare auth nello stesso tab
    window.addEventListener('thebody-auth-changed' as any, onAuthChanged);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('thebody-auth-changed' as any, onAuthChanged);
    };
  }, [readAuth]);

  // Prima reload della sessione: forza schermata di login (root)
  useEffect(() => {
    try {
      const KEY = 'thebody.firstReloadHandled';
      const handled = sessionStorage.getItem(KEY);
      if (!handled) {
        sessionStorage.setItem(KEY, '1');
        if (location.pathname !== '/') {
          navigate('/', { replace: true });
        }
      }
    } catch {}
    // run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // ricontrolla su cambio route (fallback)
  useEffect(() => {
    readAuth();
  }, [location.pathname, readAuth]);
  // mostra overlay di benvenuto alla prima autenticazione
  const authedRef = useRef<boolean>(false);
  useEffect(() => {
    if (!authedRef.current && isAuthed) {
      authedRef.current = true;
      setShowWelcome(true);
      const id = window.setTimeout(() => setShowWelcome(false), 1600);
      return () => window.clearTimeout(id);
    }
  }, [isAuthed]);
  // valori globali condivisi
  const [healthValue] = useState(0.6);
  const [hungerValue] = useState(0.5);
  const [thirstValue] = useState(0.4);

  // posizione centro cerchio (for selectbg clip)
  const [circleCenterX, setCircleCenterX] = useState<number | null>(null);

  // temperatura e clima
  const [climate, setClimate] = useState<-2 | -1 | 0 | 1 | 2>(0);
  const [temperature, setTemperature] = useState<number>(20);

  // fullscreen container (unico)
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const monitorRef = useRef<HTMLDivElement | null>(null);
  const [monitorTop, setMonitorTop] = useState<number | null>(null);
  const [monitorHeight, setMonitorHeight] = useState<number | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);

  // oscillazione temp
  const dirRef = useRef<number>(Math.random() > 0.5 ? 1 : -1);
  const transitioningRef = useRef(false);

  const ranges: Record<number, [number, number]> = {
    [-2]: [-5, 5],
    [-1]: [5, 15],
    [0]: [15, 25],
    [1]: [25, 35],
    [2]: [35, 45],
  };

  useEffect(() => {
    const [min, max] = ranges[climate] ?? [15, 25];
    let target = min + Math.random() * (max - min);
    transitioningRef.current = true;

    const tick = 150;
    const oscDelta = Math.max(0.08, (max - min) * 0.005);
    const transDelta = Math.max(0.2, (max - min) * 0.05);

    const id = window.setInterval(() => {
      setTemperature(prev => {
        if (transitioningRef.current) {
          let step = transDelta * (target > prev ? 1 : -1);
          let next = prev + step;
          if ((step > 0 && next >= target) || (step < 0 && next <= target)) {
            next = target;
            transitioningRef.current = false;
          }
          return next;
        } else {
          const jitter = (Math.random() - 0.5) * oscDelta * 0.5;
          let next = prev + dirRef.current * oscDelta + jitter;
          const margin = (max - min) * 0.05;
          if (next > max - margin) {
            next = Math.min(next, max);
            if (Math.random() < 0.8) dirRef.current = -1;
          } else if (next < min + margin) {
            next = Math.max(next, min);
            if (Math.random() < 0.8) dirRef.current = 1;
          } else {
            if (Math.random() < 0.03) dirRef.current *= -1;
          }
          return Math.min(Math.max(next, min), max);
        }
      });
    }, tick);

    return () => window.clearInterval(id);
  }, [climate]);

  // fullscreen handlers
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && containerRef.current) {
        await containerRef.current.requestFullscreen();
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // stato attivo basato sulla route corrente
  const [activeSection, setActiveSection] = useState<
    'inventario' | 'database' | 'crafting' | 'mappa' | 'utente' | null
  >(null);
  const activeKey: typeof activeSection = React.useMemo(() => {
    const p = location.pathname.toLowerCase();
    if (p.startsWith('/inventory')) return 'inventario';
    if (p.startsWith('/crafting')) return 'crafting';
    if (
      p.startsWith('/database') ||
      p.startsWith('/flora') ||
      p.startsWith('/fauna') ||
      p.startsWith('/recipes') ||
      p.startsWith('/dossier')
    )
      return 'database';
    if (p.startsWith('/map')) return 'mappa';
    if (p.startsWith('/user')) return 'utente';
    return null;
  }, [location.pathname]);

  // icone e routing (spostate fuori dal menu a tendina)
  const iconButtons: Array<{
    key: 'inventario' | 'database' | 'crafting' | 'mappa' | 'utente';
    icon: any;
    href: string;
    label: string;
  }> = [
    { key: 'inventario', icon: faBox, href: '/inventory', label: 'Inventario' },
    { key: 'database', icon: faDatabase, href: '/database', label: 'Database' },
    { key: 'crafting', icon: faHammer, href: '/crafting', label: 'Crafting' },
    { key: 'mappa', icon: faMap, href: '/map', label: 'Mappa' },
    { key: 'utente', icon: faUser, href: '/user', label: 'Utente' },
  ];

  const handleIconClick = (key: (typeof iconButtons)[number]['key']) => {
    if (!isAuthed) return; // blocca route fino al login
    setActiveSection(key);
    const link = iconButtons.find(i => i.key === key)?.href;
    if (link) navigate(link, { replace: false });
  };

  // stile comune per le icone
  const iconButtonStyle = (active?: boolean): React.CSSProperties => ({
    width: 78,
    height: 78,
    borderRadius: 18,
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    // nothing visual inline; CSS classes drive hover/pressed visuals
  });

  // misura posizione del MonitorWidget per distribuire le icone sopra/sotto senza spostarlo
  useEffect(() => {
    if (!monitorRef.current) return;
    const el = monitorRef.current;
    const update = () => {
      const r = el.getBoundingClientRect();
      setMonitorTop(Math.round(r.top));
      setMonitorHeight(Math.round(r.height));
    };
    update();
    const ro = new ResizeObserver(() => window.requestAnimationFrame(update));
    ro.observe(el);
    const onScroll = () => window.requestAnimationFrame(update);
    const onResize = () => window.requestAnimationFrame(update);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      ro.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [location.pathname]);

  const onLoginPage =
    location.pathname === '/login' || location.pathname === '/';
  return (
    <div
      ref={containerRef}
      style={{
        width: '100vw',
        height: '100vh',
        position: 'relative',
        overflow: 'hidden',
        background: '#000', // ensure black background even in element fullscreen
      }}
    >
      {/* selectbg clip (si aggiorna quando MonitorWidget chiama onCenterChange) */}
      {isAuthed && !onLoginPage && (
        <div
          className='select-overlay-clip'
          style={{
            width: circleCenterX ? `${circleCenterX}px` : '50vw',
            zIndex: 100,
            pointerEvents: 'none',
          }}
          aria-hidden
        >
          <img
            src='/selectbg.png'
            alt='Select Background'
            className='select-overlay'
            style={{ pointerEvents: 'none' }}
          />
        </div>
      )}

      {/* MonitorWidget fisso, come prima (non spostato) */}
      {!onLoginPage && (
        <div
          ref={monitorRef}
          className='monitor-widget-fixed'
          aria-hidden={false}
          style={{ zIndex: 2500, pointerEvents: 'none' }}
        >
          <MonitorWidget
            healthValue={healthValue}
            hungerValue={hungerValue}
            thirstValue={thirstValue}
            temperature={temperature}
            size={200}
            strokeWidth={12}
            color='#dfffff'
            backgroundColor='#10233d'
            onCenterChange={(x: number) => {
              if (!isInteracting) setCircleCenterX(x);
            }}
          />
        </div>
      )}

      {/* Overlay icone: colonna verticale sopra e sotto il monitor, senza includere il monitor */}
      {!onLoginPage &&
        circleCenterX &&
        monitorTop !== null &&
        monitorHeight !== null && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 2600,
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            {/* Stili per interazione icone overlay */}
            <style>
              {`
              .icon-hitbox:hover .overlay-btn { color: #dfffff; }
              .icon-hitbox.pressed .overlay-btn {
                background: url(/hexbg.png) center/cover no-repeat;
                color: #dfffff;
              }
              /* Fallback: ensure hexbg appears even without JS state while holding press */
              .icon-hitbox:active .overlay-btn {
                background: url(/hexbg.png) center/cover no-repeat;
                color: #dfffff;
              }
              /* Keep hex for active route */
              .overlay-btn.is-active {
                background: url(/hexbg.png) center/cover no-repeat;
                color: #dfffff;
              }
              .overlay-btn {
                color: #9fb8c7; /* neutro */
                transition: color 140ms ease;
                outline: none;
                pointer-events: none; /* keep pointer on hitbox to avoid hover flicker */
              }
              .overlay-btn.disabled {
                color: #6f8a99;
                opacity: 0.6;
                filter: grayscale(20%);
              }
              .icon-hitbox.disabled { cursor: not-allowed; }
              .overlay-icon {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                transform-origin: center;
                transition: transform 140ms ease;
                will-change: transform;
                pointer-events: none;
              }
              .icon-hitbox:hover .overlay-icon { transform: scale(1.08); }
              .icon-hitbox.pressed .overlay-icon { transform: scale(1.0); }
              .icon-hitbox:active .overlay-icon { transform: scale(1.0); }
              .overlay-btn:focus-visible {
                color: #dfffff;
              }
            `}
            </style>
            {(() => {
              const btnSize = 78; // visual button size
              const hitSize = 110; // enlarged clickable area
              const gap = 20;
              const gapFromMonitor = 50; // distanza verticale dal monitor
              const w = circleCenterX as number;
              const x = Math.round(w / 2 - hitSize / 2);
              const top = monitorTop as number;
              const h = monitorHeight as number;
              const groupH = hitSize * 3 + gap * 2;
              const topGroupTop = Math.max(16, top - groupH - gapFromMonitor);
              const bottomGroupTop = Math.min(
                window.innerHeight - groupH - 16,
                top + h + gapFromMonitor,
              );

              const Hitbox: React.FC<
                React.PropsWithChildren<{
                  style?: React.CSSProperties;
                  onActivate?: () => void;
                  disabled?: boolean;
                }>
              > = ({ style, onActivate, disabled, children }) => {
                const [pressed, setPressed] = React.useState(false);
                return (
                  <div
                    className={`icon-hitbox${pressed ? ' pressed' : ''}${
                      disabled ? ' disabled' : ''
                    }`}
                    style={{
                      position: 'absolute',
                      width: hitSize,
                      height: hitSize,
                      borderRadius: 24,
                      background: 'rgba(0,0,0,0.0001)', // hit area invisibile ma cliccabile
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      pointerEvents: 'auto',
                      zIndex: 10000,
                      touchAction: 'manipulation',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      ...style,
                    }}
                    onPointerDown={e => {
                      if (disabled) return;
                      try {
                        (e.currentTarget as any).setPointerCapture?.(
                          e.pointerId,
                        );
                      } catch {}
                      setPressed(true);
                      setIsInteracting(true);
                      onActivate && onActivate();
                    }}
                    onPointerUp={() => {
                      if (!disabled) setPressed(false);
                      setTimeout(() => setIsInteracting(false), 100);
                    }}
                    onPointerCancel={() => setPressed(false)}
                    onPointerLeave={() => setPressed(false)}
                  >
                    {children}
                  </div>
                );
              };
              const TopIcon = ({
                child,
                idx,
                onActivate,
                disabled,
              }: {
                child: React.ReactElement;
                idx: number;
                onActivate: () => void;
                disabled?: boolean;
              }) => (
                <Hitbox
                  style={{ left: x, top: topGroupTop + idx * (hitSize + gap) }}
                  onActivate={onActivate}
                  disabled={disabled}
                >
                  {child}
                </Hitbox>
              );
              const BottomIcon = ({
                child,
                idx,
                onActivate,
                disabled,
              }: {
                child: React.ReactElement;
                idx: number;
                onActivate: () => void;
                disabled?: boolean;
              }) => (
                <Hitbox
                  style={{
                    left: x,
                    top: bottomGroupTop + idx * (hitSize + gap),
                  }}
                  onActivate={onActivate}
                  disabled={disabled}
                >
                  {child}
                </Hitbox>
              );

              return (
                <>
                  {/* Top trio: fullscreen, inventario, crafting */}
                  <TopIcon
                    idx={0}
                    onActivate={toggleFullscreen}
                    child={
                      <button
                        type='button'
                        className='overlay-btn'
                        aria-label={
                          isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'
                        }
                        title={
                          isFullscreen
                            ? 'Esci da fullscreen'
                            : 'Entra in fullscreen'
                        }
                        style={iconButtonStyle(undefined)}
                      >
                        <span className='overlay-icon'>
                          <FontAwesomeIcon
                            icon={isFullscreen ? faCompress : faExpand}
                            size='2x'
                          />
                        </span>
                      </button>
                    }
                  />
                  <TopIcon
                    idx={1}
                    onActivate={() => handleIconClick('inventario')}
                    disabled={!isAuthed}
                    child={
                      <button
                        type='button'
                        className={`overlay-btn${!isAuthed ? ' disabled' : ''}${
                          activeKey === 'inventario' ? ' is-active' : ''
                        }`}
                        role='button'
                        tabIndex={0}
                        aria-pressed={activeKey === 'inventario'}
                        aria-label='Inventario'
                        title='Inventario'
                        style={iconButtonStyle(activeKey === 'inventario')}
                      >
                        <span className='overlay-icon'>
                          <FontAwesomeIcon icon={faBox} size='2x' />
                        </span>
                      </button>
                    }
                  />
                  <TopIcon
                    idx={2}
                    onActivate={() => handleIconClick('crafting')}
                    disabled={!isAuthed}
                    child={
                      <button
                        type='button'
                        className={`overlay-btn${!isAuthed ? ' disabled' : ''}${
                          activeKey === 'crafting' ? ' is-active' : ''
                        }`}
                        role='button'
                        tabIndex={0}
                        aria-pressed={activeKey === 'crafting'}
                        aria-label='Crafting'
                        title='Crafting'
                        style={iconButtonStyle(activeKey === 'crafting')}
                      >
                        <span className='overlay-icon'>
                          <FontAwesomeIcon icon={faHammer} size='2x' />
                        </span>
                      </button>
                    }
                  />

                  {/* Bottom trio: database, mappa, utente */}
                  <BottomIcon
                    idx={0}
                    onActivate={() => handleIconClick('database')}
                    disabled={!isAuthed}
                    child={
                      <button
                        type='button'
                        className={`overlay-btn${!isAuthed ? ' disabled' : ''}${
                          activeKey === 'database' ? ' is-active' : ''
                        }`}
                        role='button'
                        tabIndex={0}
                        aria-pressed={activeKey === 'database'}
                        aria-label='Database'
                        title='Database'
                        style={iconButtonStyle(activeKey === 'database')}
                      >
                        <span className='overlay-icon'>
                          <FontAwesomeIcon icon={faDatabase} size='2x' />
                        </span>
                      </button>
                    }
                  />
                  <BottomIcon
                    idx={1}
                    onActivate={() => handleIconClick('mappa')}
                    disabled={!isAuthed}
                    child={
                      <button
                        type='button'
                        className={`overlay-btn${!isAuthed ? ' disabled' : ''}${
                          activeKey === 'mappa' ? ' is-active' : ''
                        }`}
                        role='button'
                        tabIndex={0}
                        aria-pressed={activeKey === 'mappa'}
                        aria-label='Mappa'
                        title='Mappa'
                        style={iconButtonStyle(activeKey === 'mappa')}
                      >
                        <span className='overlay-icon'>
                          <FontAwesomeIcon icon={faMap} size='2x' />
                        </span>
                      </button>
                    }
                  />
                  <BottomIcon
                    idx={2}
                    onActivate={() => handleIconClick('utente')}
                    disabled={!isAuthed}
                    child={
                      <button
                        type='button'
                        className={`overlay-btn${!isAuthed ? ' disabled' : ''}${
                          activeKey === 'utente' ? ' is-active' : ''
                        }`}
                        role='button'
                        tabIndex={0}
                        aria-pressed={activeKey === 'utente'}
                        aria-label='Utente'
                        title='Utente'
                        style={iconButtonStyle(activeKey === 'utente')}
                      >
                        <span className='overlay-icon'>
                          <FontAwesomeIcon icon={faUser} size='2x' />
                        </span>
                      </button>
                    }
                  />
                </>
              );
            })()}
          </div>
        )}

      {/* rimosso layout due righe; ora colonna unica */}

      {/* Rimosso pulsante fullscreen fluttuante; ora è nel gruppo overlay */}

      {/* Climatic quick buttons */}
      <div
        style={{
          position: 'fixed',
          bottom: 72,
          right: 12,
          zIndex: 4000,
          display: 'flex',
          gap: 6,
        }}
      >
        {([-2, -1, 0, 1, 2] as const).map(c => (
          <button
            key={c}
            onClick={() => {
              dirRef.current = Math.random() > 0.5 ? 1 : -1;
              setClimate(c);
            }}
            style={{
              padding: '6px 8px',
              borderRadius: 6,
              background:
                c === climate ? 'rgba(255,255,255,0.12)' : 'transparent',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.12)',
              cursor: 'pointer',
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Router */}
      <Routes>
        <Route path='/' element={<LoginPage />} />
        <Route path='/login' element={<LoginPage />} />
        <Route path='/home' element={<HomePage />} />
        <Route
          path='/inventory'
          element={isAuthed ? <Inventory /> : <Navigate to='/' replace />}
        />
        <Route
          path='/database'
          element={
            isAuthed ? (
              <Database
                healthValue={healthValue}
                hungerValue={hungerValue}
                thirstValue={thirstValue}
                temperature={temperature}
                circleCenterX={circleCenterX}
                onCenterChange={(x: number) => setCircleCenterX(x)}
              />
            ) : (
              <Navigate to='/' replace />
            )
          }
        />
        <Route
          path='/crafting'
          element={isAuthed ? <Crafting /> : <Navigate to='/' replace />}
        />
        <Route
          path='/map'
          element={isAuthed ? <MapPage /> : <Navigate to='/' replace />}
        />
        <Route
          path='/user'
          element={isAuthed ? <User /> : <Navigate to='/' replace />}
        />

        {/* nuove route per icone database */}
        <Route
          path='/flora'
          element={isAuthed ? <Flora /> : <Navigate to='/' replace />}
        />
        <Route
          path='/fauna'
          element={isAuthed ? <Fauna /> : <Navigate to='/' replace />}
        />
        <Route
          path='/recipes'
          element={isAuthed ? <Recipes /> : <Navigate to='/' replace />}
        />
        <Route
          path='/dossier'
          element={isAuthed ? <Dossier /> : <Navigate to='/' replace />}
        />
      </Routes>

      {/* Overlay di benvenuto dopo login */}
      {showWelcome && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 5000,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <img
              src='/tarsazure.png'
              alt='TARS'
              style={{ width: 160, height: 'auto' }}
            />
            <div
              style={{
                color: '#dfffff',
                fontFamily: 'Eurostile, sans-serif',
                letterSpacing: 3,
                textTransform: 'uppercase',
                fontWeight: 700,
              }}
            >
              Benvenuto
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
