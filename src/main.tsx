import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { runOneTimePermanentWipeoutSync } from './utils/purgeHistories';

// Execute one-time permanent wipeout before React mounts (only if app_reset_v1 flag is not set)
runOneTimePermanentWipeoutSync();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

