
import { Suit, Tile } from '../types';
import { AssetLoader } from './AssetLoader';

const INK_BLACK = '#0f172a';

export class TileRenderService {
  
  static drawTile(
      p: any, x: number, y: number, tile: Tile | null, w: number, h: number, 
      type: 'STANDING' | 'FLAT' | 'BACK_STANDING' | 'SIDE_STANDING', scale: number
  ) {
     p.push();
     p.translate(x, y);
     
     const BACK_COLOR = '#022c22'; 
     const FACE_COLOR = '#fdfbf7'; 
     // 3D depth extrusion
     const depth = type === 'STANDING' ? 6 : (type === 'FLAT' ? 4 : 5);
     const sDepth = depth * scale;

     p.noStroke();

     if (type === 'STANDING') {
         // Shadow
         p.fill(0,0,0, 60); p.rect(sDepth, sDepth, w, h, sDepth); 
         // Body
         p.fill(BACK_COLOR); p.rect(0, 0, w, h, sDepth);
         // Layer
         p.fill('#e2e8f0'); p.rect(0, -2*scale, w, h, sDepth);
         // Face
         p.fill(FACE_COLOR); p.rect(0, -4*scale, w, h, sDepth);
         if (tile) this.drawTileFace(p, tile, w, h, -4*scale);

     } else if (type === 'FLAT') {
         p.fill(0,0,0, 50); p.rect(sDepth*0.8, sDepth*0.8, w, h, 4);
         p.fill(BACK_COLOR); p.rect(0, 0, w, h, 4);
         p.fill(FACE_COLOR); p.rect(0, -5*scale, w, h, 4); 
         if (tile) this.drawTileFace(p, tile, w, h, -5*scale);

     } else if (type === 'BACK_STANDING') {
         p.fill(0,0,0, 50); p.rect(sDepth*0.8, sDepth*0.8, w, h, 5);
         p.fill(BACK_COLOR); p.rect(0, 0, w, h, 5);
         p.fill(255,255,255,40); p.rect(0,0,w,h/3,5,5,0,0); // Highlight

     } else if (type === 'SIDE_STANDING') {
         p.fill(0,0,0, 50); p.rect(sDepth*0.6, sDepth*0.6, w, h, 2);
         p.fill(BACK_COLOR); p.rect(0, 0, w, h, 2);
         p.fill('#047857'); p.rect(0, 0, w, 4*scale, 2); 
     }
     p.pop();
  }
  
  private static drawTileFace(p: any, tile: Tile, w: number, h: number, yOffset: number) {
      p.translate(w/2, h/2 + yOffset);
      
      // 1. Try to render using High-Fidelity SVG
      const img = AssetLoader.getTileImage(tile);
      
      // Check if image is loaded and valid
      if (img && img.width > 1) {
          const padding = w * 0.15;
          p.imageMode(p.CENTER);
          p.image(img, 0, 0, w - padding, h - padding);
      } else {
          // 2. Fallback to Procedural Text
          p.textAlign(p.CENTER, p.CENTER);
          const INK_RED = '#b91c1c'; 
          const INK_GREEN = '#15803d'; 
          const INK_BLUE = '#1e3a8a'; 
          
          let displayStr = `${tile.value}`;
          let subStr = "";
          let color = INK_BLUE;

          if (tile.suit === Suit.DOTS) {
            displayStr = "●";
            subStr = `${tile.value}`;
            color = INK_BLUE;
          } else if (tile.suit === Suit.BAMBOO) {
            displayStr = "║";
            subStr = `${tile.value}`;
            color = INK_GREEN;
          } else if (tile.suit === Suit.CHARACTERS) {
            displayStr = "萬";
            subStr = `${tile.value}`;
            color = INK_RED;
          } else if (tile.suit === Suit.WINDS) {
            const winds = ["東", "南", "西", "北"];
            displayStr = winds[tile.value - 1] || "風";
            color = INK_BLACK;
          } else if (tile.suit === Suit.DRAGONS) {
            if (tile.value === 1) { displayStr = "中"; color = INK_RED; }
            else if (tile.value === 2) { displayStr = "發"; color = INK_GREEN; }
            else { displayStr = "⬜"; color = '#1a1a1a'; } // White
          } else if (tile.suit === Suit.FLOWERS) {
              displayStr = "✿"; subStr = `${tile.value}`; color = '#d97706'; 
          }
          
          const fontSizeMain = w * 0.6;
          p.textSize(fontSizeMain); p.textStyle(p.BOLD);
          p.fill(color); p.text(displayStr, 0, 0);
          if (subStr) {
              p.textSize(w * 0.28);
              p.fill(color); p.text(subStr, 0, h*0.3);
          }
      }
  }
}
