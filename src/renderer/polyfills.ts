// Polyfills for Electron renderer process

// Fix for "global is not defined" error
(window as any).global = window;

// Fix for process if needed
if (typeof (window as any).process === 'undefined') {
  (window as any).process = { env: {} };
}

export {};
