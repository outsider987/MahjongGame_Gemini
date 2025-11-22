

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

  // =========================================
  // MATERIAL HELPERS (SOLID - SRP: Encapsulate Material Logic)
  // =========================================

  private static drawJadeMaterial(p: any, w: number, h: number, r: number, ctx: any) {
      // Deep, rich green with subsurface scattering fake
      const grd = ctx.createLinearGradient(0, 0, w, h);
      grd.addColorStop(0, COLORS.TILE_JADE_DEEP);
      grd.addColorStop(0.4, COLORS.TILE_JADE_MAIN);
      grd.addColorStop(1, COLORS.TILE_JADE_LIGHT);
      ctx.fillStyle = grd;
      p.noStroke();
      p.rect(0, 0, w, h, r);

      // Subtle internal glow
      const glow = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w);
      glow.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      p.rect(0, 0, w, h, r);
  }

  private static drawBoneMaterial(p: any, w: number, h: number, r: number, ctx: any) {
      // Base Cream Color
      const grd = ctx.createLinearGradient(0, 0, w, 0);
      grd.addColorStop(0, COLORS.TILE_BONE_SHADOW);
      grd.addColorStop(0.1, COLORS.TILE_BONE_WARM);
      grd.addColorStop(0.9, COLORS.TILE_BONE_WARM);
      grd.addColorStop(1, COLORS.TILE_BONE_SHADOW);
      ctx.fillStyle = grd;
      p.noStroke();
      p.rect(0, 0, w, h, r);

      // Apply procedural noise texture
      const tex = AssetLoader.getBoneTexture();
      if (tex) {
         p.push();
         p.blendMode(p.MULTIPLY);
         p.image(tex, 0, 0, w, h);
         p.pop();
      }
  }

  private static drawEdgeHighlight(p: any, w: number, h: number, r: number, ctx: any) {
      // Top Specular Highlight
      const grdHigh = ctx.createLinearGradient(0, 0, 0, h * 0.2);
      grdHigh.addColorStop(0, COLORS.HIGHLIGHT_SPECULAR);
      grdHigh.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grdHigh;
      p.rect(0, 0, w, h * 0.2, r, r, 0, 0);

      // Corner Shine
      p.noFill();
      p.stroke(255, 255, 255, 80);
      p.strokeWeight(1);
      p.rect(1, 1, w-2, h-2, r);
  }

  private static drawTileContent(p: any, tile: Tile, w: number, h: number, scale: number) {
      const img = AssetLoader.getTileImage(tile);
      if (!img) return;

      const pX = w * 0.1;
      const pY = h * 0.1;
      const dW = w - pX*2;
      const dH = h - pY*2;
      
      // Engraving / Deboss Effect
      // 1. Inner Shadow (Offset dark)
      p.push();
      p.translate(w/2, h/2);
      p.imageMode(p.CENTER);
      
      p.tint(0, 0, 0, 100);
      p.image(img, 2*scale, 2*scale, dW, dH);
      p.noTint();
      
      // 2. Main Ink
      p.image(img, 0, 0, dW, dH);
      
      // 3. Ink Shine (Subtle overlay)
      p.blendMode(p.OVERLAY);
      p.tint(255, 255, 255, 50);
      p.image(img, 0, 0, dW, dH);
      
      p.pop();
  }

  // =========================================
  // RENDER STATES
  // =========================================

  // --- 1. Standing Tile (Player Hand) ---
  // High detail, Front View
  private static drawStandingTile(p: any, tile: Tile | null, w: number, h: number, scale: number) {
      const ctx = p.drawingContext;
      const r = 5 * scale; 
      
      // 1. Drop Shadow
      ctx.shadowColor = COLORS.SHADOW_DROP;
      ctx.shadowBlur = 15 * scale;
      ctx.shadowOffsetY = 10 * scale;
      p.fill(0);
      p.rect(w*0.1, h*0.8, w*0.8, h*0.1, r); // Fake rect for shadow source
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // 2. Backing (Visible slightly at edges/bottom due to curve)
      p.fill(COLORS.TILE_JADE_DEEP);
      p.rect(0, 0, w, h, r);

      // 3. Bone Face
      // Slight margin for backing visibility
      const m = 0; 
      p.push();
      p.translate(m, m);
      this.drawBoneMaterial(p, w - m*2, h - m*2, r, ctx);
      
      // 4. Content
      if (tile) {
          this.drawTileContent(p, tile, w, h, scale);
      }

      // 5. Highlights
      this.drawEdgeHighlight(p, w, h, r, ctx);
      p.pop();
  }

  // --- 2. Flat Tile (Discards) ---
  // Perspective View: Shows Back thickness + Face
  private static drawFlatTile(p: any, tile: Tile | null, w: number, h: number, scale: number) {
      const ctx = p.drawingContext;
      const r = 3 * scale;
      const depth = 12 * scale; // Thickness of the tile on the table

      // 1. Contact Shadow
      p.noStroke();
      p.fill(COLORS.SHADOW_AMBIENT);
      p.beginShape();
      p.vertex(0, h);
      p.vertex(w, h);
      p.vertex(w + depth*0.5, h + depth);
      p.vertex(-depth*0.5, h + depth);
      p.endShape(p.CLOSE);

      // 2. Jade Backing (The Side/Bottom visible)
      const grdSide = ctx.createLinearGradient(0, h, 0, h+depth);
      grdSide.addColorStop(0, COLORS.TILE_JADE_MAIN);
      grdSide.addColorStop(1, COLORS.TILE_JADE_DEEP);
      ctx.fillStyle = grdSide;
      
      p.beginShape();
      p.vertex(0, h - r); // Start high to tuck under face
      p.vertex(w, h - r);
      p.vertex(w, h + depth - r);
      p.vertex(0, h + depth - r);
      p.endShape(p.CLOSE);
      p.rect(0, h+depth-r*2, w, r*2, 0, 0, r, r); // Rounded bottom caps

      // 3. Bone Face
      this.drawBoneMaterial(p, w, h, r, ctx);

      // 4. Content
      if (tile) {
          this.drawTileContent(p, tile, w, h, scale);
      }

      // 5. Gloss Overlay (Reflection of ceiling light)
      ctx.save();
      p.clip(() => p.rect(0, 0, w, h, r));
      const grdGloss = ctx.createLinearGradient(0, 0, w, h);
      grdGloss.addColorStop(0.4, 'rgba(255,255,255,0)');
      grdGloss.addColorStop(0.5, 'rgba(255,255,255,0.2)');
      grdGloss.addColorStop(0.6, 'rgba(255,255,255,0)');
      ctx.fillStyle = grdGloss;
      p.rect(0, 0, w, h);
      ctx.restore();
  }

  // --- 3. Back Standing (Opponent Top) ---
  // Shows Jade Back
  private static drawBackStandingTile(p: any, w: number, h: number, scale: number) {
      const ctx = p.drawingContext;
      const r = 4 * scale;

      // Shadow
      ctx.shadowColor = COLORS.SHADOW_AMBIENT;
      ctx.shadowBlur = 10 * scale;
      ctx.shadowOffsetY = 5 * scale;
      
      this.drawJadeMaterial(p, w, h, r, ctx);
      
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

      // Highlight top edge
      p.fill(255, 255, 255, 50);
      p.rect(0, 0, w, 2*scale, r, r, 0, 0);
  }

  // --- 4. Side Standing (Opponents L/R) ---
  // Shows split material: Bone Front + Jade Back with Dovetail Joint
  private static drawSideStandingTile(p: any, stepW: number, lenH: number, scale: number, isLeft: boolean) {
      const ctx = p.drawingContext;
      const r = 3 * scale;
      
      const w = lenH; // Visual width in this rotation
      const h = stepW; // Visual height/thickness in this rotation

      // Shadow
      p.fill(COLORS.SHADOW_AMBIENT);
      p.rect(4*scale, 4*scale, w, h, r);

      // Split Ratios
      const boneH = h * 0.35;
      const jadeH = h * 0.65;

      // A. Bone Section
      const grdBone = ctx.createLinearGradient(0, 0, w, 0);
      grdBone.addColorStop(0, COLORS.TILE_BONE_SHADOW);
      grdBone.addColorStop(0.5, COLORS.TILE_BONE_WARM);
      grdBone.addColorStop(1, COLORS.TILE_BONE_SHADOW);
      ctx.fillStyle = grdBone;
      p.noStroke();
      p.rect(0, 0, w, boneH, r, r, 0, 0);

      // B. Jade Section
      p.push();
      p.translate(0, boneH);
      this.drawJadeMaterial(p, w, jadeH, 0, ctx);
      // Round bottom corners of jade
      p.rect(0, jadeH - r, w, r, 0, 0, r, r);
      p.pop();

      // C. Dovetail Joint (Zig Zag)
      p.stroke(COLORS.TILE_JADE_DEEP);
      p.strokeWeight(0.5 * scale);
      p.noFill();
      p.beginShape();
      const zig = 5 * scale;
      for(let x = 0; x <= w; x += zig) {
          p.vertex(x, boneH);
          p.vertex(x + zig/2, boneH + 2*scale);
          p.vertex(x + zig, boneH);
      }
      p.endShape();
      
      // D. Top Cap (Perspective)
      const capW = 6 * scale;
      const capX = isLeft ? w - capW : 0;
      
      // Cap Bone
      p.fill('#e2e8f0');
      p.noStroke();
      p.rect(capX, 0, capW, boneH);
      // Cap Jade
      p.fill(COLORS.TILE_JADE_DEEP);
      p.rect(capX, boneH, capW, jadeH, 0, 0, r, r);
      
      // Cap Highlight
      p.fill(255, 255, 255, 100);
      p.rect(capX, 0, 1*scale, h);
  }
}
