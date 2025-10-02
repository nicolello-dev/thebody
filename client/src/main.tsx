import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './App.css'; // il tuo css globale
import { UserProvider } from './context/user';
import { InventoryProvider } from './context/inventory';

const root = document.getElementById('root')!;
createRoot(root).render(
  <React.StrictMode>
    <BrowserRouter>
      <UserProvider>
        <InventoryProvider>
          <App />
        </InventoryProvider>
      </UserProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
