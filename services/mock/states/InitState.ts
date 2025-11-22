
import { IGameState, IMockContext } from '../MockDomain';
import { FlowerState } from './FlowerState';

export class InitState implements IGameState {
  name = 'STATE_INIT';

  enter(ctx: IMockContext) {
    ctx.store.initGame();
    ctx.store.dto.state = 'STATE_INIT';
    
    // Step 0: WAITING (Matching players...)
    ctx.store.dto.initData = { step: 'WAITING', diceValues: [], windAssignment: {} };
    this.broadcast(ctx);

    // Step 1: SHUFFLE (Simulate mechanical shuffle)
    ctx.schedule(() => {
        ctx.store.dto.initData = { step: 'SHUFFLE', diceValues: [], windAssignment: {} };
        ctx.socket.trigger('game:effect', { type: 'TEXT', text: '洗牌中...' });
        this.broadcast(ctx);

        // Step 2: DICE (After Shuffle - Determine start position)
        ctx.schedule(() => {
            const d1 = Math.floor(Math.random() * 6) + 1;
            const d2 = Math.floor(Math.random() * 6) + 1;
            
            ctx.store.dto.initData = { step: 'DICE', diceValues: [d1, d2], windAssignment: {} };
            ctx.socket.trigger('game:effect', { type: 'TEXT', text: `擲骰: ${d1} + ${d2}` });
            this.broadcast(ctx);

            // Step 3: REVEAL (After Dice - Assign/Reveal Winds)
            ctx.schedule(() => {
                 this.assignWinds(ctx);
                 ctx.store.dto.initData = { ...ctx.store.dto.initData, step: 'REVEAL' };
                 this.broadcast(ctx);
                 ctx.socket.trigger('game:effect', { type: 'TEXT', text: '抓位結果' });

                // Step 4: DEAL (After Reveal - Start Game)
                ctx.schedule(() => {
                    ctx.store.dto.initData = undefined;
                    this.dealTiles(ctx);
                }, 3500); // Allow time to see winds

            }, 2500); // Allow time for dice animation
        }, 3000); // Allow time for shuffle animation
    }, 1500); // Allow time for waiting screen
  }

  private assignWinds(ctx: IMockContext) {
        const winds = [1, 2, 3, 4];
        // Shuffle the wind tiles virtually
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
            p.info.seatWind = windNames[windVal]; // Assign seat wind
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
    
    // Give Dealer one extra (17th) to start discard phase immediately
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
