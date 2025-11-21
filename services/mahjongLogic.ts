import { Suit, Tile } from '../types';

let tileCounter = 0;

const createTile = (suit: Suit, value: number, isFlower: boolean = false): Tile => {
  tileCounter++;
  return {
    id: `tile_${tileCounter}_${suit}_${value}`,
    suit,
    value,
    isFlower,
  };
};

export const generateDeck = (): Tile[] => {
  tileCounter = 0;
  const deck: Tile[] = [];

  // 1. Simples (Dots, Bamboo, Characters) - 1 to 9, 4 of each
  [Suit.DOTS, Suit.BAMBOO, Suit.CHARACTERS].forEach((suit) => {
    for (let val = 1; val <= 9; val++) {
      for (let i = 0; i < 4; i++) deck.push(createTile(suit, val));
    }
  });

  // 2. Winds (East, South, West, North) - 1 to 4, 4 of each
  for (let val = 1; val <= 4; val++) {
    for (let i = 0; i < 4; i++) deck.push(createTile(Suit.WINDS, val));
  }

  // 3. Dragons (Red, Green, White) - 1 to 3, 4 of each
  for (let val = 1; val <= 3; val++) {
    for (let i = 0; i < 4; i++) deck.push(createTile(Suit.DRAGONS, val));
  }

  // 4. Flowers (8 tiles)
  for (let val = 1; val <= 8; val++) {
    deck.push(createTile(Suit.FLOWERS, val, true));
  }

  return shuffle(deck);
};

const shuffle = (array: Tile[]): Tile[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export const isFlower = (tile: Tile): boolean => {
    return tile.suit === Suit.FLOWERS;
};