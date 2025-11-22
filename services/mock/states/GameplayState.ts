
import { ActionType, Meld, Suit, Tile } from '../../types';
import { IGameState, IMockContext } from '../MockDomain';
import { MahjongRules } from '../../MahjongRules';
import { isFlower } from '../../mahjongLogic';

interface PendingAction {
    playerIdx: number;
    type: ActionType;
    priority: number;
}

export class GameplayState implements IGameState {
  name = 'GAMEPLAY';
  
  private subState: 'DRAW' | 'DISCARD' | 'THINKING' | 'RESOLVE' = 'DRAW';
  private pendingClaims: PendingAction[] = [];
  private turnIdx: number;

  constructor(startTurnIdx: number) {
      this.turnIdx = startTurnIdx;
  }

  enter(ctx: IMockContext) {
      // Initial entry is typically after Init/Flower. 
      // The dealer already has 17 tiles (processed by flower state).
      // So we skip Draw and go straight to Discard for Dealer.
      this.startTurn(ctx, this.turnIdx, true); // true = skip draw (dealer first turn)
  }

  private startTurn(ctx: IMockContext, playerIdx: number, skipDraw: boolean = false) {
      this.turnIdx = playerIdx;
      ctx.store.dto.turn = playerIdx;
      const player = ctx.store.players[playerIdx];

      // --- RICHII AUTO-MODE START ---
      if (player.info.isRichii && !skipDraw) {
          // Draw Tile
          if (ctx.store.deck.length === 0) {
              this.endGame(ctx, '流局');
              return;
          }
          const newTile = ctx.store.deck.pop()!;
          
          // In-Game Flower Check (Recursive support)
          if (isFlower(newTile)) {
              this.handleInGameFlower(ctx, playerIdx, newTile);
              return;
          }
          
          player.hand.push(newTile);
          ctx.store.sortHand(playerIdx);
          
          // Check Tsumo (Self Draw Win)
          if (MahjongRules.checkWin(player.hand)) {
               if (playerIdx === 0) {
                   // Human still needs to click HU
                   ctx.store.dto.availableActions = ['HU'];
                   this.subState = 'DISCARD'; 
                   ctx.store.dto.state = 'DISCARD';
                   this.broadcast(ctx);
               } else {
                   // Bot Tsumo
                   this.executeWin(ctx, playerIdx, true);
               }
               return;
          }
          
          // Visual delay for "Tsumogiri" (Instant discard)
          this.broadcast(ctx);
          ctx.schedule(() => {
              // Discard the tile we just drew (last in hand)
              this.performDiscard(ctx, playerIdx, player.hand.length - 1);
          }, 800);
          return;
      }
      // --- RICHII AUTO-MODE END ---


      if (!skipDraw) {
          // Check for Deck Empty (Draw Game)
          if (ctx.store.deck.length === 0) {
              this.endGame(ctx, '流局');
              return;
          }

          // Draw Tile
          const newTile = ctx.store.deck.pop()!;
          
          // In-Game Flower Check
          if (isFlower(newTile)) {
              this.handleInGameFlower(ctx, playerIdx, newTile);
              return;
          }

          player.hand.push(newTile);
          ctx.store.sortHand(playerIdx);
      }

      ctx.store.dto.availableActions = [];

      // Check Self Win (Tsumo)
      const hand = player.hand;
      if (MahjongRules.checkWin(hand)) {
          if (playerIdx === 0) {
               ctx.store.dto.availableActions.push('HU');
          } else {
               // Bot Tsumo - small chance to actually take it for excitement
               if (Math.random() > 0.7) {
                   this.executeWin(ctx, playerIdx, true);
                   return;
               }
          }
      }
      
      // Check Riichi (Ready Hand)
      if (!player.info.isRichii && playerIdx === 0) {
          // If not already Riichi, and hand needs 1 tile to win
          const waitingTiles = MahjongRules.getTenpaiWaitingTiles(hand);
          if (waitingTiles.length > 0) {
              ctx.store.dto.availableActions.push('RICHII');
          }
      }

      // Set State
      this.subState = (playerIdx === 0) ? 'DISCARD' : 'THINKING';
      ctx.store.dto.state = (playerIdx === 0) ? 'DISCARD' : 'THINKING';
      
      this.broadcast(ctx);
      this.startTimer(ctx);

      if (this.subState === 'THINKING') {
          ctx.schedule(() => this.botTurn(ctx), 1000 + Math.random() * 1000);
      }
  }

