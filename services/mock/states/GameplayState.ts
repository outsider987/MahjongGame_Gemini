
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
      this.startTurn(ctx, this.turnIdx, true); // dealer turn (skip draw initially)
  }

  private startTurn(ctx: IMockContext, playerIdx: number, skipDraw: boolean = false) {
      this.turnIdx = playerIdx;
      ctx.store.dto.turn = playerIdx;
      const player = ctx.store.players[playerIdx];

      // --- RICHII AUTO-MODE START ---
      if (player.info.isRichii && !skipDraw) {
          if (ctx.store.deck.length === 0) {
              this.endGame(ctx, -1, 'DRAW', '流局');
              return;
          }
          const newTile = ctx.store.deck.pop()!;
          if (isFlower(newTile)) {
              this.handleInGameFlower(ctx, playerIdx, newTile);
              return;
          }
          player.hand.push(newTile);
          ctx.store.sortHand(playerIdx);
          
          if (MahjongRules.checkWin(player.hand)) {
               if (playerIdx === 0) {
                   ctx.store.dto.availableActions = ['HU'];
                   this.subState = 'DISCARD'; 
                   ctx.store.dto.state = 'DISCARD';
                   this.broadcast(ctx);
               } else {
                   this.executeWin(ctx, playerIdx, true);
               }
               return;
          }
          this.broadcast(ctx);
          ctx.schedule(() => {
              this.performDiscard(ctx, playerIdx, player.hand.length - 1);
          }, 800);
          return;
      }
      // --- RICHII AUTO-MODE END ---

      if (!skipDraw) {
          if (ctx.store.deck.length === 0) {
              this.endGame(ctx, -1, 'DRAW', '流局');
              return;
          }
          const newTile = ctx.store.deck.pop()!;
          if (isFlower(newTile)) {
              this.handleInGameFlower(ctx, playerIdx, newTile);
              return;
          }
          player.hand.push(newTile);
          ctx.store.sortHand(playerIdx);
      }

      ctx.store.dto.availableActions = [];

      const hand = player.hand;
      if (MahjongRules.checkWin(hand)) {
          if (playerIdx === 0) {
               ctx.store.dto.availableActions.push('HU');
          } else {
               if (Math.random() > 0.7) {
                   this.executeWin(ctx, playerIdx, true);
                   return;
               }
          }
      }
      
      if (!player.info.isRichii && playerIdx === 0) {
          const waitingTiles = MahjongRules.getTenpaiWaitingTiles(hand);
          if (waitingTiles.length > 0) {
              ctx.store.dto.availableActions.push('RICHII');
          }
      }

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
      ctx.store.players[playerIdx].info.flowers.push(flowerTile); 

      const pos = ctx.store.getFlowerPos(playerIdx);
      const name = this.getFlowerName(flowerTile.value);
      
      ctx.socket.trigger('game:effect', { type: 'FLOWER_REVEAL', tile: flowerTile, text: `補花: ${name}`, position: pos });
      
      if (ctx.store.deck.length > 0) {
          const repl = ctx.store.deck.pop()!;
          if (isFlower(repl)) {
              ctx.schedule(() => this.handleInGameFlower(ctx, playerIdx, repl), 1000);
          } else {
              ctx.store.players[playerIdx].hand.push(repl);
              ctx.store.sortHand(playerIdx);
              this.broadcast(ctx);
              ctx.schedule(() => { this.startTurn(ctx, playerIdx, true); }, 1000);
          }
      } else {
          this.endGame(ctx, -1, 'DRAW', '流局 (補花無牌)');
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
      if (player.info.isRichii && player.info.richiiDiscardIndex === -1) {
          player.info.richiiDiscardIndex = player.discards.length; 
      }

      player.discards.push(tile);
      ctx.store.sortHand(playerIdx);

      ctx.store.dto.lastDiscard = { tile, playerIndex: playerIdx };
      ctx.store.dto.availableActions = [];
      
      this.checkInteractions(ctx, tile, playerIdx);
  }

  private checkInteractions(ctx: IMockContext, discard: Tile, sourceIdx: number) {
      this.pendingClaims = [];
      for (let i = 1; i <= 3; i++) {
          const targetIdx = (sourceIdx + i) % 4;
          const p = ctx.store.players[targetIdx];
          
          if (MahjongRules.checkWin(p.hand, discard)) {
              this.pendingClaims.push({ playerIdx: targetIdx, type: 'HU', priority: 100 });
          }
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
              if (targetIdx === (sourceIdx + 1) % 4) {
                  if (MahjongRules.canChow(p.hand, discard)) {
                       if (targetIdx === 0) { 
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

      this.subState = 'RESOLVE';
      ctx.store.dto.state = 'RESOLVE_ACTION';
      const humanClaims = this.pendingClaims.filter(c => c.playerIdx === 0);
      if (humanClaims.length > 0) {
          ctx.store.dto.availableActions = [...humanClaims.map(c => c.type), 'PASS'];
          this.broadcast(ctx);
          this.startTimer(ctx, 8); 
      } else {
          ctx.store.dto.availableActions = [];
          this.broadcast(ctx);
          ctx.schedule(() => this.resolveBestAction(ctx), 800);
      }
  }

  handleOperation(ctx: IMockContext, action: ActionType) {
      if (action === 'RICHII') {
          if (this.turnIdx === 0 && this.subState === 'DISCARD') {
              const player = ctx.store.players[0];
              player.info.isRichii = true;
              const pos = ctx.store.getPlayerPos(0);
              ctx.socket.trigger('game:effect', { type: 'TEXT', text: '立直!', position: pos, variant: 'GOLD' });
              ctx.socket.trigger('game:effect', { type: 'LIGHTNING', position: pos });
              ctx.store.dto.availableActions = ctx.store.dto.availableActions.filter(a => a !== 'RICHII');
              this.broadcast(ctx);
              return; 
          }
      }
      if (this.subState !== 'RESOLVE') return;
      if (action === 'PASS') {
          ctx.store.dto.availableActions = [];
          this.broadcast(ctx);
          this.pendingClaims = this.pendingClaims.filter(c => c.playerIdx !== 0);
          this.resolveBestAction(ctx);
          return;
      }
      this.executeAction(ctx, 0, action);
  }

  private resolveBestAction(ctx: IMockContext) {
      if (this.pendingClaims.length === 0) {
          const next = (ctx.store.dto.lastDiscard!.playerIndex + 1) % 4;
          this.nextTurn(ctx, next);
          return;
      }
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

      ctx.store.players[fromPlayer].discards.pop();
      ctx.store.dto.lastDiscard = null;

      if (type === 'PONG') {
          let removed = 0;
          player.hand = player.hand.filter((t: Tile) => {
              if (removed < 2 && t.suit === discard.suit && t.value === discard.value) {
                  removed++; return false;
              }
              return true;
          });
          player.melds.push({ type: 'PONG', tiles: [discard, discard, discard], fromPlayer });
          ctx.socket.trigger('game:effect', { type: 'ACTION_PONG', text: '碰', position: pos });
      } else if (type === 'KONG') {
           let removed = 0;
           player.hand = player.hand.filter((t: Tile) => {
               if (removed < 3 && t.suit === discard.suit && t.value === discard.value) {
                   removed++; return false;
               }
               return true;
           });
           player.melds.push({ type: 'KONG', tiles: [discard, discard, discard, discard], fromPlayer });
           // Draw replacement
           ctx.socket.trigger('game:effect', { type: 'ACTION_KONG', text: '槓', position: pos });
           this.handleKongReplacement(ctx, playerIdx);
           return;
      } else if (type === 'CHOW') {
          const combo = MahjongRules.getChowCombination(player.hand, discard);
          if (combo) {
               // Remove from hand
               combo.forEach(c => {
                   const idx = player.hand.findIndex((h: Tile) => h.suit === c.suit && h.value === c.value);
                   if (idx !== -1) player.hand.splice(idx, 1);
               });
               const meldTiles = [...combo, discard].sort((a,b) => a.value - b.value);
               player.melds.push({ type: 'CHOW', tiles: meldTiles, fromPlayer });
               ctx.socket.trigger('game:effect', { type: 'ACTION_CHOW', text: '吃', position: pos });
          }
      }
      
      // For PONG and CHOW, it becomes the player's turn to discard
      this.subState = 'DISCARD';
      ctx.store.dto.state = 'DISCARD';
      this.turnIdx = playerIdx;
      ctx.store.dto.turn = playerIdx;
      this.broadcast(ctx);
      this.startTimer(ctx);
  }

  private handleKongReplacement(ctx: IMockContext, playerIdx: number) {
      if (ctx.store.deck.length === 0) {
          this.endGame(ctx, -1, 'DRAW', '流局 (槓牌無牌)');
          return;
      }
      const tile = ctx.store.deck.pop()!;
      if (isFlower(tile)) {
          this.handleInGameFlower(ctx, playerIdx, tile);
      } else {
          ctx.store.players[playerIdx].hand.push(tile);
          ctx.store.sortHand(playerIdx);
          this.broadcast(ctx);
          this.subState = 'DISCARD';
          ctx.store.dto.state = 'DISCARD';
          ctx.store.dto.turn = playerIdx;
          this.startTimer(ctx);
      }
  }

  private nextTurn(ctx: IMockContext, nextPlayerIdx: number) {
      this.startTurn(ctx, nextPlayerIdx);
  }

  private startTimer(ctx: IMockContext, seconds: number = 10) {
      ctx.store.dto.actionTimer = seconds;
      this.broadcast(ctx);
      
      if (ctx.store._timerInterval) clearInterval(ctx.store._timerInterval);
      
      ctx.store._timerInterval = setInterval(() => {
          ctx.store.dto.actionTimer--;
          if (ctx.store.dto.actionTimer <= 0) {
              clearInterval(ctx.store._timerInterval);
              // In real logic, force auto-discard here
          }
          this.broadcast(ctx);
      }, 1000);
  }

  private executeWin(ctx: IMockContext, playerIdx: number, isZimo: boolean) {
      this.endGame(ctx, playerIdx, isZimo ? 'ZIMO' : 'RON', isZimo ? '自摸' : '胡');
  }

  private endGame(ctx: IMockContext, winnerIdx: number, type: 'ZIMO' | 'RON' | 'DRAW', reason: string) {
      ctx.store.dto.state = 'STATE_GAME_OVER';
      ctx.store.dto.winnerIndex = winnerIdx;
      ctx.store.dto.winType = type;
      
      // Simple Mock Scoring
      const BASE = 300;
      const tai = 3 + Math.floor(Math.random() * 5);
      const SCORE = BASE + (50 * tai); 

      if (type === 'DRAW') {
           ctx.socket.trigger('game:effect', { type: 'TEXT', text: reason });
      } else if (winnerIdx !== -1) {
          const winner = ctx.store.players[winnerIdx];
          winner.info.isWinner = true;
          winner.info.tai = tai;
          
          if (type === 'ZIMO') {
              const totalWin = SCORE * 3;
              winner.info.roundScoreDelta = totalWin;
              winner.info.score += totalWin;
              
              ctx.store.players.forEach((p, i) => {
                  if (i !== winnerIdx) {
                      p.info.roundScoreDelta = -SCORE;
                      p.info.score -= SCORE;
                  }
              });
              ctx.socket.trigger('game:effect', { type: 'SHOCKWAVE', variant: 'HU', text: `自摸! ${tai}台`, position: ctx.store.getPlayerPos(winnerIdx) });

          } else if (type === 'RON') {
              const loserIdx = ctx.store.dto.lastDiscard?.playerIndex ?? -1;
              
              // If Ron, the winning tile needs to be moved from discards to winner's hand
              if (ctx.store.dto.lastDiscard) {
                 winner.hand.push(ctx.store.dto.lastDiscard.tile);
                 ctx.store.sortHand(winnerIdx);
                 // Keep it in discard array logic or remove? 
                 // Usually for visual "Connect", we leave it, but for result screen hand logic, 
                 // we want the hand to look complete.
              }

              if (loserIdx !== -1) {
                  const loser = ctx.store.players[loserIdx];
                  loser.info.isLoser = true;
                  loser.info.roundScoreDelta = -SCORE;
                  loser.info.score -= SCORE;
                  
                  winner.info.roundScoreDelta = SCORE;
                  winner.info.score += SCORE;
                  
                   ctx.socket.trigger('game:effect', { type: 'SHOCKWAVE', variant: 'HU', text: `胡了! ${tai}台`, position: ctx.store.getPlayerPos(winnerIdx) });
              }
          }
      }

      this.broadcast(ctx);
      ctx.clearTimers();
  }
  
  private broadcast(ctx: IMockContext) {
      ctx.store.syncDto();
      ctx.socket.trigger('game:state', ctx.store.dto);
  }
}
