
import { Tile, Suit } from '../types';

export class MahjongRules {
  
  /**
   * Checks if a Pong (3 identical tiles) is possible.
   * Requires 2 matching tiles in hand + 1 discard.
   */
  static canPong(hand: Tile[], discard: Tile): boolean {
    const count = hand.filter(t => t.suit === discard.suit && t.value === discard.value).length;
    return count >= 2;
  }

  /**
   * Checks if an Exposed Kong (4 identical tiles) is possible.
   * Requires 3 matching tiles in hand + 1 discard.
   */
  static canKong(hand: Tile[], discard: Tile): boolean {
    const count = hand.filter(t => t.suit === discard.suit && t.value === discard.value).length;
    return count === 3;
  }

  /**
   * Checks if a Chow (Sequence) is possible.
   * Only allowed from the player to your Left (upper seat).
   * Patterns: [X-2, X-1], [X-1, X+1], [X+1, X+2]
   */
  static canChow(hand: Tile[], discard: Tile): boolean {
    if (discard.suit === Suit.WINDS || discard.suit === Suit.DRAGONS || discard.suit === Suit.FLOWERS) {
      return false;
    }

    const v = discard.value;
    const s = discard.suit;
    
    // Helper to find if hand contains a specific value of the suit
    const has = (val: number) => hand.some(t => t.suit === s && t.value === val);

    // Check 3 sequence types
    const type1 = has(v - 2) && has(v - 1); // Eat 3 with 1,2
    const type2 = has(v - 1) && has(v + 1); // Eat 2 with 1,3
    const type3 = has(v + 1) && has(v + 2); // Eat 1 with 2,3

    return type1 || type2 || type3;
  }

  /**
   * Retrieves the tiles from hand that form the sequence.
   */
  static getChowCombination(hand: Tile[], discard: Tile): Tile[] | null {
    const v = discard.value;
    const s = discard.suit;
    const find = (val: number) => hand.find(t => t.suit === s && t.value === val);

    if (this.canChow(hand, discard)) {
        // Priority: Low to High
        if (find(v-2) && find(v-1)) return [find(v-2)!, find(v-1)!];
        if (find(v-1) && find(v+1)) return [find(v-1)!, find(v+1)!];
        if (find(v+1) && find(v+2)) return [find(v+1)!, find(v+2)!];
    }
    return null;
  }

  /**
   * Checks if a hand is a winning hand (HU).
   * Alias for checkWin with an extra tile.
   */
  static canHu(hand: Tile[], discard: Tile): boolean {
     return this.checkWin(hand, discard);
  }

  /**
   * Checks if a hand is in "Tenpai" (Ready state).
   * Returns an array of tiles that would complete the hand.
   * If array is not empty, the hand is Ready.
   */
  static getTenpaiWaitingTiles(hand: Tile[]): Tile[] {
    // Simplified logic: Iterate through all 34 types of tiles.
    // If adding one results in a win, the hand is waiting.
    
    // 1. Filter out flowers (sanity check)
    const baseHand = hand.filter(t => t.suit !== Suit.FLOWERS);
    
    // Optimization: If hand length % 3 != 1, it cannot be waiting for a single tile.
    // (Standard hand is 13 tiles, waiting for 14th)
    if (baseHand.length % 3 !== 1) return [];

    const winningTiles: Tile[] = [];

    // Helper to create temp tile
    const testTile = (suit: Suit, val: number) => ({ id: 'temp', suit, value: val, isFlower: false });

    // Test Suits 1-9
    [Suit.DOTS, Suit.BAMBOO, Suit.CHARACTERS].forEach(suit => {
        for (let v = 1; v <= 9; v++) {
            const t = testTile(suit, v);
            if (this.checkWin(baseHand, t)) winningTiles.push(t);
        }
    });

    // Test Winds 1-4
    for (let v = 1; v <= 4; v++) {
        const t = testTile(Suit.WINDS, v);
        if (this.checkWin(baseHand, t)) winningTiles.push(t);
    }

    // Test Dragons 1-3
    for (let v = 1; v <= 3; v++) {
        const t = testTile(Suit.DRAGONS, v);
        if (this.checkWin(baseHand, t)) winningTiles.push(t);
    }

    return winningTiles;
  }

