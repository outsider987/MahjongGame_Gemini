
import { io, Socket } from "socket.io-client";
import { AppView, GameStateEnum } from "../types";
import { MockBackend, MockSocket } from './MockBackend';

// Define Server-to-Client Events
export interface ServerEvents {
  "game:state": (state: any) => void;
  "game:effect": (effect: any) => void;
  "game:error": (msg: string) => void;
}

// Define Client-to-Server Events
export interface ClientEvents {
  "action:join": (roomId: string) => void;
  "action:discard": (tileIndex: number) => void;
  "action:operate": (action: string, data?: any) => void;
  "game:restart": () => void;
}

class SocketService {
  // Allow type to be real Socket OR MockSocket
  public socket: any | null = null;
  private mockBackend: MockBackend | null = null;

  public connect(url: string = "http://localhost:8080"): any {
    if (this.socket) return this.socket;

    // --- SWITCH TO MOCK MODE FOR AI STUDIO ---
    const USE_MOCK = true; 

    if (USE_MOCK) {
        console.log("⚠️ Using Local Mock Backend for AI Studio...");
        this.mockBackend = new MockBackend();
        this.socket = this.mockBackend.socket;
        
        // Trigger connection manually
        this.mockBackend.connect();
        
        return this.socket;
    }

    // Real Socket Logic (Disabled for now)
    this.socket = io(url, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });

    this.socket.on("connect", () => {
      console.log("Connected to Mahjong Backend:", this.socket?.id);
    });

    return this.socket;
  }

  public disconnect() {
    if (this.socket && this.socket.disconnect) {
      this.socket.disconnect();
    }
    this.socket = null;
  }

  public joinRoom(roomId: string) {
    this.socket?.emit("action:join", roomId);
  }

  public sendDiscard(tileIndex: number) {
    this.socket?.emit("action:discard", tileIndex);
  }

  public sendAction(action: 'PONG' | 'KONG' | 'CHOW' | 'HU' | 'PASS') {
    this.socket?.emit("action:operate", action);
  }
  
  public restartGame() {
    this.socket?.emit("game:restart");
  }
}

export const socketService = new SocketService();
