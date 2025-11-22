
import { Suit, Tile } from '../../types';

export class MockBot {
  
  decideDiscard(hand: Tile[]): number {
    // Simple AI: Prioritize Winds/Dragons, then Random
    // Filter out flowers just in case, though they should be auto-replaced
    let candidates = hand.map((t, i) => ({ t, i })).filter(obj => obj.t.suit !== Suit.FLOWERS);
    
    const honors = candidates.filter(obj => obj.t.suit === Suit.WINDS || obj.t.suit === Suit.DRAGONS);
    
    if (honors.length > 0) {
         // Discard isolated honors
         return honors[Math.floor(Math.random() * honors.length)].i;
    }
    
    if (candidates.length === 0) return -1;

    // Random discard of simles
    const selection = candidates[Math.floor(Math.random() * candidates.length)];
    return selection.i;
  }

  shouldInteract(type: 'PONG' | 'KONG' | 'CHOW'): boolean {
      if (type === 'KONG') return Math.random() > 0.5;
      if (type === 'PONG') return Math.random() > 0.4;
      return false;
  }
}
