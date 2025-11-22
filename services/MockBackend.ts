
import { GameStateDTO, Player, Tile, Suit, ActionType, Meld, InitData } from '../types';
import { generateDeck } from './mahjongLogic';
import { MahjongRules } from './MahjongRules';
import { MOCK_PLAYERS } from '../constants';

type EventHandler = (...args: any[]) => void;

// New Types for Interaction Handling
interface PendingAction {
    playerIdx: number;
    type: ActionType;
    priority: number; // HU(100) > PONG/KONG(50) > CHOW(10)
}

export class MockSocket {
  private listeners: Record<string, EventHandler[]> = {};
  private backend: MockBackend;

  constructor(backend: MockBackend) {
    this.backend = backend;
  }

  on(event: string, callback: EventHandler) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event: string) {
    delete this.listeners[event];
  }

  emit(event: string, ...args: any[]) {
    setTimeout(() => {
        this.backend.handleClientEvent(event, ...args);
    }, 10);
  }

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

  // Interaction State
  private pendingClaims: PendingAction[] = [];
  private resolveTimer: any = null;

  constructor() {
    this.socket = new MockSocket(this);
    this.deck = [];
    this.players = [];
    
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
    setTimeout(() => {
      this.socket.trigger('connect');
      this.initGame();
    }, 500);
  }

  public handleClientEvent(event: string, ...args: any[]) {
    switch (event) {
      case 'action:join':
        break;
      case 'action:discard':
        this.handleHumanDiscard(args[0]);
        break;
      case 'action:operate':
        this.handleHumanOperation(args[0]); // args[0] is ActionType ('PONG', 'CHOW', etc)
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
      if (this.resolveTimer) clearTimeout(this.resolveTimer);
      this.initTimeouts.forEach(t => clearTimeout(t));
      this.initTimeouts = [];
      this.timerInterval = null;
      this.botTimeout = null;
      this.resolveTimer = null;
  }

  private initGame() {
    this.deck = generateDeck();
    this.clearTimers();
    
    this.players = [0, 1, 2, 3].map(i => ({
      info: {
        id: i === 0 ? 10001 : MOCK_PLAYERS[i].id,
        name: i === 0 ? "玩家 (您)" : MOCK_PLAYERS[i].name,
        avatar: "",
        score: i === 0 ? 2000 : MOCK_PLAYERS[i].score,
        isDealer: false,
        flowerCount: 0,
        wind: "",
        seatWind: "" 
      },
      hand: [],
      discards: [],
      melds: []
    }));

    this.state.turn = -1;
    this.state.state = 'STATE_INIT'; 
    this.state.actionTimer = 0;
    this.state.availableActions = [];
    
    this.state.initData = { step: 'WAITING', diceValues: [], windAssignment: {} };
    this.broadcastState();

    this.initTimeouts.push(setTimeout(() => {
        const d1 = Math.floor(Math.random() * 6) + 1;
        const d2 = Math.floor(Math.random() * 6) + 1;
        
        this.state.initData = { step: 'DICE', diceValues: [d1, d2], windAssignment: {} };
        this.socket.trigger('game:effect', { type: 'TEXT', text: `擲骰: ${d1} + ${d2}` });
        this.broadcastState();

        this.initTimeouts.push(setTimeout(() => {
             this.state.initData = { step: 'SHUFFLE', diceValues: [d1, d2], windAssignment: {} };
            this.broadcastState();

            this.initTimeouts.push(setTimeout(() => {
                const winds = [1, 2, 3, 4];
                for (let i = winds.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [winds[i], winds[j]] = [winds[j], winds[i]];
                }

                const assignment: Record<string, number> = {};
                const windNames = ["", "東", "南", "西", "北"];

                this.players.forEach((p, idx) => {
                    const windVal = winds[idx];
                    assignment[String(idx)] = windVal;
                    p.info.wind = windNames[windVal];
                    p.info.isDealer = (windVal === 1);
                });
                
                this.state.initData = { step: 'REVEAL', diceValues: [d1, d2], windAssignment: assignment };
                this.broadcastState();
                this.socket.trigger('game:effect', { type: 'TEXT', text: '決定莊家' });
                
                this.initTimeouts.push(setTimeout(() => {
                    this.state.initData = undefined;
                    this.dealTiles();
                }, 3000));

            }, 2000));
        }, 2500));
    }, 1000));
  }

  private dealTiles() {
    const dealerIdx = this.players.findIndex(p => p.info.isDealer);
    
    for (let i = 0; i < 4; i++) {
      this.players[i].hand = [];
      this.players[i].discards = [];
      this.players[i].melds = [];
      
      for (let j = 0; j < 16; j++) {
        if (this.deck.length > 0) this.players[i].hand.push(this.deck.pop()!);
      }
      this.sortHand(this.players[i].hand);
    }

    if (this.deck.length > 0) {
       this.players[dealerIdx].hand.push(this.deck.pop()!);
       this.sortHand(this.players[dealerIdx].hand);
    }
    
    this.state.turn = dealerIdx; 
    this.state.lastDiscard = null;

    // FIX: If dealer is bot, state must be THINKING, otherwise DISCARD
    this.state.state = dealerIdx === 0 ? 'DISCARD' : 'THINKING';
    
    this.broadcastState();
    this.socket.trigger('game:effect', { type: 'TEXT', text: '遊戲開始' });
    
    // IMPORTANT: Trigger bot logic if dealer is bot
    this.checkAutoTurn();
  }

  private startTurnTimer() {
      if (this.timerInterval) clearInterval(this.timerInterval);
      
      this.state.actionTimer = 10; // 10s for Discard
      this.broadcastState();

      this.timerInterval = setInterval(() => {
          this.state.actionTimer--;
          
          if (this.state.actionTimer <= 0) {
              this.handleTimeout();
          } else {
              this.broadcastState(); 
          }
      }, 1000);
  }

  private handleTimeout() {
      this.clearTimers();
      // If we were waiting for interactions (Resolve Mode)
      if (this.state.state === 'RESOLVE_ACTION') {
          this.executeBestBotActionOrNext();
          return;
      }

      // If we were waiting for a discard
      const currentPlayerIdx = this.state.turn;
      const player = this.players[currentPlayerIdx];
      const tileIndex = player.hand.length - 1;
      
      // If human timed out
      if (currentPlayerIdx === 0) {
          this.socket.trigger('game:effect', { type: 'TEXT', text: '超時自動出牌' });
          this.performDiscard(currentPlayerIdx, tileIndex);
      } else {
          // Should be handled by checkAutoTurn, but safe fallback
          this.botDiscard(currentPlayerIdx);
      }
  }

  private handleHumanDiscard(tileIndex: number) {
    if (this.state.turn !== 0) return;
    this.clearTimers();
    this.performDiscard(0, tileIndex);
  }

  private performDiscard(playerIdx: number, tileIndex: number) {
    const player = this.players[playerIdx];
    if (tileIndex < 0 || tileIndex >= player.hand.length) return;

    this.state.availableActions = []; // Clear actions on discard

    const tile = player.hand.splice(tileIndex, 1)[0];
    player.discards.push(tile);
    this.sortHand(player.hand);

    this.state.lastDiscard = { tile, playerIndex: playerIdx };
    
    // CRITICAL: Before next turn, check interactions (Chow/Pong/Kong/HU)
    this.checkInteractions(tile, playerIdx);
  }

  // --- INTERACTION LOGIC ---

  private checkInteractions(discard: Tile, sourcePlayerIdx: number) {
      this.pendingClaims = [];
      
      // Check every OTHER player
      for (let i = 1; i <= 3; i++) {
          const targetIdx = (sourcePlayerIdx + i) % 4;
          const p = this.players[targetIdx];
          const hand = p.hand;

          // HU (Ron) - Check if this discard completes the hand
          if (MahjongRules.checkWin(hand, discard)) {
               this.pendingClaims.push({ playerIdx: targetIdx, type: 'HU', priority: 100 });
          }

          // PONG (Pon) / KONG (Kan)
          if (MahjongRules.canKong(hand, discard)) {
               const isBot = targetIdx !== 0;
               // Bots claim KONG 50% of time
               if (!isBot || Math.random() > 0.5) {
                    this.pendingClaims.push({ playerIdx: targetIdx, type: 'KONG', priority: 50 });
               }
          } else if (MahjongRules.canPong(hand, discard)) {
               const isBot = targetIdx !== 0;
               // Bots claim PONG 60% of time
               if (!isBot || Math.random() > 0.4) { 
                    this.pendingClaims.push({ playerIdx: targetIdx, type: 'PONG', priority: 50 });
               }
          }

          // CHOW (Chi) - Only next player
          const isNextPlayer = targetIdx === (sourcePlayerIdx + 1) % 4;
          if (isNextPlayer && MahjongRules.canChow(hand, discard)) {
               // Only allow Human to Chow in this mock for simplicity (Bot Logic for Chow is complex)
               if (targetIdx === 0) {
                   this.pendingClaims.push({ playerIdx: targetIdx, type: 'CHOW', priority: 10 });
               }
          }
      }

      if (this.pendingClaims.length === 0) {
          // No interruptions, proceed to next turn
          setTimeout(() => this.nextTurn((sourcePlayerIdx + 1) % 4), 600);
          return;
      }

      // Interactions found!
      this.state.state = 'RESOLVE_ACTION';
      
      // 1. Check Max Priority
      const maxPriority = Math.max(...this.pendingClaims.map(c => c.priority));
      
      // 2. Check if Human (Idx 0) has a claim
      const humanClaims = this.pendingClaims.filter(c => c.playerIdx === 0);
      const botClaims = this.pendingClaims.filter(c => c.playerIdx !== 0);
      const maxBotPriority = botClaims.length > 0 ? Math.max(...botClaims.map(c => c.priority)) : 0;

      // If Human has a valid claim (equal or higher priority than best bot claim)
      if (humanClaims.length > 0 && humanClaims[0].priority >= maxBotPriority) {
          // Waiting for Human
          this.state.availableActions = humanClaims.map(c => c.type);
          this.state.availableActions.push('PASS');
          
          this.state.actionTimer = 8; 
          this.broadcastState();
          
          // Start Timer to auto-pass
          this.resolveTimer = setTimeout(() => {
              this.handleHumanOperation('PASS');
          }, 8000);
      } else {
          // Bot wins (or only Bots involved)
          this.state.availableActions = []; 
          this.broadcastState();
          
          setTimeout(() => {
              this.executeBestBotActionOrNext();
          }, 1000); 
      }
  }

  private handleHumanOperation(action: ActionType) {
      this.clearTimers();
      this.state.availableActions = [];
      this.broadcastState();

      if (action === 'PASS') {
          this.executeBestBotActionOrNext();
          return;
      }

      this.executeAction(0, action);
  }

  private executeBestBotActionOrNext() {
      // Filter for Bots
      const botClaims = this.pendingClaims.filter(c => c.playerIdx !== 0);
      
      if (botClaims.length === 0) {
          // No bot claims (meaning Human passed, and no bots wanted anything)
          const lastDiscarder = this.state.lastDiscard?.playerIndex || 0;
          this.nextTurn((lastDiscarder + 1) % 4);
          return;
      }

      // Find best claim (Priority then proximity)
      // Sort descending priority
      botClaims.sort((a, b) => b.priority - a.priority);
      const best = botClaims[0];
      
      this.executeAction(best.playerIdx, best.type);
  }

  private executeAction(playerIdx: number, type: ActionType) {
      const position = this.getPlayerPos(playerIdx);

      if (type === 'HU') {
           this.state.state = 'GAME_OVER';
           const player = this.players[playerIdx];
           // Add discard to hand to show full winning hand
           if (this.state.lastDiscard) {
               player.hand.push(this.state.lastDiscard.tile);
               this.sortHand(player.hand);
           }
           this.socket.trigger('game:effect', { type: 'TEXT', text: '胡了!', position });
           // Particle effect
           this.socket.trigger('game:effect', { type: 'PARTICLES', position });
           
           this.broadcastState();
           return;
      }

      const player = this.players[playerIdx];
      const discard = this.state.lastDiscard!.tile;
      
      // Execute Meld Logic
      if (type === 'PONG') {
          let removed = 0;
          player.hand = player.hand.filter(t => {
              if (removed < 2 && t.suit === discard.suit && t.value === discard.value) {
                  removed++;
                  return false;
              }
              return true;
          });
          const meld: Meld = { type: 'PONG', tiles: [discard, discard, discard], fromPlayer: this.state.lastDiscard!.playerIndex };
          player.melds.push(meld);
          this.socket.trigger('game:effect', { type: 'TEXT', text: '碰', position });

      } else if (type === 'CHOW') {
          const combo = MahjongRules.getChowCombination(player.hand, discard);
          if (combo) {
              combo.forEach(cTile => {
                 const idx = player.hand.findIndex(h => h.id === cTile.id);
                 if (idx > -1) player.hand.splice(idx, 1);
              });
              const meldTiles = [...combo, discard].sort((a, b) => a.value - b.value);
              const meld: Meld = { type: 'CHOW', tiles: meldTiles, fromPlayer: this.state.lastDiscard!.playerIndex };
              player.melds.push(meld);
              this.socket.trigger('game:effect', { type: 'TEXT', text: '吃', position });
          }
      } else if (type === 'KONG') {
           let removed = 0;
           player.hand = player.hand.filter(t => {
               if (removed < 3 && t.suit === discard.suit && t.value === discard.value) {
                   removed++;
                   return false;
               }
               return true;
           });
           const meld: Meld = { type: 'KONG', tiles: [discard, discard, discard, discard], fromPlayer: this.state.lastDiscard!.playerIndex };
           player.melds.push(meld);
           this.socket.trigger('game:effect', { type: 'TEXT', text: '槓', position });
           this.socket.trigger('game:effect', { type: 'LIGHTNING', position });
      }

      // Clean up discard from table
      const prevPlayer = this.players[this.state.lastDiscard!.playerIndex];
      prevPlayer.discards.pop();
      this.state.lastDiscard = null;

      // Turn moves to the actor
      this.state.turn = playerIdx;
      
      // Determine State
      this.state.state = playerIdx === 0 ? 'DISCARD' : 'THINKING';
      
      this.broadcastState();
      this.startTurnTimer();
      
      this.checkAutoTurn();
  }

  // --- TURN FLOW ---

  private nextTurn(playerIdx: number) {
    this.clearTimers();
    
    const idx = playerIdx % 4;
    this.state.turn = idx;

    if (this.deck.length === 0) {
        this.socket.trigger('game:effect', { type: 'TEXT', text: '流局' });
        this.state.state = 'GAME_OVER';
        this.broadcastState();
        return;
    }

    const newTile = this.deck.pop()!;
    this.players[idx].hand.push(newTile);
    this.sortHand(this.players[idx].hand);
    
    this.state.lastDiscard = null; 
    
    // Check Self Draw (Tsumo)
    if (MahjongRules.checkWin(this.players[idx].hand)) {
        if (idx === 0) {
             // Human can HU
             this.state.state = 'DISCARD'; 
             this.state.availableActions = ['HU']; 
        } else {
             // Bot Win (Tsumo)
             this.socket.trigger('game:effect', { type: 'TEXT', text: '自摸!', position: this.getPlayerPos(idx) });
             this.socket.trigger('game:effect', { type: 'PARTICLES', position: this.getPlayerPos(idx) });
             
             this.state.state = 'RESOLVE_ACTION'; 
             this.broadcastState();
             setTimeout(() => {
                  this.state.state = 'GAME_OVER';
                  this.broadcastState();
             }, 1500);
             return; // Stop flow
        }
    } else {
        this.state.availableActions = [];
    }
    
    if (idx === 0) {
        this.state.state = 'DISCARD';
    } else {
        this.state.state = 'THINKING';
    }

    this.broadcastState();
    this.startTurnTimer();
    
    this.checkAutoTurn();
  }

  private checkAutoTurn() {
      if (this.state.state === 'THINKING' && this.state.turn !== 0) {
          this.botTimeout = setTimeout(() => {
              this.botDiscard(this.state.turn);
          }, 1000 + Math.random() * 1000);
      }
  }

  private botDiscard(playerIdx: number) {
    this.clearTimers();
    const player = this.players[playerIdx];
    
    // Basic AI: Try to keep connected tiles? For now random is good enough for visual flow.
    // Ideally we discard Honors or isolated tiles.
    // Filter indices of "Bad" tiles
    const hand = player.hand;
    let candidates = hand.map((t, i) => ({ t, i })).filter(obj => obj.t.suit === Suit.WINDS || obj.t.suit === Suit.DRAGONS);
    
    if (candidates.length === 0) {
        candidates = hand.map((t, i) => ({ t, i }));
    }
    
    const selection = candidates[Math.floor(Math.random() * candidates.length)];
    const discardIdx = selection.i;

    this.performDiscard(playerIdx, discardIdx);
  }

  // --- HELPERS ---

  private broadcastState() {
    const dto: GameStateDTO = {
      deckCount: this.deck.length,
      players: this.players.map((p, i) => ({
        info: p.info,
        hand: i === 0 ? p.hand : [], // Hide others cards
        handCount: p.hand.length,    
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

  private getPlayerPos(idx: number) {
      // Approximate screen position for effects relative to center
      if (idx === 0) return { x: 0, y: 200 }; 
      if (idx === 1) return { x: 300, y: 0 }; 
      if (idx === 2) return { x: 0, y: -200 };
      if (idx === 3) return { x: -300, y: 0 }; 
      return { x: 0, y: 0 };
  }
}
