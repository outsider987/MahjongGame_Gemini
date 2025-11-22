
import { GameStateDTO, Player, Tile, Suit, ActionType, Meld } from '../types';
import { generateDeck } from './mahjongLogic';
import { MOCK_PLAYERS } from '../constants';

type EventHandler = (...args: any[]) => void;

export class MockSocket {
  private listeners: Record<string, EventHandler[]> = {};
  private backend: MockBackend;

  constructor(backend: MockBackend) {
    this.backend = backend;
  }

  // Client calls this to listen to server events
  on(event: string, callback: EventHandler) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event: string) {
    delete this.listeners[event];
  }

  // Client calls this to send events to "server"
  emit(event: string, ...args: any[]) {
    // Simulate network delay
    setTimeout(() => {
        this.backend.handleClientEvent(event, ...args);
    }, 10);
  }

  // Backend calls this to push events to client
  trigger(event: string, ...args: any[]) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(...args));
    }
  }
}

export class MockBackend {
  public socket: MockSocket;
  private state: GameStateDTO;
  private deck: Tile[];
  private players: {
    info: Player;
    hand: Tile[];
    discards: Tile[];
    melds: Meld[];
  }[];

  constructor() {
    this.socket = new MockSocket(this);
    this.deck = [];
    this.players = [];
    
    // Initialize empty state
    this.state = {
      deckCount: 0,
      players: [],
      turn: -1,
      state: 'INIT',
      lastDiscard: null,
      actionTimer: 0,
      availableActions: []
    };
  }

  public connect() {
    // Simulate connection handshake
    setTimeout(() => {
      this.socket.trigger('connect');
      this.initGame();
    }, 500);
  }

  public handleClientEvent(event: string, ...args: any[]) {
    switch (event) {
      case 'action:join':
        // Auto start when joined
        break;
      case 'action:discard':
        this.handleHumanDiscard(args[0]);
        break;
      case 'action:operate':
        // Handle PASS, PONG, etc.
        if (args[0] === 'PASS') {
            this.nextTurn((this.state.turn + 1) % 4);
        }
        break;
      case 'game:restart':
        this.initGame();
        break;
    }
  }

  private initGame() {
    this.deck = generateDeck();
    
    // Setup Players
    this.players = [0, 1, 2, 3].map(i => ({
      info: {
        id: i === 0 ? 10001 : MOCK_PLAYERS[i].id,
        name: i === 0 ? "玩家 (您)" : MOCK_PLAYERS[i].name,
        avatar: "",
        score: i === 0 ? 2000 : MOCK_PLAYERS[i].score,
        isDealer: i === 0,
        flowerCount: 0,
        wind: ["東", "南", "西", "北"][i],
        seatWind: ["東", "南", "西", "北"][i]
      },
      hand: [],
      discards: [],
      melds: []
    }));

    // Deal Tiles (16 each)
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 16; j++) {
        if (this.deck.length > 0) {
          this.players[i].hand.push(this.deck.pop()!);
        }
      }
      this.sortHand(this.players[i].hand);
    }

    // Dealer (P0) gets 17th tile
    this.players[0].hand.push(this.deck.pop()!);
    
    this.state.turn = 0; // P0 starts
    this.state.state = 'DISCARD';
    this.state.lastDiscard = null;
    this.broadcastState();
    
    this.socket.trigger('game:effect', { type: 'TEXT', text: '遊戲開始' });
  }

  private handleHumanDiscard(tileIndex: number) {
    if (this.state.turn !== 0) return;

    const p0 = this.players[0];
    if (tileIndex < 0 || tileIndex >= p0.hand.length) return;

    const tile = p0.hand.splice(tileIndex, 1)[0];
    p0.discards.push(tile);
    this.sortHand(p0.hand);

    this.state.lastDiscard = { tile, playerIndex: 0 };
    this.state.state = 'WAIT';
    this.broadcastState();

    // Simple delay before next player
    setTimeout(() => {
        this.nextTurn(1);
    }, 800);
  }

  private nextTurn(playerIdx: number) {
    const idx = playerIdx % 4;
    this.state.turn = idx;

    // Draw Tile
    if (this.deck.length === 0) {
        this.socket.trigger('game:effect', { type: 'TEXT', text: '流局' });
        return;
    }

    const newTile = this.deck.pop()!;
    this.players[idx].hand.push(newTile);
    
    this.state.lastDiscard = null; // Reset last discard on draw
    this.broadcastState();

    if (idx === 0) {
        // Human Turn
        this.state.state = 'DISCARD';
        this.broadcastState();
    } else {
        // Bot Turn
        this.state.state = 'THINKING';
        this.broadcastState();
        
        // Simulate Thinking
        setTimeout(() => {
            this.botDiscard(idx);
        }, 1000 + Math.random() * 1000);
    }
  }

  private botDiscard(playerIdx: number) {
    const player = this.players[playerIdx];
    // Simple AI: Random discard (excluding flowers/bonus if we had logic for that)
    // For now, random index
    const discardIdx = Math.floor(Math.random() * player.hand.length);
    const tile = player.hand.splice(discardIdx, 1)[0];
    
    player.discards.push(tile);
    this.sortHand(player.hand);
    
    this.state.lastDiscard = { tile, playerIndex: playerIdx };
    this.broadcastState();

    // Check if Human can PONG/WIN (Mock logic: random chance to show buttons for demo)
    // In a real engine, we'd check tiles.
    /* 
    if (Math.random() > 0.8) {
         this.state.availableActions = ['PONG', 'PASS'];
         this.broadcastState();
         // Wait for human action...
         return; 
    }
    */

    // Pass to next
    setTimeout(() => {
        this.nextTurn(playerIdx + 1);
    }, 800);
  }

  private broadcastState() {
    // Convert internal state to DTO (hide other players' hands)
    const dto: GameStateDTO = {
      deckCount: this.deck.length,
      players: this.players.map((p, i) => ({
        info: p.info,
        hand: i === 0 ? p.hand : [], // Only send P0 hand
        handCount: p.hand.length,    // Send count for others
        discards: p.discards,
        melds: p.melds
      })),
      turn: this.state.turn,
      state: this.state.state,
      lastDiscard: this.state.lastDiscard,
      actionTimer: 15, // Mock timer
      availableActions: this.state.availableActions
    };
    this.socket.trigger('game:state', dto);
  }

  private sortHand(hand: Tile[]) {
    hand.sort((a, b) => {
        if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
        return a.value - b.value;
    });
  }
}
