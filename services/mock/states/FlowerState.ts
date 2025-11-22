
import { IGameState, IMockContext } from '../MockDomain';
import { isFlower } from '../../mahjongLogic';
import { GameplayState } from './GameplayState';
import { Tile } from '../../../types';

export class FlowerState implements IGameState {
  name = 'STATE_CHECK_FLOWERS';
  
  private currentIdx: number;
  private startIdx: number;

  constructor(startIdx: number) {
      this.startIdx = startIdx;
      this.currentIdx = startIdx;
  }

  enter(ctx: IMockContext) {
    ctx.store.dto.state = 'STATE_CHECK_FLOWERS';
    ctx.store.dto.availableActions = []; // No interactions allowed
    ctx.store.syncDto();
    ctx.socket.trigger('game:state', ctx.store.dto);
    
    // Initial delay to let UI settle
    ctx.schedule(() => {
        this.checkPlayerFlowers(ctx);
    }, 1000);
  }

  private getFlowerName(val: number): string {
      const map: Record<number, string> = {
          1: '梅', 2: '蘭', 3: '竹', 4: '菊',
          5: '春', 6: '夏', 7: '秋', 8: '冬'
      };
      return map[val] || '花';
  }

  private checkPlayerFlowers(ctx: IMockContext) {
      const player = ctx.store.players[this.currentIdx];
      const hand = player.hand;
      const flowers = hand.filter((t: Tile) => isFlower(t));

      if (flowers.length > 0) {
          // 1. Remove Flowers from hand
          player.hand = hand.filter((t: Tile) => !isFlower(t));
          
          // 2. Update Flower Count
          const count = flowers.length;
          player.info.flowerCount += count;

          // 3. Draw Replacements from TAIL of deck (simulate by standard pop for mock)
          // In real implementation, this should pull from deck[0] (tail) if deck is a stack
          for(let k=0; k<count; k++) {
              if (ctx.store.deck.length > 0) {
                  player.hand.push(ctx.store.deck.pop()!);
              }
          }
          ctx.store.sortHand(this.currentIdx);

          // 4. Visual Effects - Show the flowers!
          const pos = ctx.store.getPlayerPos(this.currentIdx);
          const flowerNames = flowers.map((f: Tile) => this.getFlowerName(f.value)).join(' ');
          
          ctx.socket.trigger('game:effect', { 
              type: 'TEXT', 
              text: `補花: ${flowerNames}`, 
              position: pos,
              variant: 'GOLD' 
          });
          
          // 5. Broadcast update (Frontend sees new Flower Count and Hand)
          ctx.store.syncDto();
          ctx.socket.trigger('game:state', ctx.store.dto);

          // 6. Recursively check THIS player again (in case replacement was a flower)
          // Add delay for visual pacing
          ctx.schedule(() => {
              this.checkPlayerFlowers(ctx);
          }, 1500);

      } else {
          // No flowers found. Move to next player.
          const nextIdx = (this.currentIdx + 1) % 4;

          if (nextIdx === this.startIdx) {
              // Full circle complete. Start Game!
              ctx.socket.trigger('game:effect', { type: 'TEXT', text: '遊戲開始' });
              ctx.transitionTo(new GameplayState(this.startIdx));
          } else {
              this.currentIdx = nextIdx;
              // Small delay between players
              ctx.schedule(() => {
                 this.checkPlayerFlowers(ctx); 
              }, 500);
          }
      }
  }

  handleDiscard() {}
  handleOperation() {}
}
