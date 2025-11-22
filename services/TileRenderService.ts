
import { Suit, Tile } from '../types';
import { AssetLoader } from './AssetLoader';
import { COLORS } from '../constants';

export class TileRenderService {
  
  /**
   * Master render function that delegates to specific 2.5D implementations
   */
  static drawTile(
      p: any, x: number, y: number, tile: Tile | null, w: number, h: number, 
      type: 'STANDING' | 'FLAT' | 'BACK_STANDING' | 'SIDE_STANDING_R' | 'SIDE_STANDING_L', scale: number
  ) {
     p.push();
     p.translate(x, y);

     switch (type) {
         case 'STANDING': // Player's hand
             this.drawStandingTile(p, tile, w, h, scale);
             break;
         case 'FLAT': // Discards, Melds
             this.drawFlatTile(p, tile, w, h, scale);
             break;
         case 'BACK_STANDING': // Opponent Top
             this.drawBackStandingTile(p, w, h, scale);
             break;
         case 'SIDE_STANDING_R': // Opponent Right
             this.drawSideStandingTile(p, w, h, scale, false);
             break;
         case 'SIDE_STANDING_L': // Opponent Left
             this.drawSideStandingTile(p, w, h, scale, true);
             break;
     }

     p.pop();
  }

  // --- 1. Standing Tile (The Player's Hand) ---
  private static drawStandingTile(p: any, tile: Tile | null, w: number, h: number, scale: number) {
      const ctx = p.drawingContext;
      const depth = 12 * scale;
      const r = 6 * scale; // Smoother corners

      // 1. Shadow (Smoother and deeper)
      p.noStroke();
      p.fill(0, 0, 0, 60);
      // Offset shadow slightly more for depth
      p.rect(depth * 0.6, depth * 0.6, w, h, r);

      // 2. The Green Back Body (Jade texture)
      const grdBack = ctx.createLinearGradient(0, 0, w, 0);
      grdBack.addColorStop(0, '#064e3b');
      grdBack.addColorStop(0.4, '#10b981'); // Bright ridge
      grdBack.addColorStop(1, '#064e3b');
      
      ctx.fillStyle = grdBack;
      p.rect(0, 0, w, h, r);

      // 3. The White Face Layer
      const faceDepth = 3 * scale; 
      p.translate(0, -faceDepth);
      
      // Face Gradient (Subtle curve look - Bone)
      const grdFace = ctx.createLinearGradient(0, 0, w, h);
      grdFace.addColorStop(0, '#ffffff');
      grdFace.addColorStop(1, '#f1f5f9');
      
      ctx.fillStyle = grdFace;
      p.rect(0, 0, w, h, r);
      
      // 4. Glossy Highlight (Top Shine)
      const grdGloss = ctx.createLinearGradient(0, 0, 0, h * 0.4);
      grdGloss.addColorStop(0, 'rgba(255,255,255,0.8)');
      grdGloss.addColorStop(1, 'rgba(255,255,255,0.0)');
      ctx.fillStyle = grdGloss;
      p.rect(0, 0, w, h * 0.4, r, r, 0, 0);

      // 5. Tile Content
      if (tile) {
          this.drawTileFace(p, tile, w, h, 0);
      }
  }

  // --- 2. Flat Tile (Table Discards / Melds) ---
  private static drawFlatTile(p: any, tile: Tile | null, w: number, h: number, scale: number) {
      const ctx = p.drawingContext;
      const r = 4 * scale;

      // 1. Shadow
      const thickness = 8 * scale;
      p.noStroke();
      p.fill(0, 0, 0, 50);
      p.rect(4*scale, 4*scale, w, h + thickness, r);

      // 2. Green Base (Side Thickness)
      const grdThick = ctx.createLinearGradient(0, h, 0, h + thickness);
      grdThick.addColorStop(0, COLORS.TILE_BACK_MAIN);
      grdThick.addColorStop(1, COLORS.TILE_BACK_DARK);
      ctx.fillStyle = grdThick;
      
      // Trapezoid for perspective thickness
      p.beginShape();
      p.vertex(0, h - r);
      p.vertex(w, h - r);
      p.vertex(w, h + thickness - r);
      p.vertex(0, h + thickness - r);
      p.endShape(p.CLOSE);
      // Bottom rect
      p.rect(0, h - r, w, thickness, 0, 0, r, r);

      // 3. The White Face
      const grdFace = ctx.createLinearGradient(0, 0, 0, h);
      grdFace.addColorStop(0, '#ffffff');
      grdFace.addColorStop(1, '#e2e8f0');
      ctx.fillStyle = grdFace;
      p.rect(0, 0, w, h, r);

      // 5. Content
      if (tile) {
          this.drawTileFace(p, tile, w, h, 0);
      }
      
      // 6. Surface Shine
      p.noStroke();
      p.fill(255, 255, 255, 40);
      p.ellipse(w * 0.8, h * 0.2, w * 0.6, h * 0.3);
  }

