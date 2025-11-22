
import { GameStateDTO, Player, Tile, Suit, ActionType, Meld, InitData } from '../types';
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
  
  private timerInterval: any = null;
  private botTimeout: any = null;
  private initTimeouts: any[] = [];

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
        this.clearTimers();
        this.initGame();
        break;
    }
  }

  private clearTimers() {
      if (this.timerInterval) clearInterval(this.timerInterval);
      if (this.botTimeout) clearTimeout(this.botTimeout);
      this.initTimeouts.forEach(t => clearTimeout(t));
      this.initTimeouts = [];
      this.timerInterval = null;
      this.botTimeout = null;
  }

  private initGame() {
    this.deck = generateDeck();
    this.clearTimers();
    
    // Setup Players Structure (Empty Hands initially)
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

    // STATE_INIT: Seat Grabbing Sequence (抓位)
    this.state.turn = -1;
    this.state.state = 'STATE_INIT'; 
    this.state.actionTimer = 0;
    
    // Step 1: Waiting (Start)
    this.state.initData = { step: 'WAITING', diceValues: [], windAssignment: {} };
    this.broadcastState();
    this.socket.trigger('game:effect', { type: 'TEXT', text: '準備抓位' });

    // Step 2: Dice Roll (After 1s)
    this.initTimeouts.push(setTimeout(() => {
        const d1 = Math.floor(Math.random() * 6) + 1;
        const d2 = Math.floor(Math.random() * 6) + 1;
        
        this.state.initData = { 
            step: 'DICE', 
            diceValues: [d1, d2], 
            windAssignment: {} 
        };
        this.socket.trigger('game:effect', { type: 'TEXT', text: `擲骰: ${d1} + ${d2}` });
        this.broadcastState();

        // Step 3: Shuffle Winds (After 2.5s)
        this.initTimeouts.push(setTimeout(() => {
             this.state.initData = { 
                step: 'SHUFFLE', 
                diceValues: [d1, d2], 
                windAssignment: {} 
            };
            this.broadcastState();

            // Step 4: Reveal Winds (After 2s)
            this.initTimeouts.push(setTimeout(() => {
                // Assign standard positions: P0=East, P1=South...
                const winds: Record<string, string> = { 
                    "0": 'EAST', "1": 'SOUTH', "2": 'WEST', "3": 'NORTH' 
                };
                
                this.state.initData = { 
                    step: 'REVEAL', 
                    diceValues: [d1, d2], 
                    windAssignment: winds 
                };
                this.broadcastState();
                
                // Step 5: Start Game (After 3s)
                this.initTimeouts.push(setTimeout(() => {
                    this.state.initData = undefined; // Clear Init Data
                    this.dealTiles();
                }, 3000));

            }, 2000));
        }, 2500));
    }, 1000));
  }

  private dealTiles() {
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
    
    // Start the turn timer for the Dealer
    this.startTurnTimer();
  }

  private startTurnTimer() {
      if (this.timerInterval) clearInterval(this.timerInterval);
      
      // 10 Seconds Thinking Time per prompt
      this.state.actionTimer = 10;
      this.broadcastState();

      this.timerInterval = setInterval(() => {
          this.state.actionTimer--;
          
          if (this.state.actionTimer <= 0) {
              this.handleTimeout();
          } else {
              // Broadcast time updates
              this.broadcastState(); 
          }
      }, 1000);
  }

  private handleTimeout() {
      this.clearTimers();
      const currentPlayerIdx = this.state.turn;
      const player = this.players[currentPlayerIdx];
      
      // Auto discard the NEWEST tile (last in the array)
      // This assumes the new tile was pushed to the end and hand was not sorted yet
      const tileIndex = player.hand.length - 1;
      
      // Visual feedback
      this.socket.trigger('game:effect', { type: 'TEXT', text: '超時自動出牌' });
      
      this.performDiscard(currentPlayerIdx, tileIndex);
  }

  private handleHumanDiscard(tileIndex: number) {
    if (this.state.turn !== 0) return;
    
    // Stop the timer since human acted
    this.clearTimers();
    this.performDiscard(0, tileIndex);
  }

  private performDiscard(playerIdx: number, tileIndex: number) {
    const player = this.players[playerIdx];
    if (tileIndex < 0 || tileIndex >= player.hand.length) return;

    const tile = player.hand.splice(tileIndex, 1)[0];
    player.discards.push(tile);
    
    // Important: Sort hand AFTER discard, so the hand structure is clean for next wait
    this.sortHand(player.hand);

    this.state.lastDiscard = { tile, playerIndex: playerIdx };
    this.state.state = 'WAIT'; // State where other players could interact (Pong/Kong)
    this.broadcastState();

    // Check for wins/interactions here (Mock skipped for brevity)
    
    // Delay before next turn
    setTimeout(() => {
        this.nextTurn(playerIdx + 1);
    }, 800);
  }

  private nextTurn(playerIdx: number) {
    this.clearTimers();
    
    const idx = playerIdx % 4;
    this.state.turn = idx;

    // Draw Tile
    if (this.deck.length === 0) {
        this.socket.trigger('game:effect', { type: 'TEXT', text: '流局' });
        this.state.state = 'GAME_OVER';
        this.broadcastState();
        return;
    }

    const newTile = this.deck.pop()!;
    this.players[idx].hand.push(newTile);
    // NOTE: Do NOT sort here. Keep new tile at the end for auto-discard logic.
    
    this.state.lastDiscard = null; 
    
    if (idx === 0) {
        this.state.state = 'DISCARD';
    } else {
        this.state.state = 'THINKING';
        // Simulate Bot "Thinking" but ensure they act within the timer window
        // If this timeout fails, the main server timer (startTurnTimer) will catch it.
        this.botTimeout = setTimeout(() => {
            this.botDiscard(idx);
        }, 1500 + Math.random() * 2000);
    }

    // Start the hard limit timer for EVERYONE (Human and Bot)
    this.startTurnTimer();
  }

  private botDiscard(playerIdx: number) {
    // Bot acted, so we clear the hard limit timer
    this.clearTimers();
    
    const player = this.players[playerIdx];
    // Random discard
    const discardIdx = Math.floor(Math.random() * player.hand.length);
    this.performDiscard(playerIdx, discardIdx);
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
      actionTimer: this.state.actionTimer, 
      availableActions: this.state.availableActions,
      initData: this.state.initData
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
