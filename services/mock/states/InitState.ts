
import { IGameState, IMockContext } from '../MockDomain';
import { FlowerState } from './FlowerState';

export class InitState implements IGameState {
  name = 'STATE_INIT';

  enter(ctx: IMockContext) {
    ctx.store.initGame();
    ctx.store.dto.state = 'STATE_INIT';
    ctx.store.dto.initData = { step: 'WAITING', diceValues: [], windAssignment: {} };
    this.broadcast(ctx);

    // Sequence of Animations
    ctx.schedule(() => {
        const d1 = Math.floor(Math.random() * 6) + 1;
        const d2 = Math.floor(Math.random() * 6) + 1;
        
        ctx.store.dto.initData = { step: 'DICE', diceValues: [d1, d2], windAssignment: {} };
        ctx.socket.trigger('game:effect', { type: 'TEXT', text: `擲骰: ${d1} + ${d2}` });
        this.broadcast(ctx);

        ctx.schedule(() => {
             ctx.store.dto.initData = { step: 'SHUFFLE', diceValues: [d1, d2], windAssignment: {} };
             this.broadcast(ctx);

            ctx.schedule(() => {
                this.assignWinds(ctx);
                ctx.store.dto.initData = { ...ctx.store.dto.initData, step: 'REVEAL' };
                this.broadcast(ctx);
                ctx.socket.trigger('game:effect', { type: 'TEXT', text: '決定莊家' });
                
                ctx.schedule(() => {
                    ctx.store.dto.initData = undefined;
                    this.dealTiles(ctx);
                }, 3000);

            }, 2000);
        }, 2500);
    }, 1000);
  }

  private assignWinds(ctx: IMockContext) {
        const winds = [1, 2, 3, 4];
        // Shuffle
        for (let i = winds.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [winds[i], winds[j]] = [winds[j], winds[i]];
        }

        const assignment: Record<string, number> = {};
        const windNames = ["", "東", "南", "西", "北"];

        ctx.store.players.forEach((p: any, idx: number) => {
            const windVal = winds[idx];
            assignment[String(idx)] = windVal;
            p.info.wind = windNames[windVal];
            p.info.isDealer = (windVal === 1);
        });
        ctx.store.dto.initData.windAssignment = assignment;
  }

  private dealTiles(ctx: IMockContext) {
    const dealerIdx = ctx.store.players.findIndex((p: any) => p.info.isDealer);
    
    // Deal 16 to everyone
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 16; j++) {
        if (ctx.store.deck.length > 0) ctx.store.players[i].hand.push(ctx.store.deck.pop()!);
      }
      ctx.store.sortHand(i);
    }
    
    // NOTE: In standard rules, Dealer gets 14/17 tiles depending on variation. 
    // Here we give everyone 16, and dealer will draw first in game or get 1 extra now.
    // Let's give Dealer one extra (17th) to start discard phase immediately, 
    // BUT Flower replacement must happen first.
    // We will hold off the 17th tile until GameplayState OR treat the initial 16 as base.
    // Taiwanese 16-tile MJ: Dealer starts with 17.
    
    if (ctx.store.deck.length > 0) {
       ctx.store.players[dealerIdx].hand.push(ctx.store.deck.pop()!);
       ctx.store.sortHand(dealerIdx);
    }
    
    ctx.store.dto.turn = dealerIdx;
    
    // Transition to Flower Check
    ctx.transitionTo(new FlowerState(dealerIdx));
  }

  handleDiscard() {}
  handleOperation() {}
  
  private broadcast(ctx: IMockContext) {
      ctx.store.syncDto();
      ctx.socket.trigger('game:state', ctx.store.dto);
  }
}
