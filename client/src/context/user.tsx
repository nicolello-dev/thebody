// user-context.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  PropsWithChildren,
} from 'react';
import { BACKEND_IP, BACKEND_PORT } from '../common';

export type User = {
  name: string;
  hunger: number;
  thirst: number;
  oxygen: number;
  sleep: number;
  biofeedback: number;
  temperature: number;
  unlockedAreas: Array<[number, number]>;
  inventory: Array<any>;
};

type Ctx = {
  user: User | null;
  name: string | null;
  setName: (n: string | null) => void;
  loading: boolean;
  error: string | null;
  revision: number;
  refresh: () => Promise<void>;
};

const UserContext = createContext<Ctx | undefined>(undefined);

export function UserProvider({ children }: PropsWithChildren<{}>) {
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);

  // Read initial auth and subscribe to your custom auth event
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const readAuth = () => {
      try {
        const raw = localStorage.getItem('thebody.auth');
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed?.user) setName(parsed.user as string);
        else setName(null);
      } catch (e) {
        console.error('Auth parse error:', e);
        setName(null);
      }
    };

    // initial
    readAuth();

    // listen for external auth changes
    const handler = () => {
      console.log('thebody-auth-changed event received');
      readAuth();
    };
    window.addEventListener('thebody-auth-changed', handler);

    return () => window.removeEventListener('thebody-auth-changed', handler);
  }, []);

  const refresh = useCallback(async () => {
    setRevision(r => r + 1);
    if (!name) {
      setUser(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `http://${BACKEND_IP}:${BACKEND_PORT}/user?name=${encodeURIComponent(
          name,
        )}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as User;
      setUser(data);
    } catch (err: any) {
      console.error('Errore nel fetch user:', err);
      setError(err?.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [name]);

  // Fetch when name changes
  useEffect(() => {
    refresh();
  }, [refresh]);

  // WebSocket live updates tied to `name`
  useEffect(() => {
    if (!name) {
      // close any previous socket if user logs out
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        wsRef.current.close();
      }
      wsRef.current = null;
      return;
    }

    const ws = new WebSocket(
      `ws://${BACKEND_IP}:${BACKEND_PORT}/ws?name=${encodeURIComponent(name)}`,
    );
    wsRef.current = ws;

    ws.addEventListener('open', () => {
      console.log('Connected to websocket!');
    });

    // Assume any message means "data changed" → refetch
    const onMessage = () => void refresh();
    ws.addEventListener('message', onMessage);

    ws.addEventListener('error', e => {
      console.warn('WebSocket error:', e);
    });

    return () => {
      ws.removeEventListener('message', onMessage);
      if (ws.readyState !== WebSocket.CLOSED) ws.close();
      if (wsRef.current === ws) wsRef.current = null;
    };
  }, [name, refresh]);

  // Optional: dev fallback (only when no user yet)
  const devFallback: User | null = !user
    ? {
        name: 'debug-user',
        hunger: 50,
        thirst: 40,
        oxygen: 90,
        sleep: 70,
        biofeedback: 65,
        temperature: 22,
        inventory: [],
        unlockedAreas: [],
      }
    : null;

  const value = useMemo<Ctx>(
    () => ({
      user: user ?? devFallback,
      name,
      setName,
      loading,
      error,
      refresh,
      revision,
    }),
    [user, devFallback, name, loading, error, refresh],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

// Consumer hook
export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within <UserProvider />');
  return ctx;
}
