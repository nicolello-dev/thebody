import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BACKEND_IP, BACKEND_PORT } from '../common';

export default function LoginPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<
    'fullscreen' | 'splash-in' | 'splash-out' | 'form'
  >('fullscreen');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const splashTimers = useRef<number[]>([]);

  // Cleanup any pending timers on unmount
  useEffect(() => {
    return () => {
      splashTimers.current.forEach(id => window.clearTimeout(id));
      splashTimers.current = [];
    };
  }, []);

  const startSplash = () => {
    setPhase('splash-in');
    const t1 = window.setTimeout(() => setPhase('splash-out'), 1200);
    const t2 = window.setTimeout(() => setPhase('form'), 2400);
    splashTimers.current.push(t1, t2);
  };

  const requestFullscreen = async () => {
    // Try to go fullscreen; always proceed to splash, even if denied or unsupported
    try {
      if (document.fullscreenElement) {
        startSplash();
        return;
      }
      const el: any = document.documentElement as any;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      } else if (el.msRequestFullscreen) {
        await el.msRequestFullscreen();
      }
    } catch (_e) {
      // ignore and continue
    } finally {
      startSplash();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch(
      `http://${BACKEND_IP}:${BACKEND_PORT}/auth?name=${username}&password=${password}`,
    );
    if (response.ok) {
      setError(null);
      let gmFlag = false;
      try {
        const data = await response.json();
        gmFlag = !!(data as any)?.isGm;
      } catch (err) {
        console.warn('Impossibile leggere la risposta di login:', err);
      }
      try {
        localStorage.setItem(
          'thebody.auth',
          JSON.stringify({ user: username, gm: gmFlag, t: Date.now() }),
        );
      } catch {}
      try {
        window.dispatchEvent(new Event('thebody-auth-changed'));
      } catch {}
      navigate('/home', { replace: true });
    } else {
      setError('Credenziali non valide');
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: 'url(/bg.png) center/cover no-repeat',
      }}
    >
      {/* Fullscreen request gate */}
      {phase === 'fullscreen' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            style={{
              width: 560,
              maxWidth: '92vw',
              background: 'rgba(0, 20, 30, 0.68)',
              boxShadow:
                '0 10px 40px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(223,255,255,0.14)',
              backdropFilter: 'blur(4px)',
              padding: 28,
              color: '#dfffff',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
                marginBottom: 10,
              }}
            >
              <img
                src='/tarslight.png'
                alt='TARS'
                style={{
                  width: 120,
                  height: 'auto',
                  filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.35))',
                }}
              />
              <div
                style={{
                  fontFamily: 'Eurostile, sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: 3,
                  fontWeight: 700,
                }}
              >
                Esperienza a tutto schermo
              </div>
            </div>
            <p style={{ color: '#b9d2e0', margin: '6px 0 14px' }}>
              Per la migliore esperienza, attiva la modalità fullscreen. Puoi
              uscire in qualsiasi momento con ESC.
            </p>
            <div
              style={{
                display: 'flex',
                gap: 12,
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <button
                onClick={requestFullscreen}
                style={{
                  padding: '12px 16px',
                  background: 'url(/bg-title.png) center/cover no-repeat',
                  color: '#dfffff',
                  border: 'none',
                  fontFamily: 'Eurostile, sans-serif',
                  letterSpacing: 3,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  minWidth: 240,
                }}
              >
                Attiva fullscreen
              </button>
              <button
                onClick={startSplash}
                style={{
                  padding: '12px 16px',
                  background: 'rgba(10,26,40,0.8)',
                  border: '1px solid rgba(223,255,255,0.25)',
                  color: '#dfffff',
                  fontFamily: 'Eurostile, sans-serif',
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  minWidth: 240,
                }}
              >
                Continua senza
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Splash TARS */}
      {(phase === 'splash-in' || phase === 'splash-out') && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ position: 'relative', width: 320, height: 320 }}>
            {/* Cerchio SVG che cresce in sweep angle e ruota */}
            <svg
              width={320}
              height={320}
              viewBox='0 0 320 320'
              style={{
                position: 'absolute',
                inset: 0,
                transform: 'rotate(-90deg)',
              }}
            >
              <defs>
                <linearGradient id='arcGrad' x1='0%' y1='0%' x2='100%' y2='0%'>
                  <stop offset='0%' stopColor='#6ec1ff' stopOpacity='0.9' />
                  <stop offset='100%' stopColor='#dfffff' stopOpacity='0.8' />
                </linearGradient>
              </defs>
              <circle
                cx='160'
                cy='160'
                r='140'
                stroke='#0a1a28'
                strokeWidth='6'
                fill='none'
              />
              <circle
                cx='160'
                cy='160'
                r='140'
                stroke='url(#arcGrad)'
                strokeWidth='10'
                strokeLinecap='round'
                fill='none'
                style={{
                  strokeDasharray: 2 * Math.PI * 140,
                  strokeDashoffset:
                    phase === 'splash-in' ? 2 * Math.PI * 140 * 0 : 0,
                  animation: `${
                    phase === 'splash-in'
                      ? 'arcFill 1200ms ease forwards'
                      : 'arcFade 900ms ease forwards'
                  }`,
                }}
              />
            </svg>
            {/* rotazione del gruppo intero */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                animation: 'arcSpin 1200ms linear forwards',
              }}
            />
            {/* Logo TARS al centro */}
            <img
              src='/tarslight.png'
              alt='TARS'
              style={{
                position: 'absolute',
                inset: 0,
                margin: 'auto',
                width: 220,
                height: 'auto',
                opacity: phase === 'splash-in' ? 1 : 0,
                transform: phase === 'splash-in' ? 'scale(1)' : 'scale(0.98)',
                transition: 'opacity 900ms ease, transform 900ms ease',
                filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.35))',
              }}
            />
          </div>
          {/* Keyframes inline per l'animazione del cerchio */}
          <style>
            {`
              @keyframes arcFill {
                0% { stroke-dashoffset: ${2 * Math.PI * 140}px; }
                100% { stroke-dashoffset: 0; }
              }
              @keyframes arcFade {
                0% { opacity: 1; }
                100% { opacity: 0; }
              }
              @keyframes arcSpin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}
          </style>
        </div>
      )}

      {/* Login form */}
      {phase === 'form' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            style={{
              width: 480,
              maxWidth: '90vw',
              background: 'rgba(0, 20, 30, 0.6)',
              boxShadow:
                '0 10px 40px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(223,255,255,0.12)',
              backdropFilter: 'blur(3px)',
              padding: 28,
              color: '#dfffff',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <img
                src='/tarslight.png'
                alt='TARS Logo'
                style={{ width: 220, height: 'auto', marginBottom: 8 }}
              />
              <div
                style={{
                  fontFamily: 'Eurostile, sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: 3,
                  fontWeight: 700,
                }}
              >
                Accesso
              </div>
            </div>
            <form
              onSubmit={handleSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              <label
                style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
              >
                <span
                  style={{
                    color: '#99afc6',
                    fontFamily: 'Eurostile, sans-serif',
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                  }}
                >
                  Nome utente
                </span>
                <input
                  type='text'
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder='Lee Lee'
                  autoFocus
                  style={{
                    padding: '10px 12px',
                    background: '#0a1a28',
                    color: '#dfffff',
                    border: '1px solid rgba(223,255,255,0.25)',
                    outline: 'none',
                  }}
                />
              </label>
              <label
                style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
              >
                <span
                  style={{
                    color: '#99afc6',
                    fontFamily: 'Eurostile, sans-serif',
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                  }}
                >
                  Password
                </span>
                <input
                  type='password'
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder='testpass'
                  style={{
                    padding: '10px 12px',
                    background: '#0a1a28',
                    color: '#dfffff',
                    border: '1px solid rgba(223,255,255,0.25)',
                    outline: 'none',
                  }}
                />
              </label>
              {error && (
                <div role='alert' style={{ color: '#ff9a9a', fontSize: 14 }}>
                  {error}
                </div>
              )}
              <button
                type='submit'
                style={{
                  marginTop: 6,
                  padding: '12px 16px',
                  background: 'url(/bg-title.png) center/cover no-repeat',
                  color: '#dfffff',
                  border: 'none',
                  fontFamily: 'Eurostile, sans-serif',
                  letterSpacing: 3,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                Entra
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
