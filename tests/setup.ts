// Test setup file for Jest
import '@testing-library/jest-dom';

// Mock Electron APIs for testing
const mockElectronAPI = {
  project: {
    create: jest.fn(),
    open: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    list: jest.fn(),
    getCurrent: jest.fn(),
  },
  file: {
    read: jest.fn(),
    write: jest.fn(),
    delete: jest.fn(),
    rename: jest.fn(),
    list: jest.fn(),
    watch: jest.fn(),
    unwatch: jest.fn(),
  },
  agent: {
    sendMessage: jest.fn(),
    getResponse: jest.fn(),
    listAvailable: jest.fn(),
    getStatus: jest.fn(),
    executeTask: jest.fn(),
  },
  app: {
    getVersion: jest.fn().mockResolvedValue('0.1.0'),
    getPath: jest.fn(),
    quit: jest.fn(),
  },
  window: {
    minimize: jest.fn(),
    maximize: jest.fn(),
    close: jest.fn(),
    toggleDevTools: jest.fn(),
  },
};

// Add mock to global window object
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
