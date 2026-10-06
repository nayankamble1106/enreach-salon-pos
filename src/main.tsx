import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { purgeMembersAndLoyaltyPassesOnlySync } from './utils/purgeHistories';

// Immediately purge only Members List and Membership History data on launch
purgeMembersAndLoyaltyPassesOnlySync();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

