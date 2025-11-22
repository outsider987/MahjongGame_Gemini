
import { Suit, Tile } from '../types';

export class AssetLoader {
  private static images: Record<string, any> = {};
  
  // Texture resolution (Higher = sharper)
  private static TEX_W = 100;
  private static TEX_H = 135;

  private static colors = {
    RED: '#b91c1c',
    GREEN: '#15803d',
    BLUE: '#1e3a8a',
    BLACK: '#0f172a'
  };

  /**
   * Maps a Tile object to the specific key.
   */
  private static getAssetKey(suit: Suit, value: number): string {
    return `${suit}_${value}`;
  }

  /**
   * Generates all tile assets programmatically.
   * Call this in p5.setup() or p5.preload().
   */
  static generateAll(p: any) {
    this.images = {};
    
    // 1. Dots (Pin)
    for (let i = 1; i <= 9; i++) {
      this.images[this.getAssetKey(Suit.DOTS, i)] = this.createDotTile(p, i);
    }

    // 2. Bamboo (Sou)
    for (let i = 1; i <= 9; i++) {
      this.images[this.getAssetKey(Suit.BAMBOO, i)] = this.createBambooTile(p, i);
    }

    // 3. Characters (Man)
    for (let i = 1; i <= 9; i++) {
      this.images[this.getAssetKey(Suit.CHARACTERS, i)] = this.createCharacterTile(p, i);
    }

    // 4. Winds
    const winds = ['東', '南', '西', '北'];
    for (let i = 1; i <= 4; i++) {
      this.images[this.getAssetKey(Suit.WINDS, i)] = this.createHonorTile(p, winds[i-1], this.colors.BLACK);
    }

    // 5. Dragons
    this.images[this.getAssetKey(Suit.DRAGONS, 1)] = this.createHonorTile(p, '中', this.colors.RED); // Red
    this.images[this.getAssetKey(Suit.DRAGONS, 2)] = this.createHonorTile(p, '發', this.colors.GREEN); // Green
    this.images[this.getAssetKey(Suit.DRAGONS, 3)] = this.createWhiteDragon(p); // White (Block)

    // 6. Flowers
    for (let i = 1; i <= 8; i++) {
        this.images[this.getAssetKey(Suit.FLOWERS, i)] = this.createFlowerTile(p, i);
    }
  }

  /**
   * Retrieves the p5 image object for a given tile.
   */
  static getTileImage(tile: Tile): any | null {
    const key = this.getAssetKey(tile.suit, tile.value);
    return this.images[key] || null;
  }

  // --- Procedural Drawing Helpers ---

  private static createBase(p: any) {
    const g = p.createGraphics(this.TEX_W, this.TEX_H);
    g.clear(); // Transparent background
    // g.background(255); // Debug white background
    return g;
  }

