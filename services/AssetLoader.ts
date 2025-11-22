
import { Suit, Tile } from '../types';

export class AssetLoader {
  private static images: Record<string, any> = {};
  
  // Texture resolution (Higher = sharper)
  private static TEX_W = 128; // Increased for quality
  private static TEX_H = 160;

  private static colors = {
    RED: '#c62828',   // Darker Red
    GREEN: '#2e7d32', // Forest Green
    BLUE: '#1565c0',  // Deep Blue
    BLACK: '#212121'
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
    return g;
  }

  private static createDotTile(p: any, value: number) {
    const g = this.createBase(p);
    g.noStroke();
    const cx = this.TEX_W / 2;
    const cy = this.TEX_H / 2;
    
    // Scaling factor for higher res
    const S = 1.2;
    const L = 30 * S; 
    const M = 22 * S; 
    
    const drawCircle = (x: number, y: number, size: number, color: string, concentric = false) => {
        // Add subtle shadow/gradient to ink
        g.drawingContext.shadowColor = "rgba(0,0,0,0.2)";
        g.drawingContext.shadowBlur = 2;
        
        g.fill(color);
        g.circle(x, y, size);
        
        g.drawingContext.shadowBlur = 0; // Reset

        if (concentric) {
            g.noFill();
            g.stroke(255, 200);
            g.strokeWeight(3);
            g.circle(x, y, size * 0.7);
            g.noStroke();
            g.fill(color);
            g.circle(x, y, size * 0.4);
        }
    };

    // (Logic remains largely same, just adjusted positions for new Aspect Ratio)
    if (value === 1) {
        drawCircle(cx, cy, 60 * S, this.colors.RED, true);
        g.stroke(255); g.strokeWeight(2); g.noFill();
        for(let r=0; r<Math.PI*2; r+=Math.PI/4) {
             g.line(cx + Math.cos(r)*15, cy+Math.sin(r)*15, cx+Math.cos(r)*25, cy+Math.sin(r)*25);
        }
    } else if (value === 2) {
        drawCircle(cx, cy - 35, M, this.colors.GREEN);
        drawCircle(cx, cy + 35, M, this.colors.BLUE);
    } else if (value === 3) {
        drawCircle(cx - 30, cy - 40, M, this.colors.BLUE);
        drawCircle(cx, cy, M, this.colors.RED);
        drawCircle(cx + 30, cy + 40, M, this.colors.GREEN);
    } else if (value === 4) {
        [ -25, 25 ].forEach(x => { [ -30, 30 ].forEach(y => drawCircle(cx + x, cy + y, M, y < 0 ? this.colors.BLUE : this.colors.GREEN)); });
    } else if (value === 5) {
        [ -28, 28 ].forEach(x => { [ -35, 35 ].forEach(y => drawCircle(cx + x, cy + y, M, y < 0 ? this.colors.BLUE : this.colors.GREEN)); });
        drawCircle(cx, cy, M, this.colors.RED);
    } else if (value === 6) {
        [ -24, 24 ].forEach(x => { [ -40, 0, 40 ].forEach(y => drawCircle(cx + x, cy + y, M, this.colors.GREEN)); });
        g.fill(this.colors.RED); g.circle(cx - 24, cy - 40, M); g.circle(cx + 24, cy - 40, M);
    } else if (value === 7) {
        drawCircle(cx - 28, cy - 45, 20, this.colors.GREEN);
        drawCircle(cx, cy - 35, 20, this.colors.GREEN);
        drawCircle(cx + 28, cy - 25, 20, this.colors.GREEN);
        [ -22, 22 ].forEach(x => { [ 15, 45 ].forEach(y => drawCircle(cx + x, cy + y, M, this.colors.RED)); });
    } else if (value === 8) {
        [ -24, 24 ].forEach(x => { [ -40, -14, 14, 40 ].forEach(y => drawCircle(cx + x, cy + y, M, this.colors.BLUE)); });
    } else if (value === 9) {
         [ -30, 0, 30 ].forEach(x => { [ -35, 0, 35 ].forEach(y => drawCircle(cx + x, cy + y, M, this.colors.RED)); });
    }
    return g;
  }

