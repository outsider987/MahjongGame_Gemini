
import { Suit, Tile } from '../types';

export class AssetLoader {
  private static images: Record<string, any> = {};
  private static woodTexture: any = null;
  private static boneTexture: any = null;
  
  // Texture resolution (Higher = sharper)
  private static TEX_W = 256; // Increased for high fidelity
  private static TEX_H = 320;

  private static colors = {
    RED: '#b91c1c',   // Deep Red (Engraved ink look)
    GREEN: '#15803d', // Deep Green
    BLUE: '#1d4ed8',  // Deep Blue
    BLACK: '#171717'  // Ink Black
  };

  private static getAssetKey(suit: Suit, value: number): string {
    return `${suit}_${value}`;
  }

  static generateAll(p: any) {
    this.images = {};
    
    // Generate Materials
    this.woodTexture = this.createWoodTexture(p);
    this.boneTexture = this.createBoneNoise(p);

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

  static getTileImage(tile: Tile): any | null {
    const key = this.getAssetKey(tile.suit, tile.value);
    return this.images[key] || null;
  }

  static getWoodTexture(): any | null {
      return this.woodTexture;
  }

  static getBoneTexture(): any | null {
      return this.boneTexture;
  }

  // --- Procedural Textures ---

  private static createBoneNoise(p: any) {
      const w = 256; 
      const h = 320;
      const g = p.createGraphics(w, h);
      
      g.clear();
      g.noStroke();
      
      // 1. Large scale "Cloudy" density variations (Watermarks)
      for (let x = 0; x < w; x+=4) {
          for (let y = 0; y < h; y+=4) {
              const n = p.noise(x * 0.008, y * 0.008);
              if (n > 0.45) {
                  const alpha = p.map(n, 0.45, 1, 0, 5);
                  g.fill(40, 40, 30, alpha); 
                  g.rect(x, y, 4.5, 4.5);
              }
          }
      }
      
      // 2. Fine Grain
      const density = 5000;
      for(let i=0; i<density; i++) {
          const x = Math.random() * w;
          const y = Math.random() * h;
          const size = Math.random() * 1.4;
          const alpha = Math.random() * 7;
          
          g.fill(0, 0, 0, alpha);
          g.circle(x, y, size);
      }

      // 3. Organic Micro-scratches
      g.noFill();
      for(let i=0; i<15; i++) {
          const x = Math.random() * w;
          const y = Math.random() * h;
          const len = 5 + Math.random() * 35;
          const angle = Math.random() * Math.PI * 2;
          
          g.stroke(0, 0, 0, Math.random() * 5); 
          g.strokeWeight(Math.random() * 0.6 + 0.1);
          
          g.beginShape();
          g.vertex(x, y);
          const cpX = x + Math.cos(angle) * len * 0.5 + (Math.random()-0.5)*5;
          const cpY = y + Math.sin(angle) * len * 0.5 + (Math.random()-0.5)*5;
          const endX = x + Math.cos(angle) * len;
          const endY = y + Math.sin(angle) * len;
          
          g.quadraticVertex(cpX, cpY, endX, endY);
          g.endShape();
      }

      return g;
  }

  private static createWoodTexture(p: any) {
    const w = 512;
    const h = 512;
    const g = p.createGraphics(w, h);
    
    g.background('#2a1b0e'); 

    g.noFill();
    for (let i = 0; i < 300; i++) {
       g.stroke(255, 255, 255, p.random(2, 5));
       g.strokeWeight(p.random(1, 3));
       let y = p.random(h);
       g.beginShape();
       for(let x=0; x<=w; x+=30) {
           const n = p.noise(x * 0.01, y * 0.01);
           g.curveVertex(x, y + Math.sin(x * 0.02) * 10 + n * 20);
       }
       g.endShape();

       g.stroke(0, 0, 0, p.random(20, 60));
       g.strokeWeight(p.random(1, 4));
       y = p.random(h);
       g.beginShape();
       for(let x=0; x<=w; x+=30) {
           const n = p.noise(x * 0.01, y * 0.01);
           g.curveVertex(x, y + Math.sin(x * 0.02) * 10 + n * 20);
       }
       g.endShape();
    }
    return g;
  }

  // --- Tile Face Generators ---

  private static createBase(p: any) {
    const g = p.createGraphics(this.TEX_W, this.TEX_H);
    g.clear(); 
    return g;
  }

  private static createDotTile(p: any, value: number) {
    const g = this.createBase(p);
    g.noStroke();
    const cx = this.TEX_W / 2;
    const cy = this.TEX_H / 2;
    
    const S = 2.0; 
    const M = 22 * S; 
    
    const drawCircle = (x: number, y: number, size: number, color: string, concentric = false) => {
        g.drawingContext.shadowColor = "rgba(0,0,0,0.3)";
        g.drawingContext.shadowBlur = 2;
        g.drawingContext.shadowOffsetY = 2;
        
        g.fill(color);
        g.circle(x, y, size);
        
        g.drawingContext.shadowBlur = 0;
        g.drawingContext.shadowOffsetY = 0;
        
        g.noStroke();
        g.fill(255, 255, 255, 50);
        g.circle(x - size*0.2, y - size*0.2, size*0.3);

        if (concentric) {
            g.noFill();
            g.stroke(255, 200);
            g.strokeWeight(4);
            g.circle(x, y, size * 0.7);
            g.noStroke();
            g.fill(color);
            g.circle(x, y, size * 0.4);
        }
    };

    const yStep = 35 * S;
    const xStep = 30 * S;

    if (value === 1) {
        drawCircle(cx, cy, 60 * S, this.colors.RED, true);
        g.noFill(); g.stroke(0, 50); g.strokeWeight(2);
        g.circle(cx, cy, 75 * S);
    } else if (value === 2) {
        drawCircle(cx, cy - yStep, M, this.colors.GREEN);
        drawCircle(cx, cy + yStep, M, this.colors.BLUE);
    } else if (value === 3) {
        drawCircle(cx - xStep, cy - yStep, M, this.colors.BLUE);
        drawCircle(cx, cy, M, this.colors.RED);
        drawCircle(cx + xStep, cy + yStep, M, this.colors.GREEN);
    } else if (value === 4) {
        drawCircle(cx - xStep, cy - yStep, M, this.colors.BLUE); drawCircle(cx + xStep, cy - yStep, M, this.colors.GREEN);
        drawCircle(cx - xStep, cy + yStep, M, this.colors.GREEN); drawCircle(cx + xStep, cy + yStep, M, this.colors.BLUE);
    } else if (value === 5) {
        drawCircle(cx - xStep, cy - yStep, M, this.colors.GREEN); drawCircle(cx + xStep, cy - yStep, M, this.colors.BLUE);
        drawCircle(cx, cy, M, this.colors.RED);
        drawCircle(cx - xStep, cy + yStep, M, this.colors.BLUE); drawCircle(cx + xStep, cy + yStep, M, this.colors.GREEN);
    } else if (value === 6) {
        drawCircle(cx - xStep*0.8, cy - yStep, M, this.colors.GREEN); drawCircle(cx + xStep*0.8, cy - yStep, M, this.colors.GREEN);
        drawCircle(cx - xStep*0.8, cy, M, this.colors.RED); drawCircle(cx + xStep*0.8, cy, M, this.colors.RED);
        drawCircle(cx - xStep*0.8, cy + yStep, M, this.colors.RED); drawCircle(cx + xStep*0.8, cy + yStep, M, this.colors.RED);
    } else if (value === 7) {
        drawCircle(cx - xStep*0.8, cy - yStep*1.2, M*0.9, this.colors.GREEN); drawCircle(cx, cy - yStep*1.1, M*0.9, this.colors.GREEN); drawCircle(cx + xStep*0.8, cy - yStep*1.2, M*0.9, this.colors.GREEN);
        drawCircle(cx - xStep*0.8, cy, M, this.colors.RED); drawCircle(cx + xStep*0.8, cy, M, this.colors.RED);
        drawCircle(cx - xStep*0.8, cy + yStep, M, this.colors.RED); drawCircle(cx + xStep*0.8, cy + yStep, M, this.colors.RED);
    } else if (value === 8) {
        drawCircle(cx - xStep*0.8, cy - yStep*1.2, M, this.colors.BLUE); drawCircle(cx + xStep*0.8, cy - yStep*1.2, M, this.colors.BLUE);
        drawCircle(cx - xStep*0.8, cy - yStep*0.4, M, this.colors.BLUE); drawCircle(cx + xStep*0.8, cy - yStep*0.4, M, this.colors.BLUE);
        drawCircle(cx - xStep*0.8, cy + yStep*0.4, M, this.colors.BLUE); drawCircle(cx + xStep*0.8, cy + yStep*0.4, M, this.colors.BLUE);
        drawCircle(cx - xStep*0.8, cy + yStep*1.2, M, this.colors.BLUE); drawCircle(cx + xStep*0.8, cy + yStep*1.2, M, this.colors.BLUE);
    } else if (value === 9) {
        for(let r=0; r<3; r++) {
            for(let c=0; c<3; c++) {
                const col = r === 0 ? this.colors.BLUE : (r === 1 ? this.colors.RED : this.colors.GREEN);
                drawCircle(cx + (c-1)*xStep, cy + (r-1)*yStep, M, col);
            }
        }
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
        // Stick Body
        g.rect(x, y, 12, len, 6);
        // Highlight
        g.fill(255, 255, 255, 100);
        g.rect(x, y, 4, len - 4, 2);
        // Joints
        g.fill(255, 255, 255, 180);
        g.rect(x, y - len/4, 14, 3);
        g.rect(x, y + len/4, 14, 3);
    };

    if (value === 1) {
        // Bird
        g.push(); g.translate(cx, cy + 20);
        g.noStroke();
        g.fill(this.colors.GREEN);
        g.beginShape();
        g.vertex(0, -40);
        g.bezierVertex(50, -30, 50, 50, 0, 50);
        g.bezierVertex(-50, 50, -50, -30, 0, -40);
        g.endShape();
        g.fill(this.colors.RED);
        g.triangle(0, 0, -25, 30, 25, 30);
        g.fill('#fbbf24'); g.circle(0, -35, 12); 
        g.fill('#000'); g.circle(0, -35, 4);
        g.pop();
    } else if (value === 2) {
        drawStick(cx, cy - 50, 70, this.colors.BLUE);
        drawStick(cx, cy + 50, 70, this.colors.GREEN);
    } else if (value === 3) {
        drawStick(cx, cy + 60, 70, this.colors.RED); 
        drawStick(cx - 40, cy - 20, 70, this.colors.GREEN);
        drawStick(cx + 40, cy - 20, 70, this.colors.BLUE);
    } else if (value === 4) {
        drawStick(cx - 45, cy - 60, 65, this.colors.GREEN);
        drawStick(cx + 45, cy - 60, 65, this.colors.BLUE);
        drawStick(cx - 45, cy + 60, 65, this.colors.BLUE);
        drawStick(cx + 45, cy + 60, 65, this.colors.GREEN);
    } else if (value === 5) {
         drawStick(cx - 45, cy - 60, 65, this.colors.GREEN); drawStick(cx + 45, cy - 60, 65, this.colors.BLUE);
         drawStick(cx, cy, 60, this.colors.RED);
         drawStick(cx - 45, cy + 60, 65, this.colors.BLUE); drawStick(cx + 45, cy + 60, 65, this.colors.GREEN);
    } else if (value === 6) {
        drawStick(cx - 50, cy - 50, 60, this.colors.GREEN);
        drawStick(cx,      cy - 50, 60, this.colors.GREEN);
        drawStick(cx + 50, cy - 50, 60, this.colors.GREEN);
        drawStick(cx - 50, cy + 50, 60, this.colors.BLUE);
        drawStick(cx,      cy + 50, 60, this.colors.BLUE);
        drawStick(cx + 50, cy + 50, 60, this.colors.BLUE);
    } else if (value === 7) {
        drawStick(cx - 40, cy - 95, 55, this.colors.GREEN);
        drawStick(cx + 40, cy - 95, 55, this.colors.GREEN);
        const offY = 40;
        drawStick(cx - 45, cy - 60 + offY, 60, this.colors.GREEN);
        drawStick(cx + 45, cy - 60 + offY, 60, this.colors.BLUE);
        drawStick(cx, cy + offY, 55, this.colors.RED);
        drawStick(cx - 45, cy + 60 + offY, 60, this.colors.BLUE);
        drawStick(cx + 45, cy + 60 + offY, 60, this.colors.GREEN);
    } else if (value === 8) {
        drawStick(cx - 65, cy - 60, 55, this.colors.GREEN);
        drawStick(cx - 22, cy - 60, 55, this.colors.GREEN);
        drawStick(cx + 22, cy - 60, 55, this.colors.GREEN);
        drawStick(cx + 65, cy - 60, 55, this.colors.GREEN);
        drawStick(cx - 65, cy + 60, 55, this.colors.BLUE);
        drawStick(cx - 22, cy + 60, 55, this.colors.BLUE);
        drawStick(cx + 22, cy + 60, 55, this.colors.BLUE);
        drawStick(cx + 65, cy + 60, 55, this.colors.BLUE);
    } else if (value === 9) {
        const rowH = 75;
        const stickL = 55;
        drawStick(cx - 55, cy - rowH, stickL, this.colors.GREEN);
        drawStick(cx,      cy - rowH, stickL, this.colors.GREEN);
        drawStick(cx + 55, cy - rowH, stickL, this.colors.GREEN);
        drawStick(cx - 55, cy, stickL, this.colors.RED);
        drawStick(cx,      cy, stickL, this.colors.RED);
        drawStick(cx + 55, cy, stickL, this.colors.RED);
        drawStick(cx - 55, cy + rowH, stickL, this.colors.BLUE);
        drawStick(cx,      cy + rowH, stickL, this.colors.BLUE);
        drawStick(cx + 55, cy + rowH, stickL, this.colors.BLUE);
    } else {
        // Fallback for numbers if any weird value passed
        g.textAlign(p.CENTER, p.CENTER); g.textSize(60); g.fill(this.colors.GREEN); g.text(value, cx, cy);
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
    
    g.textSize(90);
    g.fill(this.colors.BLACK);
    g.drawingContext.shadowColor = "rgba(0,0,0,0.5)";
    g.drawingContext.shadowBlur = 2;
    g.text(char, cx, 80);

    g.textSize(110);
    g.fill(this.colors.RED);
    g.text("萬", cx, 210);

    return g;
  }

  private static createHonorTile(p: any, char: string, color: string) {
    const g = this.createBase(p);
    const cx = this.TEX_W / 2;
    const cy = this.TEX_H / 2;

    g.textAlign(p.CENTER, p.CENTER);
    g.textStyle(p.BOLD);
    g.textSize(160);
    
    g.stroke(255, 200);
    g.strokeWeight(6);
    g.fill(color);
    
    g.drawingContext.shadowColor = "rgba(0,0,0,0.4)";
    g.drawingContext.shadowBlur = 4;
    g.drawingContext.shadowOffsetY = 4;

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
    g.strokeWeight(12);
    g.rect(cx, cy, 140, 190, 12);
    return g;
  }

  private static createFlowerTile(p: any, val: number) {
      const g = this.createBase(p);
      const cx = this.TEX_W / 2;
      const cy = this.TEX_H / 2;
      
      g.textAlign(p.CENTER, p.CENTER);
      g.textSize(120);
      g.fill('#fb8c00'); 
      g.text("✿", cx, cy - 30);
      
      g.textSize(60);
      g.fill(this.colors.BLACK);
      g.text(val, cx + 60, cy + 100);
      return g;
  }
}