  private getFlowerName(val: number): string {
      const map: Record<number, string> = {
          1: '梅', 2: '蘭', 3: '竹', 4: '菊',
          5: '春', 6: '夏', 7: '秋', 8: '冬'
      };
      return map[val] || '花';
  }

  private handleInGameFlower(ctx: IMockContext, playerIdx: number, flowerTile: Tile) {
      ctx.store.players[playerIdx].info.flowerCount++;
      ctx.store.players[playerIdx].info.flowers.push(flowerTile); // Store tile

      const pos = ctx.store.getPlayerPos(playerIdx);
      const name = this.getFlowerName(flowerTile.value);
      
      // Visual Effect: Show the tile popping up
      ctx.socket.trigger('game:effect', { 
          type: 'TILE_POPUP', 
          tile: flowerTile, 
          text: `補花: ${name}`, 
          position: pos 
      });
      
      // Draw replacement immediately
      if (ctx.store.deck.length > 0) {
          const repl = ctx.store.deck.pop()!;
          if (isFlower(repl)) {
              // Recursive if replacement is also flower
              ctx.schedule(() => this.handleInGameFlower(ctx, playerIdx, repl), 1000);
          } else {
              ctx.store.players[playerIdx].hand.push(repl);
              ctx.store.sortHand(playerIdx);
              
              this.broadcast(ctx); // Update flower count UI
              
              // Continue turn normally with this new tile
              // Note: We call startTurn with skipDraw=true because we just manually added the replacement
              ctx.schedule(() => {
                 this.startTurn(ctx, playerIdx, true); 
              }, 1000);
          }
      } else {
          this.endGame(ctx, '流局 (補花無牌)');
      }
      this.broadcast(ctx);
  }

  handleDiscard(ctx: IMockContext, tileIndex: number) {
      if (this.turnIdx !== 0 || this.subState !== 'DISCARD') return;
      ctx.clearTimers();
      this.performDiscard(ctx, 0, tileIndex);
  }

  private botTurn(ctx: IMockContext) {
      const idx = this.turnIdx;
      const hand = ctx.store.players[idx].hand;
      const discardIdx = ctx.bot.decideDiscard(hand);
      this.performDiscard(ctx, idx, discardIdx);
  }

  private performDiscard(ctx: IMockContext, playerIdx: number, tileIndex: number) {
      const player = ctx.store.players[playerIdx];
      if (tileIndex < 0 || tileIndex >= player.hand.length) return;

      const tile = player.hand.splice(tileIndex, 1)[0];
      
      // Handle Riichi Discard Rotation
      if (player.info.isRichii && player.info.richiiDiscardIndex === -1) {
          player.info.richiiDiscardIndex = player.discards.length; // The next index to be pushed
      }

      player.discards.push(tile);
      ctx.store.sortHand(playerIdx);

      ctx.store.dto.lastDiscard = { tile, playerIndex: playerIdx };
      ctx.store.dto.availableActions = [];
      
      this.checkInteractions(ctx, tile, playerIdx);
  }

