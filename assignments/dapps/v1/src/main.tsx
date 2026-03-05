import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { Web3Provider } from './providers/Web3Provider.tsx';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);

root.render(
  <Web3Provider>
    <App />
  </Web3Provider>
);
