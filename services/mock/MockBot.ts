
import { Suit, Tile } from '../../types';

export class MockBot {
  
  decideDiscard(hand: Tile[]): number {
    // Advanced AI: Weight-based Discard Logic
    // 1. Filter valid candidates (non-flowers)
    const candidates = hand.map((t, i) => ({ t, i })).filter(obj => obj.t.suit !== Suit.FLOWERS);
    if (candidates.length === 0) return -1;

    // 2. Score each candidate
    const scoredCandidates = candidates.map(c => ({
        ...c,
        score: this.calculateTileWeight(c.t, hand)
    }));

    // 3. Sort by Score (Ascending) - Lowest score = Least useful = Best discard
    scoredCandidates.sort((a, b) => a.score - b.score);

    // 4. Return the index of the worst tile
    // Add a tiny bit of randomness for top candidates if scores are equal? 
    // For now, deterministic is fine for a mock.
    return scoredCandidates[0].i;
  }

  private calculateTileWeight(target: Tile, hand: Tile[]): number {
      let weight = 0;
      
      // -- Base Importance --
      // Honors (Winds/Dragons) are generally harder to use unless paired
      const isHonor = target.suit === Suit.WINDS || target.suit === Suit.DRAGONS;
      
      // -- Check Neighbors & Duplicates --
      let pairs = 0;
      let neighbors = 0;
      let gaps = 0; // Like 1 and 3 (waiting for 2)

      for (const other of hand) {
          if (other === target) continue; // Skip self (reference check might fail if not same obj, but here we assume diff obj)

          if (other.suit === target.suit) {
              const diff = Math.abs(other.value - target.value);
              
              if (diff === 0) {
                  pairs++;
                  weight += 50; // Pair is very valuable
              } else if (!isHonor) {
                  if (diff === 1) {
                      neighbors++;
                      weight += 20; // Side neighbor (e.g. 2,3) -> high potential
                  } else if (diff === 2) {
                      gaps++;
                      weight += 10; // Gap neighbor (e.g. 2,4) -> decent potential
                  }
              }
          }
      }

      // -- Penalize Isolated Honors --
      if (isHonor && pairs === 0) {
          return -10; // Junk honor
      }

      // -- Penalize Terminals (1, 9) slightly if isolated --
      if (!isHonor && (target.value === 1 || target.value === 9)) {
          weight -= 5;
      }

      // -- Contextual Bonus --
      // If we have 3 of a kind (pairs == 2), it's a PONG/Completed Set -> HUGE value
      if (pairs >= 2) weight += 100;
      
      // If we have a sequence (neighbor + another neighbor), e.g. 2,3,4
      // This is harder to check perfectly without sorting, but `neighbors` count helps.
      if (neighbors >= 2) weight += 40;

      return weight;
  }

  shouldInteract(type: 'PONG' | 'KONG' | 'CHOW'): boolean {
      if (type === 'KONG') return Math.random() > 0.5;
      if (type === 'PONG') return Math.random() > 0.4;
      return false; // Bots usually don't CHOW in simple mocks to avoid breaking turn flow complexity
  }
}
