import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// PWA Install prompt
let deferredPrompt: Event | null = null;

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event so it can be triggered later
  deferredPrompt = e;
  // Update UI notify the user they can install the PWA
  console.log('PWA install prompt available');
});

window.addEventListener('appinstalled', () => {
  console.log('PWA was installed');
  deferredPrompt = null;
});

createRoot(document.getElementById('root')!).render(<App />);