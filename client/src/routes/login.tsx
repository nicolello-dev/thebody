import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BACKEND_IP, BACKEND_PORT } from '../common';
import { cardio } from 'ldrs';

export default function LoginPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<
    'fullscreen' | 'splash-loading' | 'splash-logo' | 'splash-out' | 'form'
  >('fullscreen');
  const [progress, setProgress] = useState(0);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const splashTimers = useRef<number[]>([]);
  const errorTimer = useRef<number | null>(null);

  // Register the cardio component
  useEffect(() => {
    cardio.register();
  }, []);

  // Cleanup any pending timers on unmount
  useEffect(() => {
    return () => {
      splashTimers.current.forEach(id => window.clearTimeout(id));
      splashTimers.current = [];
      if (errorTimer.current) window.clearTimeout(errorTimer.current);
    };
  }, []);

  // Auto-dismiss error notification after 3.5s
  useEffect(() => {
    if (!error) return;
    if (errorTimer.current) window.clearTimeout(errorTimer.current);
    errorTimer.current = window.setTimeout(() => setError(null), 3500) as unknown as number;
    return () => {
      if (errorTimer.current) window.clearTimeout(errorTimer.current);
      errorTimer.current = null;
    };
  }, [error]);

  

  

  const startSplash = () => {
    setPhase('splash-loading');
    setProgress(0);
    
    // Cardio animation runs for 2 seconds, then show logo
    const logoTimer = window.setTimeout(() => {
      setPhase('splash-logo');
      
      // Start the circular progress animation when logo appears
      const startTime = Date.now();
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const newProgress = Math.min(elapsed / 1000, 1); // 1000ms = 1 second
        setProgress(newProgress);
        
        if (newProgress >= 1) {
          clearInterval(progressInterval);
          // Only start fade out when progress is complete
          setTimeout(() => {
            setPhase('splash-out');
            
            // Complete transition to form
            const formTimer = window.setTimeout(() => setPhase('form'), 500);
            splashTimers.current.push(formTimer);
          }, 100); // Small delay to ensure progress is visually complete
        }
      }, 16); // ~60fps for smooth animation
      
      splashTimers.current.push(progressInterval as any);
    }, 2000);
    splashTimers.current.push(logoTimer);
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
      setError('CREDENZIALI ERRATE');
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
      {/* Top notification (overlay) for errors - doesn't affect layout */}
      {error && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'absolute',
            bottom: '30%',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2200,
            animation: 'shake 0.6s ease',
            willChange: 'transform',
            backgroundImage: "url('/bg-error.png')",
            backgroundSize: 'contain',
            width: '200px',
            color: '#ffdede',
            padding: '2px 8px',
            borderRadius: 0,
            fontFamily: 'Eurostile, sans-serif',
            letterSpacing: 1,
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          {error}
        </div>
      )}
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
              backgroundImage: "url('/bg-slot.png')",
              backdropFilter: 'opacity(1) blur(4px)',
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
             Questa piattaforma è progettata per funzionare in modalità fullscreen. Puoi
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
                  width: 440,
                  borderRadius: 0,
                }}
              >
                       Abilita fullscreen       
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Splash TARS */}
      {(phase === 'splash-loading' || phase === 'splash-logo' || phase === 'splash-out') && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: phase === 'splash-out' ? 'opacity 0.5s ease' : 'none',
            opacity: phase === 'splash-out' ? 0 : 1,
          }}
        >
          {phase === 'splash-loading' && (
            <l-cardio
              size="100"
              stroke="4"
              speed="2" 
              color="#dfffff"
            ></l-cardio>
          )}
          
          {(phase === 'splash-logo' || phase === 'splash-out') && (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* White circular progress bar */}
              <svg
                width="280"
                height="280"
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%) rotate(-90deg)',
                  opacity: phase === 'splash-logo' ? 1 : 0,
                  transition: 'opacity 0.5s ease',
                }}
              >
                <circle
                  cx="140"
                  cy="140"
                  r="120"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth="6"
                />
                <circle
                  cx="140"
                  cy="140"
                  r="120"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 120}`}
                  strokeDashoffset={`${2 * Math.PI * 120 * (1 - progress)}`}
                  style={{
                    transition: 'stroke-dashoffset 2s ease-in-out',
                    filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.3))'
                  }}
                />
              </svg>
              
              <img
                src='/tarslight.png'
                alt='TARS'
                style={{
                  width: 220,
                  height: 'auto',
                  opacity: phase === 'splash-logo' ? 1 : 0,
                  transition: 'opacity 0.5s ease',
                  filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.35))',
                  animation: phase === 'splash-logo' ? 'fadeIn 0.5s ease' : 'none',
                  zIndex: 1,
                  position: 'relative',
                }}
              />
            </div>
          )}
        </div>
      )}
      
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes shake {
            0% { transform: translateX(-50%) translateX(0); }
            15% { transform: translateX(-50%) translateX(8px); }
            30% { transform: translateX(-50%) translateX(-6px); }
            45% { transform: translateX(-50%) translateX(4px); }
            60% { transform: translateX(-50%) translateX(-2px); }
            75% { transform: translateX(-50%) translateX(1px); }
            100% { transform: translateX(-50%) translateX(0); }
          }
        `}
      </style>

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
              display: 'inline-block',
              width: 'auto',
              maxWidth: '96vw',
              maxHeight: 1000,
              overflowY: 'auto',
              backgroundImage: "url('/bg-notification.png')",
              backgroundSize: 'contain',
              backgroundPosition: 'center', 
              backgroundPositionY: '90%',
              backgroundRepeat: 'no-repeat',
              backdropFilter: 'blur(3px)',
              padding: 28,
            }}
          >
            <div
              style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  marginBottom: 16,
                }}
            >
              <img
                src='/pdatitle.png'
                alt='TARS Logo'
                style={{ width: 320, height: 'auto', marginBottom: 8 }}
              />
            </div>
            <form
              onSubmit={handleSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: 14, alignSelf: 'flex-end' }}
            >
              <div style={{ position: 'relative', display: 'flex', gap: 16, alignItems: 'stretch', flexWrap: 'wrap' }}>

                <div
                  aria-hidden="true"
                  style={{
                    width: 125,
                    backgroundImage: "url('/usernull.png')",
                    marginBottom: 8,
                    boxShadow: 'inset 0 0 12px rgba(0,0,0,0.12)',
                    backgroundSize: 'cover',
                    marginTop: 43,
                    mixBlendMode: 'screen',
                  }}
                />

                <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <label style={{ display: 'flex', color: '#dfffff', flexDirection: 'column', gap: 42, alignSelf: 'flex-start' }}>
                    <span
                      style={{
                        color: '#dfffff',
                        fontFamily: 'Eurostile, sans-serif',
                        letterSpacing: '2px',
                        textTransform: 'uppercase',
                      }}
                    >
                    </span>
                    <input
                      type='text'
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder='USERNAME'
                      autoFocus
                      style={{
                        padding: '10px 12px',
                        background: '#05152a',
                        fontFamily: 'Eurostile, sans-serif',
                        color: '#dfffff',
                        letterSpacing: '2px',
                        border: '1px solid #152f49',
                        outline: 'none',
                        width: 320,
                        maxWidth: '100%'
                      }}
                    />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: 0, alignSelf: 'flex-start' }}>
                    <span
                      style={{
                        color: '#dfffff',
                        fontFamily: 'Eurostile, sans-serif',
                        letterSpacing: 2,
                        textTransform: 'uppercase',
                      }}
                    >

                    </span>
                    <input
                      type='password'
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder='PASSWORD'
                      style={{
                        padding: '10px 12px',
                        background: '#05152a',
                        fontFamily: 'Eurostile, sans-serif',
                        color: '#dfffff',
                        letterSpacing: '2px',
                        border: '1px solid #152f49',
                        outline: 'none',
                        width: 320,
                        maxWidth: '100%'
                      }}
                    />
                  </label>

                  

                  <button
                    type='submit'
                    style={{
                      marginTop: 0,
                      padding: '12px 16px',
                      background: 'url(/bg-title.png) center/cover no-repeat',
                      color: '#dfffff',
                      border: 'none',
                      borderRadius: 0,
                      gap: 0,
                      fontFamily: 'Eurostile, sans-serif',
                      letterSpacing: 3,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      width: 320,
                      marginBottom: 8,
                      maxWidth: '100%'
                    }}
                  >
                    LOGIN
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