  private checkInteractions(ctx: IMockContext, discard: Tile, sourceIdx: number) {
      this.pendingClaims = [];
      
      // Check other 3 players
      for (let i = 1; i <= 3; i++) {
          const targetIdx = (sourceIdx + i) % 4;
          const p = ctx.store.players[targetIdx];
          
          if (MahjongRules.checkWin(p.hand, discard)) {
              this.pendingClaims.push({ playerIdx: targetIdx, type: 'HU', priority: 100 });
          }
          
          // If player is in Richii, they cannot Call tiles (except HU)
          if (!p.info.isRichii) {
              if (MahjongRules.canKong(p.hand, discard)) {
                   if (targetIdx === 0 || ctx.bot.shouldInteract('KONG')) {
                       this.pendingClaims.push({ playerIdx: targetIdx, type: 'KONG', priority: 50 });
                   }
              } else if (MahjongRules.canPong(p.hand, discard)) {
                   if (targetIdx === 0 || ctx.bot.shouldInteract('PONG')) {
                       this.pendingClaims.push({ playerIdx: targetIdx, type: 'PONG', priority: 50 });
                   }
              }
              // Chow (Left player only)
              if (targetIdx === (sourceIdx + 1) % 4) {
                  if (MahjongRules.canChow(p.hand, discard)) {
                       if (targetIdx === 0) { // Bots don't chow in this simplified version
                           this.pendingClaims.push({ playerIdx: targetIdx, type: 'CHOW', priority: 10 });
                       }
                  }
              }
          }
      }

      if (this.pendingClaims.length === 0) {
          this.nextTurn(ctx, (sourceIdx + 1) % 4);
          return;
      }

      // Resolve State
      this.subState = 'RESOLVE';
      ctx.store.dto.state = 'RESOLVE_ACTION';
      
      const humanClaims = this.pendingClaims.filter(c => c.playerIdx === 0);
      if (humanClaims.length > 0) {
          ctx.store.dto.availableActions = [...humanClaims.map(c => c.type), 'PASS'];
          this.broadcast(ctx);
          this.startTimer(ctx, 8); // Give human time
      } else {
          // Bot resolution
          ctx.store.dto.availableActions = [];
          this.broadcast(ctx);
          ctx.schedule(() => this.resolveBestAction(ctx), 800);
      }
  }

  handleOperation(ctx: IMockContext, action: ActionType) {
      // Handle Richii Action (It happens during DISCARD state, not RESOLVE state)
      if (action === 'RICHII') {
          if (this.turnIdx === 0 && this.subState === 'DISCARD') {
              const player = ctx.store.players[0];
              player.info.isRichii = true;
              
              const pos = ctx.store.getPlayerPos(0);
              ctx.socket.trigger('game:effect', { type: 'TEXT', text: '立直!', position: pos, variant: 'GOLD' });
              ctx.socket.trigger('game:effect', { type: 'LIGHTNING', position: pos });
              
              // Remove RICHII from available, force player to discard
              ctx.store.dto.availableActions = ctx.store.dto.availableActions.filter(a => a !== 'RICHII');
              this.broadcast(ctx);
              return; 
          }
      }

      if (this.subState !== 'RESOLVE') return;
      
      if (action === 'PASS') {
          // Clear immediately to hide UI
          ctx.store.dto.availableActions = [];
          this.broadcast(ctx);

          // Filter out human claims and resolve remaining (bot)
          this.pendingClaims = this.pendingClaims.filter(c => c.playerIdx !== 0);
          this.resolveBestAction(ctx);
          return;
      }

      // Human execute
      this.executeAction(ctx, 0, action);
  }

  private resolveBestAction(ctx: IMockContext) {
      if (this.pendingClaims.length === 0) {
          const next = (ctx.store.dto.lastDiscard!.playerIndex + 1) % 4;
          this.nextTurn(ctx, next);
          return;
      }
      // Sort by priority
      this.pendingClaims.sort((a, b) => b.priority - a.priority);
      const best = this.pendingClaims[0];
      this.executeAction(ctx, best.playerIdx, best.type);
  }

