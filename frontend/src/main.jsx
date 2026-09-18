/**
 * main.jsx — Application entry point.
 *
 * Wraps `<App />` with:
 *  - React.StrictMode  (dev warnings)
 *  - HelmetProvider    (react-helmet-async for SEO)
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>,
);