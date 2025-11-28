
import { AppView, GameStateEnum, ActionType } from "../types";

// Environment configuration
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8080";

// Use mock backend for development when backend is not available
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

// Define Server-to-Client Events
export interface ServerEvents {
  "game:state": (state: any) => void;
  "game:effect": (effect: any) => void;
  "game:error": (msg: string) => void;
  "connected": (data: { user_id: number; display_name: string }) => void;
  "room:created": (data: { room_id: string }) => void;
  "room:players": (data: { players: any[]; count: number }) => void;
  "matchmaking:joined": (data: { message: string }) => void;
  "matchmaking:found": (data: { message: string }) => void;
}

// Define Client-to-Server Events
export interface ClientEvents {
  "action:join": (data: { roomId: string }) => void;
  "action:quickmatch": () => void;
  "action:create_room": (data: { baseScore: number; taiScore: number; rounds: number }) => void;
  "action:discard": (data: { tileIndex: number }) => void;
  "action:operate": (data: { action: string }) => void;
  "game:restart": () => void;
  "action:leave": () => void;
}

interface WebSocketMessage {
  event: string;
  data: any;
}

class SocketService {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private token: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  
  // Mock backend for development
  private mockBackend: any = null;
  private mockSocket: any = null;

  public connect(authToken?: string): this {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return this;
    }

    if (authToken) {
      this.token = authToken;
    }

    // Use mock mode for development
    if (USE_MOCK) {
      console.log("⚠️ Using Local Mock Backend for Development...");
      this.initMockBackend();
      return this;
    }

    if (!this.token) {
      console.warn("No auth token provided for WebSocket connection");
      return this;
    }

    const wsUrl = `${WS_URL}/ws?token=${encodeURIComponent(this.token)}`;
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log("Connected to Mahjong Backend");
        this.reconnectAttempts = 0;
        this.emit("connect");
      };

      this.ws.onclose = (event) => {
        console.log("WebSocket connection closed:", event.code, event.reason);
        this.emit("disconnect");
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.emit(message.event, message.data);
        } catch (e) {
          console.error("Failed to parse WebSocket message:", e);
        }
      };
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
    }

    return this;
  }

  private async initMockBackend() {
    // Dynamic import for mock backend
    const { MockBackend } = await import('./MockBackend');
    this.mockBackend = new MockBackend();
    this.mockSocket = this.mockBackend.socket;
    
    // Connect mock events to our listeners
    this.mockSocket.on("connect", () => this.emit("connect"));
    this.mockSocket.on("game:state", (state: any) => this.emit("game:state", state));
    this.mockSocket.on("game:effect", (effect: any) => this.emit("game:effect", effect));
    this.mockSocket.on("game:error", (msg: string) => this.emit("game:error", msg));
    
    // Trigger connection
    this.mockBackend.connect();
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("Max reconnection attempts reached");
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      if (this.token) {
        this.connect(this.token);
      }
    }, delay);
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.token = null;
    this.reconnectAttempts = 0;
  }

  public on(event: string, callback: (data?: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  public off(event: string, callback?: (data?: any) => void) {
    if (callback) {
      this.listeners.get(event)?.delete(callback);
    } else {
      this.listeners.delete(event);
    }
  }

  private emit(event: string, data?: any) {
    this.listeners.get(event)?.forEach(callback => callback(data));
  }

  private send(event: string, data?: any) {
    if (USE_MOCK && this.mockSocket) {
      this.mockSocket.emit(event, data);
      return;
    }
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, data }));
    } else {
      console.warn("WebSocket is not connected");
    }
  }

  // Game Actions
  public joinRoom(roomId: string) {
    if (USE_MOCK) {
      this.mockSocket?.emit("action:join", roomId);
    } else {
      this.send("action:join", { roomId });
    }
  }

  public quickMatch() {
    this.send("action:quickmatch");
  }

  public createRoom(baseScore = 100, taiScore = 20, rounds = 1) {
    this.send("action:create_room", { baseScore, taiScore, rounds });
  }

  public sendDiscard(tileIndex: number) {
    if (USE_MOCK) {
      this.mockSocket?.emit("action:discard", tileIndex);
    } else {
      this.send("action:discard", { tileIndex });
    }
  }

  public sendAction(action: ActionType) {
    if (USE_MOCK) {
      this.mockSocket?.emit("action:operate", action);
    } else {
      this.send("action:operate", { action });
    }
  }

  public restartGame() {
    if (USE_MOCK) {
      this.mockSocket?.emit("game:restart");
    } else {
      this.send("game:restart");
    }
  }

  public leaveRoom() {
    this.send("action:leave");
  }

  public isConnected(): boolean {
    if (USE_MOCK) {
      return true;
    }
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  // For debug mode
  public getDebugBackend() {
    return this.mockBackend;
  }
}

export const socketService = new SocketService();
