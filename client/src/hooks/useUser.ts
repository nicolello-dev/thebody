import { useEffect, useState } from 'react';
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
};

export function useUser(): User {
  const [user, setUser] = useState<User | null>(null);

  const name = 'test';

  async function updateUserData() {
    try {
      const userData = await fetch(
        `http://${BACKEND_IP}:${BACKEND_PORT}/user?name=${name}`,
      ).then(res => res.json());

      setUser(userData);
    } catch (err) {
      console.error('Errore nel fetch user:', err);
    }
  }

  useEffect(() => {
    updateUserData();
    const ws = new WebSocket(
      `ws://${BACKEND_IP}:${BACKEND_PORT}/ws?name=${name}`,
    );

    ws.addEventListener('open', () => {
      console.log('Connected to websocket!');
    });

    ws.addEventListener('message', updateUserData);

    return () => {
      if (!ws.CLOSED) ws.close();
    };
  }, []);

  // fallback fasullo (debug) se user è null
  const fakeUser: User = {
    name: 'debug-user',
    hunger: 50,
    thirst: 40,
    oxygen: 90,
    sleep: 70,
    biofeedback: 65,
    temperature: 22,
    unlockedAreas: [],
  };

  return user ?? fakeUser;
}
