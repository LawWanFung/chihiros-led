import { mount } from 'svelte';
import { useRegisterSW } from 'virtual:pwa-register/svelte';
import App from './App.svelte';

// Register the PWA service worker (auto-update on new builds).
useRegisterSW();

const target = document.getElementById('app');
if (!target) throw new Error('#app element not found');

const app = mount(App, { target });

export default app;
