import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept harmless extension messaging errors in iframe contexts
if (typeof window !== 'undefined') {
  window.onerror = (message, source, lineno, colno, error) => {
    const msg = String(message || '');
    const src = String(source || '');
    if (
      msg.includes('Could not establish connection') ||
      msg.includes('Receiving end does not exist') ||
      src.includes('chrome-extension://')
    ) {
      return true; // Suppress harmless extension error
    }
    return false;
  };

  window.onunhandledrejection = (event) => {
    const msg = event.reason?.message || String(event.reason || '');
    if (
      msg.includes('Could not establish connection') ||
      msg.includes('Receiving end does not exist') ||
      msg.includes('chrome-extension://')
    ) {
      event.preventDefault();
    }
  };

  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const msg = args.map(a => String(a)).join(' ');
    if (msg.includes('Could not establish connection. Receiving end does not exist') || msg.includes('chrome-extension://')) {
      return;
    }
    originalConsoleError(...args);
  };

  const originalConsoleWarn = console.warn;
  console.warn = (...args: any[]) => {
    const msg = args.map(a => String(a)).join(' ');
    if (msg.includes('Could not establish connection. Receiving end does not exist') || msg.includes('chrome-extension://')) {
      return;
    }
    originalConsoleWarn(...args);
  };

  window.addEventListener('error', (event) => {
    if (
      event.message?.includes('Could not establish connection. Receiving end does not exist') ||
      (event.filename && event.filename.startsWith('chrome-extension://'))
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const msg = event.reason?.message || String(event.reason || '');
    if (msg.includes('Could not establish connection. Receiving end does not exist') || msg.includes('Receiving end does not exist') || msg.includes('chrome-extension://')) {
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(<App />);