  // --- 3. Back Standing (Opponent Top) ---
  private static drawBackStandingTile(p: any, w: number, h: number, scale: number) {
      const ctx = p.drawingContext;
      const r = 4 * scale;
      const depth = 4 * scale;

      // Shadow
      p.fill(0, 0, 0, 60);
      p.rect(depth, depth, w, h, r);

      // Main Green Back
      const grd = ctx.createLinearGradient(0, 0, w, 0);
      grd.addColorStop(0, '#065f46');
      grd.addColorStop(0.5, '#10b981'); // Highlight in middle
      grd.addColorStop(1, '#065f46');
      ctx.fillStyle = grd;
      p.rect(0, 0, w, h, r);
      
      // Top Highlight (Curved top of standing tile)
      p.fill(255, 255, 255, 150);
      p.rect(0, 0, w, 3 * scale, r, r, 0, 0);
  }

  // --- 4. Side Standing (Opponent Left/Right) ---
  private static drawSideStandingTile(p: any, stepW: number, lenH: number, scale: number, isLeft: boolean) {
      const ctx = p.drawingContext;
      const dw = lenH; 
      const dh = stepW; 
      
      // 1. Shadow
      p.noStroke();
      p.fill(0, 0, 0, 60);
      p.rect(4*scale, 4*scale, dw, dh, 4*scale);

      // 2. Material Split
      const boneRatio = 0.35;
      const boneSize = dh * boneRatio;
      const bambooSize = dh - boneSize;
      
      // A. Bone Section
      const grdBone = ctx.createLinearGradient(0, 0, 0, boneSize);
      grdBone.addColorStop(0, '#ffffff');
      grdBone.addColorStop(1, '#cbd5e1');
      ctx.fillStyle = grdBone;
      p.rect(0, 0, dw, boneSize);
      
      // B. Bamboo Section
      const grdBamboo = ctx.createLinearGradient(0, boneSize, 0, dh);
      grdBamboo.addColorStop(0, '#10b981');
      grdBamboo.addColorStop(1, '#064e3b');
      ctx.fillStyle = grdBamboo;
      p.rect(0, boneSize, dw, bambooSize);

      // C. Dovetail Joint
      p.stroke('#064e3b');
      p.strokeWeight(1 * scale);
      p.noFill();
      p.beginShape();
      const zigSize = 6 * scale;
      for(let i = 0; i <= dw; i += zigSize) {
          p.vertex(i, boneSize);
          p.vertex(i + zigSize/2, boneSize + (1.5 * scale));
      }
      p.endShape();
      p.noStroke();

      // --- 3. Top Cap ---
      const capSize = 6 * scale; 
      let capX = isLeft ? dw - capSize : 0;
      
      const grdCap = ctx.createLinearGradient(capX, 0, capX+capSize, 0);
      grdCap.addColorStop(0, '#f8fafc');
      grdCap.addColorStop(1, '#e2e8f0');
      ctx.fillStyle = grdCap;
      p.rect(capX, 0, capSize, dh, 2*scale);
      
      // Shiny highlight on green cap part
      p.fill(255, 255, 255, 120);
      p.rect(capX, boneSize, capSize, bambooSize, 0, 2*scale, 2*scale, 0);
  }
  
  // --- Content Drawing (Face) ---
  private static drawTileFace(p: any, tile: Tile, w: number, h: number, yOffset: number) {
      p.push();
      p.translate(w/2, h/2 + yOffset);
      
      const img = AssetLoader.getTileImage(tile);
      
      if (img && img.width > 1) {
          const padding = w * 0.15;
          // Engraving Effect (Inner Shadow)
          p.tint(0, 0, 0, 60); 
          p.imageMode(p.CENTER);
          // Shift slightly down-right to create "engraved" look
          p.image(img, 1, 1, w - padding, h - padding);
          
          p.noTint();
          p.image(img, 0, 0, w - padding, h - padding);
      } else {
          this.drawFallbackText(p, tile, w, h);
      }
      p.pop();
  }

  private static drawFallbackText(p: any, tile: Tile, w: number, h: number) {
      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(w * 0.6);
      p.fill(0);
      p.text(tile.value, 0, 0);
  }
}
