import { initPortal } from './portal.js?v2';
// portal builds only: start the portal SDK before the game reads saves or shows UI
await initPortal();
await import('./main.js');
