
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
      const r = 4 * scale; // Radius

      // 1. Shadow
      p.noStroke();
      p.fill(COLORS.TILE_SHADOW);
      p.rect(depth * 0.5, depth * 0.5, w, h, r);

      // 2. The Green Back Body (Jade texture)
      const grdBack = ctx.createLinearGradient(0, 0, w, 0);
      grdBack.addColorStop(0, COLORS.TILE_BACK_DARK);
      grdBack.addColorStop(0.5, COLORS.TILE_BACK_MAIN);
      grdBack.addColorStop(1, COLORS.TILE_BACK_DARK);
      
      p.fill(COLORS.TILE_BACK_MAIN); // Fallback
      ctx.fillStyle = grdBack;
      p.rect(0, 0, w, h, r);

      // 3. The White Face Layer
      const faceDepth = 3 * scale; 
      p.translate(0, -faceDepth);
      
      // Face Gradient (Subtle curve look)
      const grdFace = ctx.createLinearGradient(0, 0, w, h);
      grdFace.addColorStop(0, '#ffffff');
      grdFace.addColorStop(1, '#f0f0f0');
      
      ctx.fillStyle = grdFace;
      p.rect(0, 0, w, h, r);
      
      // 4. Glossy Highlight
      const grdGloss = ctx.createLinearGradient(0, 0, 0, h/2);
      grdGloss.addColorStop(0, 'rgba(255,255,255,0.6)');
      grdGloss.addColorStop(1, 'rgba(255,255,255,0.0)');
      ctx.fillStyle = grdGloss;
      p.rect(0, 0, w, h/2, r, r, 0, 0);

      // 5. Tile Content
      if (tile) {
          this.drawTileFace(p, tile, w, h, 0);
      }
  }

  // --- 2. Flat Tile (Table Discards / Melds) ---
  private static drawFlatTile(p: any, tile: Tile | null, w: number, h: number, scale: number) {
      const ctx = p.drawingContext;
      const r = 3 * scale;

      // 1. Shadow
      const thickness = 10 * scale;
      p.noStroke();
      p.fill(COLORS.TILE_SHADOW);
      p.rect(6*scale, 6*scale, w, h + thickness, r);

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
      p.rect(0, h - r, w, thickness, 0, 0, r, r);

      // 3. The White Face
      const grdFace = ctx.createLinearGradient(0, 0, 0, h);
      grdFace.addColorStop(0, '#ffffff');
      grdFace.addColorStop(1, '#e8e8e8');
      ctx.fillStyle = grdFace;
      p.rect(0, 0, w, h, r);

      // 5. Content
      if (tile) {
          this.drawTileFace(p, tile, w, h, 0);
      }
      
      // 6. Surface Shine
      p.noStroke();
      p.fill(255, 255, 255, 30);
      p.ellipse(w * 0.8, h * 0.2, w * 0.6, h * 0.3);
  }

  // --- 3. Back Standing (Opponent Top) ---
  private static drawBackStandingTile(p: any, w: number, h: number, scale: number) {
      const ctx = p.drawingContext;
      const r = 3 * scale;
      const depth = 4 * scale;

      // Shadow
      p.fill(COLORS.TILE_SHADOW);
      p.rect(depth, depth, w, h, r);

      // Main Green Back
      const grd = ctx.createLinearGradient(0, 0, w, h);
      grd.addColorStop(0, COLORS.TILE_BACK_LIGHT);
      grd.addColorStop(1, COLORS.TILE_BACK_DARK);
      ctx.fillStyle = grd;
      p.rect(0, 0, w, h, r);
      
      // Top Highlight (Curved top of standing tile)
      p.fill(255, 255, 255, 150);
      p.rect(0, 0, w, 4 * scale, r, r, 0, 0);
  }

  // --- 4. Side Standing (Opponent Left/Right) ---
  // Draws a realistic 2.5D vertical tile viewed from the side
  private static drawSideStandingTile(p: any, stepW: number, lenH: number, scale: number, isLeft: boolean) {
      const ctx = p.drawingContext;
      
      // In the rotated context:
      // 'dw' is the visual Height of the tile (Vertical axis on screen)
      // 'dh' is the visual Width/Thickness of the tile (Horizontal axis on screen)
      const dw = lenH; // The length of the tile (~64px)
      const dh = stepW; // The thickness of the tile (~32px)
      
      // 1. Shadow (Offset slightly to imply ground contact)
      p.noStroke();
      p.fill(COLORS.TILE_SHADOW);
      // Shadow is projected behind
      p.rect(4*scale, 4*scale, dw, dh, 3*scale);

      // 2. Material Split (Bone vs Bamboo)
      // Usually, standing tiles viewed from side show the seam.
      // We split the Thickness (dh) into Bone section (Face) and Bamboo section (Back).
      // Approx 35% Bone, 65% Bamboo.
      const boneRatio = 0.35;
      const boneSize = dh * boneRatio;
      const bambooSize = dh - boneSize;
      
      // --- Draw Main Body ---
      
      // A. Bone Section (Ivory White)
      // Gradient goes along the thickness to imply roundness
      const grdBone = ctx.createLinearGradient(0, 0, 0, boneSize);
      grdBone.addColorStop(0, '#ffffff');
      grdBone.addColorStop(0.8, COLORS.TILE_SECTION_BONE);
      grdBone.addColorStop(1, '#cbd5e1'); // Slight darkening at joint
      ctx.fillStyle = grdBone;
      p.rect(0, 0, dw, boneSize);
      
      // B. Bamboo Section (Jade Green)
      const grdBamboo = ctx.createLinearGradient(0, boneSize, 0, dh);
      grdBamboo.addColorStop(0, COLORS.TILE_SECTION_BAMBOO_LIGHT); // Highlight near joint
      grdBamboo.addColorStop(0.5, COLORS.TILE_SECTION_BAMBOO);
      grdBamboo.addColorStop(1, COLORS.TILE_BACK_DARK); // Shadow at back edge
      ctx.fillStyle = grdBamboo;
      p.rect(0, boneSize, dw, bambooSize);

      // C. Dovetail Joint (The zigzag connector)
      // Drawn vertically along the tile height
      p.stroke(COLORS.TILE_BACK_DARK);
      p.strokeWeight(1 * scale);
      p.noFill();
      p.beginShape();
      const zigSize = 5 * scale;
      for(let i = 0; i <= dw; i += zigSize) {
          // Draw zigzag centered on the seam (boneSize)
          p.vertex(i, boneSize);
          p.vertex(i + zigSize/2, boneSize + (1.5 * scale));
      }
      p.endShape();
      p.noStroke();

      // --- 3. Top Cap (The "Standing" Perspective) ---
      // This implies the 2.5D look. We see the "Top" of the tile.
      // Right Player (isLeft=false): +X is Screen Down. Top of Tile is Low X (0).
      // Left Player (isLeft=true): +X is Screen Up. Top of Tile is High X (dw).
      
      const capSize = 8 * scale; // Visual height of the cap
      
      // Determine location
      let capX = 0;
      let capH = capSize;
      
      if (isLeft) {
          // Left Player: Top is at dw (Screen Top).
          // We draw the cap at the very end of the bar.
          capX = dw - capSize;
          
          // Draw White Top Cap
          const grdCap = ctx.createLinearGradient(capX, 0, dw, 0);
          grdCap.addColorStop(0, '#e2e8f0');
          grdCap.addColorStop(0.4, '#ffffff');
          ctx.fillStyle = grdCap;
          
          // Draw a rounded rect at the top
          p.rect(capX, 0, capSize, dh, 2*scale);
          
          // Add a shiny highlight on the green part of the cap
          p.fill(255, 255, 255, 100);
          p.rect(capX, boneSize, capSize, bambooSize, 0, 2*scale, 2*scale, 0);

      } else {
          // Right Player: Top is at 0 (Screen Top).
          capX = 0;
          
          // Draw White Top Cap
          const grdCap = ctx.createLinearGradient(0, 0, capSize, 0);
          grdCap.addColorStop(0, '#ffffff');
          grdCap.addColorStop(1, '#e2e8f0');
          ctx.fillStyle = grdCap;
          
          // Draw a rounded rect at the start
          p.rect(0, 0, capSize, dh, 2*scale);
          
          // Shiny highlight
          p.fill(255, 255, 255, 100);
          p.rect(0, boneSize, capSize, bambooSize, 0, 0, 2*scale, 2*scale);
      }
      
      // --- 4. Side Glint ---
      // A subtle white line running down the green curvature to show material gloss
      p.fill(255, 255, 255, 30);
      // Highlight runs along length 'dw', positioned slightly into the green part
      p.rect(0, boneSize + (3*scale), dw, 2*scale);
  }
  
  // --- Content Drawing (Face) ---
  private static drawTileFace(p: any, tile: Tile, w: number, h: number, yOffset: number) {
      p.push();
      p.translate(w/2, h/2 + yOffset);
      
      const img = AssetLoader.getTileImage(tile);
      
      if (img && img.width > 1) {
          const padding = w * 0.15;
          // Engraving Shadow (Bottom-Right)
          p.tint(0, 0, 0, 40); 
          p.imageMode(p.CENTER);
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
      // ... Simple text fallback
  }
}