  private static createDotTile(p: any, value: number) {
    const g = this.createBase(p);
    g.noStroke();
    const cx = this.TEX_W / 2;
    const cy = this.TEX_H / 2;
    
    // Dot Sizes
    const L = 30; // Large
    const M = 22; // Medium
    
    const drawCircle = (x: number, y: number, size: number, color: string, concentric = false) => {
        g.fill(color);
        g.circle(x, y, size);
        if (concentric) {
            g.noFill();
            g.stroke(255, 200);
            g.strokeWeight(2);
            g.circle(x, y, size * 0.7);
            g.noStroke();
            g.fill(color);
            g.circle(x, y, size * 0.4);
        }
    };

    if (value === 1) {
        // Big Red Circle
        drawCircle(cx, cy, 55, this.colors.RED, true);
        // Inner floral detail
        g.stroke(255); g.strokeWeight(2); g.noFill();
        for(let r=0; r<Math.PI*2; r+=Math.PI/3) {
             g.line(cx + Math.cos(r)*10, cy+Math.sin(r)*10, cx+Math.cos(r)*20, cy+Math.sin(r)*20);
        }

    } else if (value === 2) {
        drawCircle(cx, cy - 30, M, this.colors.GREEN);
        drawCircle(cx, cy + 30, M, this.colors.BLUE);
    } else if (value === 3) {
        drawCircle(cx - 25, cy - 35, M, this.colors.BLUE);
        drawCircle(cx, cy, M, this.colors.RED);
        drawCircle(cx + 25, cy + 35, M, this.colors.GREEN);
    } else if (value === 4) {
        [ -20, 20 ].forEach(x => {
            [ -25, 25 ].forEach(y => {
                 drawCircle(cx + x, cy + y, M, y < 0 ? this.colors.BLUE : this.colors.GREEN);
            });
        });
    } else if (value === 5) {
        // Like 4 but with center
        [ -25, 25 ].forEach(x => {
            [ -30, 30 ].forEach(y => {
                 drawCircle(cx + x, cy + y, M, y < 0 ? this.colors.BLUE : this.colors.GREEN);
            });
        });
        drawCircle(cx, cy, M, this.colors.RED);
    } else if (value === 6) {
        [ -20, 20 ].forEach(x => {
            [ -35, 0, 35 ].forEach(y => {
                 drawCircle(cx + x, cy + y, M, this.colors.GREEN);
            });
        });
        // Top 2 are red in some sets, usually all green or green/red mix. keeping simple.
        g.fill(this.colors.RED); g.circle(cx - 20, cy - 35, M); g.circle(cx + 20, cy - 35, M);
    } else if (value === 7) {
        // Diagonal 3
        drawCircle(cx - 25, cy - 40, 18, this.colors.GREEN);
        drawCircle(cx, cy - 32, 18, this.colors.GREEN);
        drawCircle(cx + 25, cy - 24, 18, this.colors.GREEN);
        // Bottom 4
        [ -20, 20 ].forEach(x => {
            [ 10, 40 ].forEach(y => {
                 drawCircle(cx + x, cy + y, M, this.colors.RED);
            });
        });
    } else if (value === 8) {
        [ -20, 20 ].forEach(x => {
            [ -35, -12, 12, 35 ].forEach(y => {
                 drawCircle(cx + x, cy + y, M, this.colors.BLUE);
            });
        });
    } else if (value === 9) {
         [ -25, 0, 25 ].forEach(x => {
            [ -30, 0, 30 ].forEach(y => {
                 drawCircle(cx + x, cy + y, M, this.colors.RED); // All red usually, or mix
            });
        });
    }

    return g;
  }