  private executeAction(ctx: IMockContext, playerIdx: number, type: ActionType) {
      const discard = ctx.store.dto.lastDiscard!.tile;
      const fromPlayer = ctx.store.dto.lastDiscard!.playerIndex;
      const player = ctx.store.players[playerIdx];
      const pos = ctx.store.getPlayerPos(playerIdx);

      if (type === 'HU') {
          this.executeWin(ctx, playerIdx, false);
          return;
      }

      // Remove discard from previous player
      ctx.store.players[fromPlayer].discards.pop();
      ctx.store.dto.lastDiscard = null;

      if (type === 'PONG') {
          // Remove 2 matching
          let removed = 0;
          player.hand = player.hand.filter((t: Tile) => {
              if (removed < 2 && t.suit === discard.suit && t.value === discard.value) {
                  removed++; return false;
              }
              return true;
          });
          const meld: Meld = { type: 'PONG', tiles: [discard, discard, discard], fromPlayer };
          player.melds.push(meld);
          // TRIGGER NEW EFFECT
          ctx.socket.trigger('game:effect', { type: 'ACTION_PONG', text: '碰', position: pos });

      } else if (type === 'KONG') {
           // Remove 3 matching
           let removed = 0;
           player.hand = player.hand.filter((t: Tile) => {
               if (removed < 3 && t.suit === discard.suit && t.value === discard.value) {
                   removed++; return false;
               }
               return true;
           });
           const meld: Meld = { type: 'KONG', tiles: [discard, discard, discard, discard], fromPlayer };
           player.melds.push(meld);
           // TRIGGER NEW EFFECT
           ctx.socket.trigger('game:effect', { type: 'ACTION_KONG', text: '槓', position: pos });
           
           // Kong gets an extra turn (normally supplement from back, simplified to regular draw here)
      } else if (type === 'CHOW') {
           const combo = MahjongRules.getChowCombination(player.hand, discard);
           if (combo) {
                combo.forEach(cTile => {
                     const idx = player.hand.findIndex((h: Tile) => h.id === cTile.id);
                     if (idx > -1) player.hand.splice(idx, 1);
                });
                const meldTiles = [...combo, discard].sort((a, b) => a.value - b.value);
                player.melds.push({ type: 'CHOW', tiles: meldTiles, fromPlayer });
                // TRIGGER NEW EFFECT
                ctx.socket.trigger('game:effect', { type: 'ACTION_CHOW', text: '吃', position: pos });
           }
      }

      // After action, it becomes this player's turn to discard
      // Important: If Kong, they technically need to draw a supplement. 
      // For simplicity in this mock, we treat it as startTurn(skipDraw=false) effectively
      // but we must be careful not to break flow. 
      // Simplified: Directly to discard phase for PONG/CHOW.
      
      this.turnIdx = playerIdx;
      
      if (type === 'KONG') {
          // Treat as a new turn drawing a tile (supplement)
          this.startTurn(ctx, playerIdx, false);
      } else {
          // PONG/CHOW: Skip draw, go to discard
          this.subState = (playerIdx === 0) ? 'DISCARD' : 'THINKING';
          ctx.store.dto.turn = playerIdx;
          ctx.store.dto.state = this.subState;
          
          // CRITICAL: Clear available actions so the buttons don't reappear
          ctx.store.dto.availableActions = [];

          this.broadcast(ctx);
          this.startTimer(ctx);
          if (this.subState === 'THINKING') {
              ctx.schedule(() => this.botTurn(ctx), 1000);
          }
      }
  }

  private executeWin(ctx: IMockContext, playerIdx: number, isTsumo: boolean) {
      const pos = ctx.store.getPlayerPos(playerIdx);
      ctx.socket.trigger('game:effect', { type: 'SHOCKWAVE', variant: 'HU', position: pos });
      ctx.socket.trigger('game:effect', { type: 'TEXT', text: isTsumo ? '自摸!' : '胡了!', position: pos, variant: 'HU' });
      ctx.socket.trigger('game:effect', { type: 'PARTICLES', variant: 'HU', position: pos });
      
      this.endGame(ctx, isTsumo ? `玩家 ${playerIdx} 自摸` : `玩家 ${playerIdx} 胡牌`);
  }

  private nextTurn(ctx: IMockContext, nextIdx: number) {
      this.startTurn(ctx, nextIdx);
  }

  private endGame(ctx: IMockContext, reason: string) {
      ctx.store.dto.state = 'STATE_GAME_OVER';
      this.broadcast(ctx);
      ctx.socket.trigger('game:effect', { type: 'TEXT', text: reason });
  }

  private startTimer(ctx: IMockContext, duration: number = 10) {
      ctx.clearTimers();
      ctx.store.dto.actionTimer = duration;
      this.broadcast(ctx);
      
      const interval = setInterval(() => {
          ctx.store.dto.actionTimer--;
          if (ctx.store.dto.actionTimer <= 0) {
              clearInterval(interval);
              this.handleTimeout(ctx);
          } else {
              this.broadcast(ctx);
          }
      }, 1000);
      (ctx as any)._timerInterval = interval;
  }

  private handleTimeout(ctx: IMockContext) {
      if (this.subState === 'RESOLVE') {
          this.handleOperation(ctx, 'PASS');
      } else if (this.turnIdx === 0) {
          // If waiting for human discard, random discard
          this.performDiscard(ctx, 0, ctx.store.players[0].hand.length - 1);
      } else {
          this.botTurn(ctx);
      }
  }

  private broadcast(ctx: IMockContext) {
      ctx.store.syncDto();
      ctx.socket.trigger('game:state', ctx.store.dto);
  }
}
