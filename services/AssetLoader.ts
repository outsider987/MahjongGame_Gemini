
import { Suit, Tile } from '../types';

// Asset Mapping Logic
// Using cdn.jsdelivr.net for reliable MIME type serving
const BASE_URL = 'https://cdn.jsdelivr.net/gh/FluffyStuff/riichi-mahjong-tiles@master/Regular/';

export class AssetLoader {
  private static images: Record<string, any> = {};

  /**
   * Maps a Tile object to the specific filename required by the CDN.
   */
  private static getAssetName(suit: Suit, value: number): string {
    switch (suit) {
      case Suit.CHARACTERS: return `${value}m.svg`; // Man
      case Suit.DOTS: return `${value}p.svg`;       // Pin
      case Suit.BAMBOO: return `${value}s.svg`;     // Sou
      case Suit.WINDS:
        // FluffyStuff uses Capitalized names for Winds
        const winds = ['East', 'South', 'West', 'North'];
        return `${winds[value - 1]}.svg`;
      case Suit.DRAGONS:
        // FluffyStuff uses Capitalized names for Dragons
        // Logic: 1=Red(中), 2=Green(發), 3=White(白)
        if (value === 1) return 'Red.svg';
        if (value === 2) return 'Green.svg';
        if (value === 3) return 'White.svg';
        return 'Red.svg'; 
      case Suit.FLOWERS:
        return ''; // No standard flower tiles in this set
      default:
        return '';
    }
  }

  /**
   * Preloads all necessary assets into the p5 instance.
   * Should be called inside p5.preload()
   */
  static preload(p: any) {
    // Reset images cache when p5 instance changes
    this.images = {};

    const suits = [Suit.CHARACTERS, Suit.DOTS, Suit.BAMBOO];
    
    // 1. Number Tiles
    suits.forEach(suit => {
      for (let i = 1; i <= 9; i++) {
        const name = this.getAssetName(suit, i);
        const url = `${BASE_URL}${name}`;
        this.images[name] = p.loadImage(url, 
            () => { /* Loaded successfully */ }, 
            () => console.warn(`Failed to load: ${url}`)
        );
      }
    });

    // 2. Winds
    ['East', 'South', 'West', 'North'].forEach(name => {
      const filename = `${name}.svg`;
      this.images[filename] = p.loadImage(`${BASE_URL}${filename}`,
        () => { /* Loaded successfully */ }, 
        () => console.warn(`Failed to load: ${filename}`)
      );
    });

    // 3. Dragons
    ['Red', 'Green', 'White'].forEach(name => {
      const filename = `${name}.svg`;
      this.images[filename] = p.loadImage(`${BASE_URL}${filename}`,
        () => { /* Loaded successfully */ }, 
        () => console.warn(`Failed to load: ${filename}`)
      );
    });
  }

  /**
   * Retrieves the p5 image object for a given tile.
   */
  static getTileImage(tile: Tile): any | null {
    const name = this.getAssetName(tile.suit, tile.value);
    return this.images[name] || null;
  }
}
