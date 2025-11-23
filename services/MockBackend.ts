
import { MockStateStore } from './mock/MockStateStore';
import { MockBot } from './mock/MockBot';
import { InitState } from './mock/states/InitState';
import { IMockContext, IGameState } from './mock/MockDomain';

// Re-implementing MockSocket to attach to Backend
export class MockSocket {
  private listeners: Record<string, ((...args: any[]) => void)[]> = {};
  private backend: MockBackend;

  constructor(backend: MockBackend) {
    this.backend = backend;
  }

  on(event: string, callback: (...args: any[]) => void) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }
  
  off(event: string) { delete this.listeners[event]; }

  // Receive from Client
  emit(event: string, ...args: any[]) {
    // Async simulation
    setTimeout(() => this.backend.handleClientEvent(event, ...args), 10);
  }

  // Send to Client
  trigger(event: string, ...args: any[]) {
    if (this.listeners[event]) this.listeners[event].forEach(cb => cb(...args));
  }
}

export class MockBackend implements IMockContext {
  public socket: MockSocket;
  public store: MockStateStore;
  public bot: MockBot;
  
  public currentState: IGameState | null = null;
  private timeouts: any[] = [];
  // Removed local _timerInterval to use store's one

  constructor() {
    this.socket = new MockSocket(this);
    this.store = new MockStateStore();
    this.bot = new MockBot();
  }

  public connect() {
    setTimeout(() => {
      this.socket.trigger('connect');
      this.restartGame();
    }, 500);
  }

  public transitionTo(newState: IGameState) {
    console.log(`[Backend] Transitioning to ${newState.name}`);
    this.currentState = newState;
    this.currentState.enter(this);
  }

  public handleClientEvent(event: string, ...args: any[]) {
    switch (event) {
      case 'action:join':
        break;
      case 'action:discard':
        this.currentState?.handleDiscard(this, args[0]);
        break;
      case 'action:operate':
        this.currentState?.handleOperation(this, args[0]);
        break;
      case 'game:restart':
        this.restartGame();
        break;
    }
  }

  private restartGame() {
    this.clearTimers();
    this.transitionTo(new InitState());
  }

  // --- Context Utils ---

  public schedule(fn: () => void, delay: number) {
    const id = setTimeout(fn, delay);
    this.timeouts.push(id);
  }

  public clearTimers() {
    this.timeouts.forEach(t => clearTimeout(t));
    this.timeouts = [];
    if (this.store._timerInterval) {
        clearInterval(this.store._timerInterval);
        this.store._timerInterval = null;
    }
  }
}