  private static createBambooTile(p: any, value: number) {
    const g = this.createBase(p);
    const cx = this.TEX_W / 2;
    const cy = this.TEX_H / 2;
    
    const drawStick = (x: number, y: number, len: number, color: string) => {
        g.fill(color);
        g.noStroke();
        g.rectMode(p.CENTER);
        g.rect(x, y, 7, len, 3);
        g.fill(255, 255, 255, 150);
        g.rect(x, y - len/4, 7, 2);
        g.rect(x, y + len/4, 7, 2);
    };

    if (value === 1) {
        g.push(); g.translate(cx, cy + 10);
        // Tail feathers
        g.noStroke();
        g.fill(this.colors.RED);
        g.triangle(0, 20, -20, 50, 20, 50);
        g.fill(this.colors.GREEN);
        g.beginShape();
        g.vertex(0, -30);
        g.bezierVertex(30, -20, 30, 30, 0, 30);
        g.bezierVertex(-30, 30, -30, -20, 0, -30);
        g.endShape();
        g.fill('#fbbf24'); g.circle(0, -25, 8); // Eye/Beak
        g.pop();
    } else if (value === 2) {
        drawStick(cx, cy - 30, 45, this.colors.BLUE);
        drawStick(cx, cy + 30, 45, this.colors.GREEN);
    } else if (value === 3) {
        drawStick(cx, cy + 35, 45, this.colors.RED); 
        drawStick(cx - 24, cy - 15, 45, this.colors.GREEN);
        drawStick(cx + 24, cy - 15, 45, this.colors.BLUE);
    } else if (value === 4) {
        drawStick(cx - 24, cy - 30, 45, this.colors.BLUE);
        drawStick(cx + 24, cy - 30, 45, this.colors.GREEN);
        drawStick(cx - 24, cy + 30, 45, this.colors.GREEN);
        drawStick(cx + 24, cy + 30, 45, this.colors.BLUE);
    } else if (value === 5) {
        drawStick(cx - 28, cy - 35, 40, this.colors.GREEN);
        drawStick(cx + 28, cy - 35, 40, this.colors.BLUE);
        drawStick(cx - 28, cy + 35, 40, this.colors.BLUE);
        drawStick(cx + 28, cy + 35, 40, this.colors.GREEN);
        drawStick(cx, cy, 35, this.colors.RED);
    } else if (value === 6) {
        for(let i=0; i<3; i++) drawStick(cx - 24 + (i*24), cy - 30, 40, this.colors.GREEN);
        for(let i=0; i<3; i++) drawStick(cx - 24 + (i*24), cy + 30, 40, this.colors.BLUE);
    } else if (value === 8) {
         g.noFill(); g.strokeWeight(6);
         g.stroke(this.colors.GREEN); g.arc(cx, cy-30, 50, 50, Math.PI * 0.2, Math.PI * 0.8);
         g.stroke(this.colors.BLUE); g.arc(cx, cy+30, 50, 50, Math.PI * 1.2, Math.PI * 1.8);
         g.noStroke();
         drawStick(cx - 15, cy - 30, 30, this.colors.GREEN); drawStick(cx + 15, cy - 30, 30, this.colors.GREEN);
         drawStick(cx - 15, cy + 30, 30, this.colors.BLUE); drawStick(cx + 15, cy + 30, 30, this.colors.BLUE);
    } else {
         // Fallback for 7, 9 (Simpler implementation for brevity)
         g.textAlign(p.CENTER, p.CENTER); g.textSize(40); g.text(value, cx, cy);
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
    
    g.textSize(55);
    g.fill(this.colors.BLACK);
    g.text(char, cx, 45);

    g.textSize(65);
    g.fill(this.colors.RED);
    g.text("萬", cx, 110);

    return g;
  }

  private static createHonorTile(p: any, char: string, color: string) {
    const g = this.createBase(p);
    const cx = this.TEX_W / 2;
    const cy = this.TEX_H / 2;

    g.textAlign(p.CENTER, p.CENTER);
    g.textStyle(p.BOLD);
    g.textSize(90);
    
    // Add Stroke for elegance
    g.stroke(255, 200);
    g.strokeWeight(4);
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
    g.strokeWeight(8);
    g.rect(cx, cy, 80, 100, 8);
    return g;
  }

  private static createFlowerTile(p: any, val: number) {
      const g = this.createBase(p);
      const cx = this.TEX_W / 2;
      const cy = this.TEX_H / 2;
      
      g.textAlign(p.CENTER, p.CENTER);
      g.textSize(70);
      g.fill('#fb8c00'); 
      g.text("✿", cx, cy - 20);
      
      g.textSize(35);
      g.fill(this.colors.BLACK);
      g.text(val, cx + 40, cy + 50);
      return g;
  }
}
