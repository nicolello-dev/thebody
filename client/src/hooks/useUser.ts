import { useEffect, useState } from "react";

export type User = {
  name: string;
  hunger: number;
  thirst: number;
  oxygen: number;
  sleep: number;
  biofeedback: number;
  temperature: number;
};

export function useUser(): User | null {
  const [user, setUser] = useState<User | null>(null);

  const BACKEND_IP = "localhost";
  const BACKEND_PORT = "3000";

  const name = "test";

  async function updateUserData() {
    const userData = await fetch(
      `http://${BACKEND_IP}:${BACKEND_PORT}/user?name=${name}`
    ).then((res) => res.json());

    setUser(userData);
  }

  useEffect(() => {
    updateUserData();
    const ws = new WebSocket(
      `ws://${BACKEND_IP}:${BACKEND_PORT}/ws?name=${name}`
    );

    ws.addEventListener("open", () => {
      console.log("Connected to websocket!");
    });

    ws.addEventListener("message", updateUserData);

    return () => {
      if (!ws.CLOSED) ws.close();
    };
  }, []);

  return user;
}
