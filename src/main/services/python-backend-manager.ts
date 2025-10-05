/**
 * Python Backend Manager
 * Spawns and manages the Python backend process
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { app } from 'electron';

export class PythonBackendManager {
  private process: ChildProcess | null = null;
  private port = 8765;
  private host = '127.0.0.1';
  private isReady = false;

  /**
   * Start the Python backend server
   */
  async start(): Promise<void> {
    console.log('Starting Python backend...');

    // Determine Python executable path
    const pythonPath = this.getPythonPath();
    const scriptPath = this.getScriptPath();

    console.log(`Python: ${pythonPath}`);
    console.log(`Script: ${scriptPath}`);

    // Spawn Python process
    this.process = spawn(pythonPath, [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
        BACKEND_HOST: this.host,
        BACKEND_PORT: this.port.toString(),
      },
      cwd: path.join(app.getAppPath(), 'backend'),
    });

    // Handle stdout
    this.process.stdout?.on('data', (data) => {
      const message = data.toString();
      console.log(`[Python Backend] ${message}`);
      
      // Check if server is ready
      if (message.includes('Uvicorn running') || message.includes('Application startup complete')) {
        this.isReady = true;
      }
    });

    // Handle stderr
    this.process.stderr?.on('data', (data) => {
      console.error(`[Python Backend Error] ${data.toString()}`);
    });

    // Handle process exit
    this.process.on('exit', (code, signal) => {
      console.log(`Python backend exited with code ${code}, signal ${signal}`);
      this.isReady = false;
    });

    // Handle errors
    this.process.on('error', (error) => {
      console.error('Failed to start Python backend:', error);
      this.isReady = false;
    });

    // Wait for server to be ready
    await this.waitForServer();
  }

  /**
   * Wait for the server to be ready
   */
  private async waitForServer(timeoutMs: number = 30000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        const response = await fetch(`http://${this.host}:${this.port}/health`);
        if (response.ok) {
          console.log('✅ Python backend is ready');
          this.isReady = true;
          return;
        }
      } catch (e) {
        // Server not ready yet, wait and retry
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error('Python backend failed to start within timeout');
  }

  /**
   * Stop the Python backend server
   */
  stop(): void {
    if (this.process) {
      console.log('Stopping Python backend...');
      this.process.kill('SIGTERM');
      
      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          console.log('Force killing Python backend...');
          this.process.kill('SIGKILL');
        }
      }, 5000);
      
      this.process = null;
      this.isReady = false;
    }
  }

  /**
   * Check if the backend is ready
   */
  isBackendReady(): boolean {
    return this.isReady;
  }

  /**
   * Get WebSocket URL
   */
  getWebSocketUrl(): string {
    return `ws://${this.host}:${this.port}/ws/agent`;
  }

  /**
   * Get HTTP base URL
   */
  getHttpUrl(): string {
    return `http://${this.host}:${this.port}`;
  }

  /**
   * Get Python executable path
   */
  private getPythonPath(): string {
    const isDev = !app.isPackaged;
    
    if (isDev) {
      // In development, use venv Python
      if (process.platform === 'win32') {
        return path.join(app.getAppPath(), 'backend', 'venv', 'Scripts', 'python.exe');
      } else {
        return path.join(app.getAppPath(), 'backend', 'venv', 'bin', 'python');
      }
    } else {
      // In production, use bundled Python
      // TODO: Configure electron-builder to bundle Python
      return 'python';  // Fallback to system Python
    }
  }

  /**
   * Get script path
   */
  private getScriptPath(): string {
    return path.join(app.getAppPath(), 'backend', 'main.py');
  }
}