  private static createBambooTile(p: any, value: number) {
    const g = this.createBase(p);
    const cx = this.TEX_W / 2;
    const cy = this.TEX_H / 2;
    
    const drawStick = (x: number, y: number, len: number, color: string, vertical = true) => {
        g.fill(color);
        g.noStroke();
        if (vertical) {
            g.rectMode(p.CENTER);
            g.rect(x, y, 6, len, 3);
            // Detail
            g.fill(255, 255, 255, 150);
            g.rect(x, y - len/4, 6, 2);
            g.rect(x, y + len/4, 6, 2);
        } else {
            // Simple shape for complex piles
        }
    };

    if (value === 1) {
        // The Bird (Simplified Peacock)
        g.push();
        g.translate(cx, cy);
        g.noStroke();
        
        // Body
        g.fill(this.colors.GREEN);
        g.beginShape();
        g.vertex(0, -10);
        g.bezierVertex(15, -10, 15, 20, 0, 30);
        g.bezierVertex(-15, 20, -15, -10, 0, -10);
        g.endShape();

        // Tail
        g.fill(this.colors.RED);
        g.circle(0, 40, 10);
        g.stroke(this.colors.RED);
        g.strokeWeight(3);
        g.line(0, 30, -20, 45);
        g.line(0, 30, 20, 45);

        // Head
        g.noStroke();
        g.fill(this.colors.GREEN);
        g.circle(0, -20, 15);
        g.fill('#fbbf24'); // Beak
        g.triangle(-2, -20, 2, -20, 0, -12);
        g.pop();
    } else if (value === 2) {
        drawStick(cx, cy - 25, 40, this.colors.BLUE);
        drawStick(cx, cy + 25, 40, this.colors.GREEN);
    } else if (value === 3) {
        drawStick(cx, cy + 30, 40, this.colors.RED); // Middle Red
        drawStick(cx - 20, cy - 10, 40, this.colors.GREEN);
        drawStick(cx + 20, cy - 10, 40, this.colors.BLUE);
    } else if (value === 4) {
        drawStick(cx - 20, cy - 25, 40, this.colors.BLUE);
        drawStick(cx + 20, cy - 25, 40, this.colors.GREEN);
        drawStick(cx - 20, cy + 25, 40, this.colors.GREEN);
        drawStick(cx + 20, cy + 25, 40, this.colors.BLUE);
    } else if (value === 5) {
        // Like 4 + center
        drawStick(cx - 25, cy - 30, 35, this.colors.GREEN);
        drawStick(cx + 25, cy - 30, 35, this.colors.BLUE);
        drawStick(cx - 25, cy + 30, 35, this.colors.BLUE);
        drawStick(cx + 25, cy + 30, 35, this.colors.GREEN);
        drawStick(cx, cy, 30, this.colors.RED);
    } else if (value === 6) {
        for(let i=0; i<3; i++) drawStick(cx - 20 + (i*20), cy - 25, 35, this.colors.GREEN);
        for(let i=0; i<3; i++) drawStick(cx - 20 + (i*20), cy + 25, 35, this.colors.BLUE);
    } else if (value === 7) {
        // Top red hook, bottom 4 green
        g.stroke(this.colors.RED); g.strokeWeight(5); g.noFill();
        g.line(cx, cy - 40, cx, cy-10);
        g.line(cx-15, cy - 25, cx+15, cy-25); // Simulated hook part
        
        drawStick(cx - 20, cy + 25, 35, this.colors.GREEN);
        drawStick(cx + 20, cy + 25, 35, this.colors.GREEN);
        drawStick(cx, cy + 25, 35, this.colors.GREEN);
    } else if (value === 8) {
        // M shape or just slants
        g.stroke(this.colors.GREEN); g.strokeWeight(5);
        g.line(cx-20, cy-40, cx+20, cy-20); // lazy diagonal
        g.line(cx+20, cy-40, cx-20, cy-20);
        g.stroke(this.colors.BLUE);
        g.line(cx-20, cy+40, cx+20, cy+20);
        g.line(cx+20, cy+40, cx-20, cy+20);
        
        // Straight ones
        drawStick(cx, cy-30, 30, this.colors.GREEN);
        drawStick(cx, cy+30, 30, this.colors.BLUE);
    } else if (value === 9) {
         drawStick(cx - 25, cy - 30, 35, this.colors.RED);
         drawStick(cx, cy - 30, 35, this.colors.BLUE);
         drawStick(cx + 25, cy - 30, 35, this.colors.GREEN);
         
         drawStick(cx - 25, cy, 35, this.colors.RED);
         drawStick(cx, cy, 35, this.colors.BLUE);
         drawStick(cx + 25, cy, 35, this.colors.GREEN);

         drawStick(cx - 25, cy + 30, 35, this.colors.RED);
         drawStick(cx, cy + 30, 35, this.colors.BLUE);
         drawStick(cx + 25, cy + 30, 35, this.colors.GREEN);
    }
    return g;
  }

  private static createCharacterTile(p: any, value: number) {
    const g = this.createBase(p);
    const cx = this.TEX_W / 2;
    
    const chineseNums = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];
    const char = chineseNums[value - 1];

    g.textAlign(p.CENTER, p.CENTER);
    g.textStyle(p.BOLD);
    
    // Number
    g.textSize(50);
    g.fill(this.colors.BLACK);
    g.text(char, cx, 40);

    // Wan
    g.textSize(55);
    g.fill(this.colors.RED);
    g.text("萬", cx, 95);

    return g;
  }

  private static createHonorTile(p: any, char: string, color: string) {
    const g = this.createBase(p);
    const cx = this.TEX_W / 2;
    const cy = this.TEX_H / 2;

    g.textAlign(p.CENTER, p.CENTER);
    g.textStyle(p.BOLD);
    g.textSize(80);
    g.fill(color);
    g.text(char, cx, cy);
    return g;
  }

  private static createWhiteDragon(p: any) {
    const g = this.createBase(p);
    const cx = this.TEX_W / 2;
    const cy = this.TEX_H / 2;
    
    g.rectMode(p.CENTER);
    g.noFill();
    g.stroke(this.colors.BLUE);
    g.strokeWeight(6);
    g.rect(cx, cy, 70, 90, 5);
    return g;
  }

  private static createFlowerTile(p: any, val: number) {
      const g = this.createBase(p);
      const cx = this.TEX_W / 2;
      const cy = this.TEX_H / 2;
      
      g.textAlign(p.CENTER, p.CENTER);
      g.textSize(60);
      g.fill('#d97706'); // Gold/Orange
      g.text("✿", cx, cy - 10);
      
      g.textSize(30);
      g.fill(this.colors.BLACK);
      g.text(val, cx + 30, cy + 40);
      return g;
  }
}