  /**
   * Standard Win Algorithm (3n + 2)
   * Checks if the hand is composed of valid sets (sequences/triplets) and one pair.
   */
  static checkWin(hand: Tile[], extraTile?: Tile): boolean {
      const tiles = [...hand];
      if (extraTile) tiles.push(extraTile);

      // 1. Filter out Flowers (they don't count for hand structure)
      const playTiles = tiles.filter(t => t.suit !== Suit.FLOWERS);

      // 2. Basic Count Check (Must be 3n + 2)
      if (playTiles.length % 3 !== 2) return false;

      // 3. Organize by Suit
      const suitMap: Record<string, number[]> = {};
      playTiles.forEach(t => {
          if (!suitMap[t.suit]) suitMap[t.suit] = [];
          suitMap[t.suit].push(t.value);
      });

      // 4. Sort each suit group
      for (const key in suitMap) {
          suitMap[key].sort((a, b) => a - b);
      }

      // 5. Check each suit
      // We need exactly ONE pair across all suits.
      let pairFound = false;

      for (const key in suitMap) {
          const vals = suitMap[key];
          const isHonor = (key === Suit.WINDS || key === Suit.DRAGONS);
          const rem = vals.length % 3;

          if (rem === 1) return false; // Impossible remainder for a valid suit subset
          
          if (rem === 2) {
              // This suit MUST contain the pair
              if (pairFound) return false; // We already found a pair in another suit
              if (!this.checkDecompose(vals, true, isHonor)) return false;
              pairFound = true;
          } else {
              // This suit must be all sets (0 remainder)
              if (!this.checkDecompose(vals, false, isHonor)) return false;
          }
      }

      return pairFound;
  }

  /**
   * Recursive function to check if a set of tiles can be decomposed into valid Sets (and optionally 1 Pair).
   */
  private static checkDecompose(tiles: number[], needPair: boolean, isHonor: boolean): boolean {
      if (tiles.length === 0) return true;

      // A. If we need a Pair, try to find it first
      if (needPair) {
          for (let i = 0; i < tiles.length - 1; i++) {
              // Found a candidate pair
              if (tiles[i] === tiles[i+1]) {
                  const rem = [...tiles];
                  rem.splice(i, 2); // Remove pair
                  // Recurse: now we don't need a pair anymore
                  if (this.checkDecompose(rem, false, isHonor)) return true;
                  
                  // Optimization: Skip identical values to avoid redundant checks
                  while (i < tiles.length - 1 && tiles[i] === tiles[i+1]) i++;
              }
          }
          return false; // If we needed a pair but couldn't find a valid one that satisfies the rest
      }

      // B. Try Triplet (Koutsu)
      if (tiles.length >= 3 && tiles[0] === tiles[1] && tiles[1] === tiles[2]) {
          const rem = tiles.slice(3);
          if (this.checkDecompose(rem, false, isHonor)) return true;
      }

      // C. Try Sequence (Shuntsu) - Only for non-Honor suits
      if (!isHonor) {
          const first = tiles[0];
          const i1 = tiles.indexOf(first + 1);
          const i2 = tiles.indexOf(first + 2);
          
          if (i1 !== -1 && i2 !== -1) {
              const rem = [...tiles];
              // Remove the found sequence tiles.
              // We splice from highest index to lowest to keep indices valid.
              // Note: i2 > i1 > 0 because array is sorted.
              rem.splice(i2, 1);
              rem.splice(i1, 1);
              rem.splice(0, 1);
              
              if (this.checkDecompose(rem, false, isHonor)) return true;
          }
      }

      return false;
  }
}