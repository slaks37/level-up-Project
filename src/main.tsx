import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import App from './App';
import { ADMIN_HOST, ADMIN_URL, isAdminPath, PUBLIC_HOST } from './routes';

const { hostname, pathname } = window.location;

if (hostname === PUBLIC_HOST && isAdminPath(pathname)) {
  window.location.replace(ADMIN_URL);
} else {
  if (hostname !== ADMIN_HOST) registerSW({ immediate: true });

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
