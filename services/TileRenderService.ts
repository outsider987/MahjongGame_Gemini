
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
  // "Standing" look with White Top Cap and Split Bottom Section
  private static drawSideStandingTile(p: any, w: number, h: number, scale: number, isLeft: boolean) {
      const ctx = p.drawingContext;
      const r = 3 * scale;
      
      // Coords in Rotated Space:
      // w = Thickness of tile (Vertical stack axis)
      // h = Length of tile (Horizontal towards center)
      
      // Shadow
      p.noStroke();
      p.fill(COLORS.TILE_SHADOW);
      p.rect(3*scale, 3*scale, w, h, r);

      // 1. Main Body: Green Jade Back
      // Create a cylindrical gradient along the horizontal length
      const grdBody = ctx.createLinearGradient(0, 0, 0, h); 
      // Wait, Gradient should be vertical (along W) to show roundness of the back?
      // Actually, Jade tiles are usually rounded on the Back face.
      // So gradient from x=0 to x=w.
      const grdJade = ctx.createLinearGradient(0, 0, w, 0);
      grdJade.addColorStop(0, COLORS.TILE_BACK_DARK);
      grdJade.addColorStop(0.5, COLORS.TILE_BACK_MAIN);
      grdJade.addColorStop(1, COLORS.TILE_BACK_DARK);
      
      ctx.fillStyle = grdJade;
      p.rect(0, 0, w, h, r);
      
      // 2. Gloss Highlight (Center of the back)
      p.fill(255, 255, 255, 30);
      p.rect(w * 0.3, 0, w * 0.4, h, 2*scale);

      // 3. Caps (Top and Bottom)
      // "Top Head" is White.
      // "Bottom (Player Side)" is Split.
      
      const capSize = 5 * scale; // Height of the cap visually

      if (isLeft) {
          // LEFT PLAYER (Rotated -90)
          // X points UP. Y points RIGHT.
          // Stack grows Up. 
          // x=0 is Bottom (Near Player). x=w is Top (Away).
          
          // TOP CAP (x=w): White Head
          this.drawCap(p, w - capSize, 0, capSize, h, scale, 'WHITE', r, true);

          // BOTTOM SECTION (x=0): Split View
          this.drawSplitSection(p, 0, 0, capSize, h, scale);

      } else {
          // RIGHT PLAYER (Rotated 90)
          // X points DOWN. Y points LEFT.
          // Stack grows Down.
          // x=0 is Top (Away). x=w is Bottom (Near Player).
          
          // TOP CAP (x=0): White Head
          this.drawCap(p, 0, 0, capSize, h, scale, 'WHITE', r, false);

          // BOTTOM SECTION (x=w): Split View
          this.drawSplitSection(p, w - capSize, 0, capSize, h, scale);
      }
  }

  private static drawCap(p: any, x: number, y: number, w: number, h: number, scale: number, type: 'WHITE'|'SPLIT', r: number, isBottomEdge: boolean) {
      const ctx = p.drawingContext;
      if (type === 'WHITE') {
          const grd = ctx.createLinearGradient(x, 0, x+w, 0);
          grd.addColorStop(0, '#e2e8f0');
          grd.addColorStop(0.5, '#ffffff');
          grd.addColorStop(1, '#e2e8f0');
          ctx.fillStyle = grd;
          
          // Rounding only the outer edge
          if (isBottomEdge) {
             // Bottom of render rect (which is Top of stack for Left Player)
             p.rect(x, y, w, h, 0, r, r, 0); 
          } else {
             // Top of render rect
             p.rect(x, y, w, h, r, 0, 0, r);
          }
      }
  }

  private static drawSplitSection(p: any, x: number, y: number, w: number, h: number, scale: number) {
      // Draws the cross-section of the tile (Bone + Bamboo)
      // This represents the "Side closer to player"
      
      const ctx = p.drawingContext;
      
      // 1. Bamboo Layer (Dark Green) - The Back
      // Usually Back is ~30-40% of thickness?
      // Let's assume the Green Back is on the "Outside" of the wall?
      // For Right Player: Back is visible (Left). Face is Right.
      // So Green is at y=0? No.
      // In rotated coords:
      // Right Player: Y points Left (Center). Back faces Center.
      // So Back is at Y=0? Or Y=h?
      // We draw the Back Rect at (0,0). 
      // So the SURFACE is Back. 
      // The Cross Section must match the surface.
      // So the Green part of the split is the "Top" surface of the cross-section block?
      // No, cross section is vertical cut.
      // Green Back is usually convex.
      
      // Let's simplify:
      // Split Line runs horizontally through the section? No, vertically relative to tile face.
      // Tile Face is "Side" of the wall.
      // So split is vertical.
      
      const splitY = h * 0.55; // Position of the dovetail join
      
      p.push();
      // Clip to the cap area
      p.clip(() => {
          p.rect(x, y, w, h);
      });

      // Bamboo (Green) Part - Assuming it matches the Back
      // Back is the visible face.
      // So this section should look like the end of that green block.
      p.fill(COLORS.TILE_SECTION_BAMBOO);
      p.rect(x, y, w, h); // Fill all first
      
      // Bone (White) Part
      // Face is hidden. The White part is "behind" or "below" the green back.
      // In this 2.5D representation, let's put the white part at the "Back" of the Z-depth?
      // Or if viewing from Center:
      // We see Green Back.
      // We see the end of the Green Back.
      // We see the White Face Layer behind it.
      p.fill(COLORS.TILE_SECTION_BONE);
      
      // Draw White part. 
      // If Back is Center-Facing (Y+ for Left, Y+ for Right... wait)
      // Right Player: Y points Left (Center). Back faces Center.
      // So Green is at Y=High (Close to center)? No.
      // Let's just draw a split: Top 60% Green, Bottom 40% White.
      p.rect(x, splitY, w, h - splitY);
      
      // Dovetail Joint (Zig Zag Line)
      p.stroke(COLORS.TILE_BACK_DARK);
      p.strokeWeight(1);
      p.noFill();
      p.beginShape();
      const zigzagW = 4 * scale;
      for(let i = x; i <= x + w; i += zigzagW) {
          p.vertex(i, splitY);
          p.vertex(i + zigzagW/2, splitY + (2*scale));
      }
      p.endShape();

      // Add Shadow to make the section look "cut"
      const grdShadow = ctx.createLinearGradient(x, 0, x+w, 0);
      grdShadow.addColorStop(0, 'rgba(0,0,0,0.2)');
      grdShadow.addColorStop(1, 'rgba(0,0,0,0.0)');
      ctx.fillStyle = grdShadow;
      p.rect(x, y, w, h);

      p.pop();
      
      // Highlight Edge
      p.stroke(255, 255, 255, 50);
      p.line(x, y, x + w, y);
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
