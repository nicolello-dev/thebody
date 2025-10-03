import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { BACKEND_IP, BACKEND_PORT } from '../common';
import { useUser } from '../context/user';

type GmPlayer = {
  name: string;
  hunger: number;
  thirst: number;
  sleep: number;
  oxygen: number;
  energy: number;
  biofeedback: number;
  temperature: number;
  isRobot: number;
  isSick: number;
  inventory: Array<{
    id: string;
    name: string;
    icon?: string;
    w?: number;
    h?: number;
  }>;
};

type StatProps = {
  label: string;
  value: number;
  color: string;
};

const StatBar: React.FC<StatProps> = ({ label, value, color }) => {
  const pct = useMemo(() => Math.max(0, Math.min(100, value)), [value]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>
        {label}
      </div>
      <div
        style={{
          height: 6,
          width: '100%',
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 4,
          overflow: 'hidden',
        }}
        aria-hidden
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: color,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
};

export default function GMOverlay() {
  const { user, revision } = useUser();
  const isGm = Boolean(user?.isGm);
  const gmName = user?.name ?? null;

  const [players, setPlayers] = useState<GmPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [command, setCommand] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transferring, setTransferring] = useState<string | null>(null);

  const fetchState = useCallback(async () => {
    if (!isGm || !gmName) return;
    try {
      const res = await fetch(
        `http://${BACKEND_IP}:${BACKEND_PORT}/gm/state?name=${encodeURIComponent(
          gmName,
        )}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { players?: GmPlayer[] };
      setPlayers(data.players ?? []);
      setError(null);
    } catch (err: any) {
      console.error('GM state error', err);
      setError(err?.message ?? 'Errore di rete');
    }
  }, [gmName, isGm]);

  useEffect(() => {
    if (!isGm) return;
    fetchState();
  }, [fetchState, isGm, revision]);

  useEffect(() => {
    if (!isGm) return;
    const id = window.setInterval(() => fetchState(), 5000);
    return () => window.clearInterval(id);
  }, [fetchState, isGm]);

  const sendCommand = useCallback(async () => {
    if (!command.trim() || !gmName) return;
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`http://${BACKEND_IP}:${BACKEND_PORT}/gm/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: gmName, command }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as any)?.error ?? `HTTP ${res.status}`);
      }
      setFeedback((data as any)?.message ?? 'Comando eseguito');
      setCommand('');
      fetchState();
    } catch (err: any) {
      console.error('GM command error', err);
      setFeedback(err?.message ?? 'Errore comando');
    } finally {
      setLoading(false);
    }
  }, [command, fetchState, gmName]);

  const handleTransfer = useCallback(
    async (from: string, itemId: string) => {
      if (!gmName) return;
      setTransferring(itemId);
      setFeedback(null);
      try {
        const res = await fetch(`http://${BACKEND_IP}:${BACKEND_PORT}/gm/transfer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: gmName, from, itemId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error((data as any)?.error ?? `HTTP ${res.status}`);
        }
        setFeedback((data as any)?.message ?? 'Item trasferito');
        fetchState();
      } catch (err: any) {
        console.error('GM transfer error', err);
        setFeedback(err?.message ?? 'Errore trasferimento');
      } finally {
        setTransferring(null);
      }
    },
    [fetchState, gmName],
  );

  if (!isGm || !gmName) return null;

  const others = players.filter(p => p.name !== gmName);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: 24,
        width: 360,
        maxHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 16,
        background: 'rgba(6, 18, 32, 0.88)',
        border: '1px solid rgba(79,198,255,0.35)',
        borderRadius: 12,
        boxShadow: '0 18px 32px rgba(0,0,0,0.45)',
        color: '#dfffff',
        fontFamily: 'Eurostile, sans-serif',
        zIndex: 4000,
        backdropFilter: 'blur(6px)',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ fontSize: 12, letterSpacing: 2, opacity: 0.8 }}>
          GM CONSOLE
        </div>
        {loading && (
          <div style={{ fontSize: 11, color: '#9fb8c7' }}>esecuzione…</div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={command}
          onChange={e => setCommand(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              sendCommand();
            }
          }}
          placeholder='Inserisci comando GM…'
          style={{
            flex: 1,
            background: 'rgba(12, 30, 48, 0.85)',
            border: '1px solid rgba(79,198,255,0.28)',
            borderRadius: 6,
            padding: '8px 10px',
            color: '#dfffff',
            fontFamily: 'Eurostile, sans-serif',
            fontSize: 13,
          }}
        />
        <button
          onClick={sendCommand}
          disabled={loading || !command.trim()}
          style={{
            padding: '8px 12px',
            background: 'linear-gradient(135deg, #2fc8ff, #167bff)',
            border: 'none',
            borderRadius: 6,
            color: '#041520',
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: 1,
            cursor: 'pointer',
            opacity: loading || !command.trim() ? 0.6 : 1,
          }}
        >
          INVIA
        </button>
      </div>
      {feedback && (
        <div style={{ fontSize: 12, color: '#9be7ff', minHeight: 18 }}>{feedback}</div>
      )}
      {error && (
        <div style={{ fontSize: 12, color: '#ff8686', minHeight: 18 }}>{error}</div>
      )}
      <div
        style={{
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          paddingRight: 4,
        }}
      >
        {others.length === 0 && (
          <div style={{ fontSize: 12, color: '#9fb8c7' }}>
            Nessun altro giocatore collegato.
          </div>
        )}
        {others.map(player => (
          <div
            key={player.name}
            style={{
              border: '1px solid rgba(79,198,255,0.18)',
              borderRadius: 10,
              padding: 10,
              background: 'rgba(8, 26, 42, 0.6)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 13,
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}
            >
              <span>{player.name}</span>
              <span style={{ fontSize: 11, color: player.isSick ? '#ff8787' : '#9fb8c7' }}>
                {player.isSick ? 'PATOLOGIA' : 'OK'}
              </span>
            </div>
            <StatBar label='Fame' value={player.hunger} color='#50fa7b' />
            <StatBar label='Sete' value={player.thirst} color='#57d7ff' />
            <StatBar label='Sonno' value={player.sleep} color='#d4b9ff' />
            <StatBar label='Ossigeno' value={player.oxygen} color='#ffa257' />
            {player.isRobot ? (
              <StatBar label='Energia' value={player.energy} color='#ffd257' />
            ) : (
              <StatBar label='Biofeedback' value={player.biofeedback} color='#ff6b9a' />
            )}
            {player.inventory.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 11, opacity: 0.75, letterSpacing: 1 }}>
                  Inventario
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 6,
                  }}
                >
                  {player.inventory.slice(0, 8).map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleTransfer(player.name, item.id)}
                      disabled={transferring === item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 8px',
                        background: 'rgba(12, 34, 52, 0.85)',
                        border: '1px solid rgba(79,198,255,0.22)',
                        borderRadius: 6,
                        color: '#dfffff',
                        fontSize: 11,
                        cursor: 'pointer',
                        opacity: transferring && transferring !== item.id ? 0.5 : 1,
                      }}
                    >
                      {item.icon && (
                        <img
                          src={item.icon}
                          alt={item.name}
                          style={{
                            width: 20,
                            height: 20,
                            objectFit: 'contain',
                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))',
                          }}
                          onError={e => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                      <span style={{ flex: 1, textAlign: 'left' }}>{item.name}</span>
                    </button>
                  ))}
                </div>
                {player.inventory.length > 8 && (
                  <div style={{ fontSize: 10, color: '#9fb8c7' }}>
                    … {player.inventory.length - 8} altri oggetti
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
