

import { Tile } from '../types';
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

     // Global style for rounded feel
     p.strokeJoin(p.ROUND);

     switch (type) {
         case 'STANDING': // Player's hand (Front Facing, thick volume)
             this.drawStandingTile(p, tile, w, h, scale);
             break;
         case 'FLAT': // Discards (Top-down perspective view)
             this.drawFlatTile(p, tile, w, h, scale);
             break;
         case 'BACK_STANDING': // Opponent Top (Back Facing)
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

  // =========================================
  // MATERIAL HELPERS
  // =========================================

  private static drawJadeMaterial(p: any, w: number, h: number, r: number, ctx: any) {
      // Vivid Emerald Gradient
      const grd = ctx.createLinearGradient(0, 0, w, h);
      grd.addColorStop(0, COLORS.TILE_JADE_MAIN);
      grd.addColorStop(1, COLORS.TILE_JADE_DEEP);
      ctx.fillStyle = grd;
      p.noStroke();
      p.rect(0, 0, w, h, r);

      // Subsurface Scattering / Inner Glow
      const glow = ctx.createRadialGradient(w/2, h/3, 0, w/2, h/2, w);
      glow.addColorStop(0, COLORS.TILE_JADE_LIGHT); // Bright center
      glow.addColorStop(0.6, 'rgba(5, 150, 105, 0.2)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      p.rect(0, 0, w, h, r);
  }

  private static drawBoneMaterial(p: any, w: number, h: number, r: number, ctx: any) {
      // 1. Smooth Porcelain Gradient
      const grd = ctx.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, '#ffffff'); // Top hit by light
      grd.addColorStop(0.1, COLORS.TILE_BONE_WARM); 
      grd.addColorStop(0.9, COLORS.TILE_BONE_WARM);
      grd.addColorStop(1, '#dcdcdc'); // Bottom slight shadow
      
      ctx.fillStyle = grd;
      p.noStroke();
      p.rect(0, 0, w, h, r);

      // 2. Subtle noise for realism (if loaded)
      const tex = AssetLoader.getBoneTexture();
      if (tex) {
         p.push();
         p.blendMode(p.MULTIPLY);
         p.tint(255, 120); // Very faint
         p.image(tex, 0, 0, w, h);
         p.noTint();
         p.pop();
      }
  }

  private static drawGlossyHighlight(p: any, w: number, h: number, r: number, ctx: any) {
      // Studio Light Reflection (Curved Horizon)
      ctx.save();
      p.clip(() => p.rect(0, 0, w, h, r));
      
      // Top glossy curve
      p.noStroke();
      const glossGrad = ctx.createLinearGradient(0, 0, 0, h * 0.4);
      glossGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      glossGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
      
      ctx.fillStyle = glossGrad;
      p.beginShape();
      p.vertex(0, 0);
      p.vertex(w, 0);
      p.vertex(w, h * 0.2);
      // Curve down in middle
      p.bezierVertex(w * 0.6, h * 0.35, w * 0.4, h * 0.35, 0, h * 0.2);
      p.endShape(p.CLOSE);

      ctx.restore();
      
      // Edge Rim Light (Top & Left)
      p.noFill();
      p.stroke(255, 255, 255, 150);
      p.strokeWeight(1);
      p.beginShape();
      p.vertex(w-r, 0);
      p.vertex(r, 0);
      p.bezierVertex(0, 0, 0, 0, 0, r);
      p.vertex(0, h-r);
      p.endShape();
  }

  private static drawTileContent(p: any, tile: Tile, w: number, h: number, scale: number) {
      const img = AssetLoader.getTileImage(tile);
      if (!img) return;

      const pX = w * 0.08; // Tighter padding
      const pY = h * 0.08;
      const dW = w - pX*2;
      const dH = h - pY*2;
      
      p.push();
      p.translate(w/2, h/2);
      p.imageMode(p.CENTER);
      
      // Engraving Depth (Inner Shadow)
      p.tint(0, 0, 0, 80);
      p.image(img, 1.5*scale, 1.5*scale, dW, dH);
      p.noTint();
      
      // Main Ink
      p.image(img, 0, 0, dW, dH);
      
      // Ink Specular (Wet Ink Look)
      p.blendMode(p.OVERLAY);
      p.tint(255, 255, 255, 70);
      p.image(img, -0.5*scale, -0.5*scale, dW, dH);
      
      p.pop();
  }

  // =========================================
  // RENDER STATES
  // =========================================

  // --- 1. Standing Tile (Player Hand) ---
  // Big, chunky, front-facing with volume hint at bottom
  private static drawStandingTile(p: any, tile: Tile | null, w: number, h: number, scale: number) {
      const ctx = p.drawingContext;
      const r = 8 * scale; // Larger radius for smooth feel
      
      // 1. Drop Shadow (Soft & Grounded)
      ctx.shadowColor = COLORS.SHADOW_DROP;
      ctx.shadowBlur = 20 * scale;
      ctx.shadowOffsetY = 12 * scale;
      // Invisible rect to cast shadow
      p.fill(0,0,0,0);
      p.rect(5, 5, w-10, h-10, r);
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // 2. Backing (Visible at bottom edge slightly due to perspective)
      // Simulate tilting slightly back
      p.fill(COLORS.TILE_JADE_DEEP);
      p.rect(0, 2*scale, w, h, r);

      // 3. Bone Face
      this.drawBoneMaterial(p, w, h, r, ctx);
      
      // 4. Content
      if (tile) {
          this.drawTileContent(p, tile, w, h, scale);
      }

      // 5. Gloss & Highlights
      this.drawGlossyHighlight(p, w, h, r, ctx);
  }

  // --- 2. Flat Tile (Discards) ---
  // Perspective view showing thickness (Jade) and Face (Bone)
  private static drawFlatTile(p: any, tile: Tile | null, w: number, h: number, scale: number) {
      const ctx = p.drawingContext;
      const r = 4 * scale;
      const depth = 14 * scale; // Thickness

      // 1. Shadow
      p.fill(COLORS.SHADOW_AMBIENT);
      p.noStroke();
      // Cast shadow based on depth
      p.beginShape();
      p.vertex(r, h + depth/2);
      p.vertex(w - r, h + depth/2);
      p.vertex(w + depth, h + depth + 5*scale);
      p.vertex(-5*scale, h + depth + 5*scale);
      p.endShape(p.CLOSE);

      // 2. Jade Body (Thickness)
      // We draw a rounded rect extruded downwards
      const jadeGrad = ctx.createLinearGradient(0, h, 0, h+depth);
      jadeGrad.addColorStop(0, COLORS.TILE_JADE_MAIN);
      jadeGrad.addColorStop(1, COLORS.TILE_JADE_DEEP);
      ctx.fillStyle = jadeGrad;
      
      p.beginShape();
      p.vertex(0, r);
      p.vertex(w, r); // Top is hidden by face anyway
      p.vertex(w, h + depth - r);
      p.quadraticVertex(w, h + depth, w - r, h + depth);
      p.vertex(r, h + depth);
      p.quadraticVertex(0, h + depth, 0, h + depth - r);
      p.endShape(p.CLOSE);

      // 3. Bone Face (Top)
      this.drawBoneMaterial(p, w, h, r, ctx);

      // 4. Content
      if (tile) {
          this.drawTileContent(p, tile, w, h, scale);
      }
      
      // 5. Full Surface Gloss (Reflection of ceiling)
      ctx.save();
      p.clip(() => p.rect(0, 0, w, h, r));
      const sheen = ctx.createLinearGradient(0, 0, w, h);
      sheen.addColorStop(0, 'rgba(255,255,255,0.4)');
      sheen.addColorStop(0.5, 'rgba(255,255,255,0)');
      sheen.addColorStop(1, 'rgba(255,255,255,0.1)');
      ctx.fillStyle = sheen;
      p.rect(0,0,w,h);
      ctx.restore();
  }

  // --- 3. Back Standing (Opponent Top) ---
  private static drawBackStandingTile(p: any, w: number, h: number, scale: number) {
      const ctx = p.drawingContext;
      const r = 6 * scale;

      // Shadow
      ctx.shadowColor = COLORS.SHADOW_AMBIENT;
      ctx.shadowBlur = 10 * scale;
      ctx.shadowOffsetY = 5 * scale;
      
      this.drawJadeMaterial(p, w, h, r, ctx);
      ctx.shadowBlur = 0; 
      ctx.shadowOffsetY = 0;

      // Top Highlight (Rim)
      p.noStroke();
      p.fill(255, 255, 255, 60);
      p.rect(0, 0, w, 4*scale, r, r, 0, 0);
  }

  // --- 4. Side Standing (Opponents L/R) ---
  // Renders the Dovetail joint look (Side View)
  private static drawSideStandingTile(p: any, stepW: number, lenH: number, scale: number, isLeft: boolean) {
      const ctx = p.drawingContext;
      const r = 4 * scale;
      
      const w = lenH; // Visual width
      const h = stepW; // Visual height/thickness

      // Shadow
      p.fill(COLORS.SHADOW_AMBIENT);
      p.noStroke();
      p.rect(3*scale, 3*scale, w, h, r);

      // Split Ratios
      const boneH = h * 0.35;
      const jadeH = h * 0.65;

      // A. Bone Section (Top)
      const grdBone = ctx.createLinearGradient(0, 0, 0, boneH);
      grdBone.addColorStop(0, '#ffffff');
      grdBone.addColorStop(1, COLORS.TILE_BONE_SHADOW);
      ctx.fillStyle = grdBone;
      p.rect(0, 0, w, boneH, r, r, 0, 0);

      // B. Jade Section (Bottom)
      p.push();
      p.translate(0, boneH);
      
      const grdJade = ctx.createLinearGradient(0, 0, 0, jadeH);
      grdJade.addColorStop(0, COLORS.TILE_JADE_MAIN);
      grdJade.addColorStop(1, COLORS.TILE_JADE_DEEP);
      ctx.fillStyle = grdJade;
      
      p.rect(0, 0, w, jadeH, 0, 0, r, r);
      p.pop();

      // C. Dovetail Joint (The zig zag line)
      p.stroke(COLORS.TILE_JADE_DEEP);
      p.strokeWeight(1 * scale);
      p.strokeJoin(p.ROUND);
      p.noFill();
      
      p.beginShape();
      const zigW = 6 * scale;
      const zigH = 2 * scale;
      for(let x = -zigW; x <= w + zigW; x += zigW) {
          p.vertex(x, boneH);
          p.vertex(x + zigW/2, boneH + zigH);
          p.vertex(x + zigW, boneH);
      }
      p.endShape();

      // D. Perspective Cap (End of the tile row)
      // Only draw if it's the end visible to player
      const capW = 8 * scale;
      const capX = isLeft ? w - capW : 0;
      
      // Draw a "Cap" to simulate the face/back of the tile seen from side
      // Simplified for side view: Just a darker shade of the materials
      
      p.noStroke();
      // Bone Cap
      p.fill(220);
      p.rect(capX, 0, capW, boneH, isLeft?0:r, isLeft?r:0, 0, 0);
      // Jade Cap
      p.fill(COLORS.TILE_JADE_DEEP);
      p.rect(capX, boneH, capW, jadeH, 0, 0, isLeft?r:0, isLeft?0:r);
      
      // Reflection on Cap
      p.fill(255, 255, 255, 50);
      p.rect(capX, 0, 2*scale, h);
  }
}
