
import { Tile } from '../types';
import { RenderContext, RenderMetrics } from './RenderTypes';
import { TileRenderService } from './TileRenderService';

export class PlayerRenderService {

  static drawPlayer(ctx: RenderContext, player: any, index: number, isActive: boolean): RenderMetrics {
     const { p, width, height, globalScale } = ctx;
     p.push();
     
     const s = globalScale;
     const BASE_TILE_W = 46;
     const BASE_TILE_H = 64;
     const BASE_BOTTOM_OFFSET = 90; 

     // Scaled Metrics
     const TILE_W = BASE_TILE_W * s;
     const TILE_H = BASE_TILE_H * s;
     const MELD_W = TILE_W * 0.85;
     const MELD_H = TILE_H * 0.85;
     const GAP_HAND_MELD = 30 * s;
     const GAP_NEW_TILE = 16 * s;
     const MELD_GAP = 8 * s;
     
     // Side tiles Thickness (Width on screen)
     // Increased slightly to allow the "Standing" look to be more visible
     const SIDE_TILE_THICKNESS = 26 * s; // Increased from 22
     
     const P0_MARGIN_RIGHT = 160 * s;
     const SIDE_MARGIN_BOTTOM = 150 * s; 
     const SIDE_MARGIN_TOP = 80 * s;
     const BOTTOM_Y = BASE_BOTTOM_OFFSET * s;

     const hand = player.hand || [];
     const handLen = hand.length;
     
     const visualHandCount = index === 0 ? handLen : (player.handCount || 0);
     const hasNew = visualHandCount % 3 === 2;
     
     const tileWidthInHand = (index === 1 || index === 3) ? SIDE_TILE_THICKNESS : TILE_W;
     const handSizePx = (visualHandCount * tileWidthInHand) + (hasNew ? GAP_NEW_TILE : 0);
     
     const melds = player.melds || [];
     const meldSizePx = melds.reduce((acc: number, m: any) => {
        return acc + ((m?.tiles?.length || 0) * MELD_W) + MELD_GAP;
     }, 0);
     
     const totalSize = handSizePx + (meldSizePx > 0 ? GAP_HAND_MELD + meldSizePx : 0);
     
     let p0StartX = 0;

     // Layout Logic
     if (index === 0) { 
         // Self (Bottom)
         p.translate(0, height - BOTTOM_Y);
         
         let startX = (width - totalSize) / 2;
         const endX = startX + totalSize;
         const limitX = width - P0_MARGIN_RIGHT;
         if (endX > limitX) startX = limitX - totalSize;
         if (startX < 20 * s) startX = 20 * s;

         this.drawHandSequence(ctx, hand, startX, 0, TILE_W, TILE_H, 1, 'STANDING', hasNew, 0, GAP_NEW_TILE);
         
         if (melds.length > 0) {
            const meldStartX = startX + handSizePx + GAP_HAND_MELD;
            this.drawMelds(ctx, melds, meldStartX, 20 * s, MELD_W, MELD_H, 1, MELD_GAP);
         }

         p0StartX = startX;

     } else if (index === 1) {
         // Right Player
         p.translate(width - (100 * s), 0); 
         p.rotate(p.HALF_PI); // Rotate 90 deg CW. X is Down, Y is Left.
         
         // Center vertically
         let startY = (height - totalSize) / 2;
         
         // Adjust to not hit bottom UI
         const endY = startY + totalSize;
         const limitY = height - SIDE_MARGIN_BOTTOM;
         if (endY > limitY) startY = limitY - totalSize;

         const dummyHand = Array(visualHandCount).fill(null);
         // Draw Tiles
         // Note: h (Length) is 64 (Screen Leftwards). w (Thickness) is 26 (Screen Down).
         this.drawHandSequence(ctx, dummyHand, startY, 0, SIDE_TILE_THICKNESS, TILE_H, 1, 'SIDE_STANDING_R', hasNew, 1, GAP_NEW_TILE);
         
         if (melds.length > 0) {
             const meldStartY = startY + handSizePx + GAP_HAND_MELD;
             this.drawMelds(ctx, melds, meldStartY, 10 * s, MELD_W, MELD_H, 1, MELD_GAP);
         }
         
     } else if (index === 2) {
         // Top Player
         p.translate(width, 80 * s); 
         p.rotate(p.PI);
         const startX = (width - totalSize) / 2;
         
         const dummyHand = Array(visualHandCount).fill(null);
         this.drawHandSequence(ctx, dummyHand, startX, 0, TILE_W, TILE_H, 1, 'BACK_STANDING', hasNew, 2, GAP_NEW_TILE);
         
         if (melds.length > 0) {
             const meldStartX = startX + handSizePx + GAP_HAND_MELD;
             this.drawMelds(ctx, melds, meldStartX, 10 * s, MELD_W, MELD_H, 1, MELD_GAP);
         }

     } else if (index === 3) {
         // Left Player
         // We need correct Z-Order: Bottom tiles should cover Top tiles (Closest covers Furthest).
         // With standard loop, we draw sequentially. 
         // If we draw Bottom -> Top, the Top covers Bottom (Wrong).
         // So we need to reverse the drawing order for the hand tiles.
         
         p.translate(100 * s, height); 
         p.rotate(-p.HALF_PI); // Rotate -90. X is Up. Y is Right.
         
         let startY = (height - totalSize) / 2;
         const endY = startY + totalSize;
         const limitY = height - SIDE_MARGIN_BOTTOM;
         if (endY > limitY) startY = limitY - totalSize;

         // To fix Z-index: Draw from Top(Furthest) to Bottom(Closest).
         // In rotated system (X Up), Top is High X. Bottom is Low X.
         // Standard loop increases X (Low -> High). 
         // So we need to start at High X and decrease.
         
         const dummyHand = Array(visualHandCount).fill(null);
         
         // Calc End Position (High X)
         const fullLen = (visualHandCount * SIDE_TILE_THICKNESS) + (hasNew ? GAP_NEW_TILE : 0);
         const endPos = startY + fullLen;
         
         // Custom Reverse Loop for Left Player Hand
         this.drawLeftHandReverse(ctx, dummyHand, endPos, 0, SIDE_TILE_THICKNESS, TILE_H, hasNew, GAP_NEW_TILE);
         
         // Melds are separate, usually below/above. 
         // For simplicity, draw Melds normally (they are usually 'flat' or separate group)
         if (melds.length > 0) {
             // Melds usually at the "far" end (Top of screen for Left player)
             // Current logic puts them after hand.
             const meldStartY = startY + fullLen + GAP_HAND_MELD;
             this.drawMelds(ctx, melds, meldStartY, 10 * s, MELD_W, MELD_H, 1, MELD_GAP);
         }
     }
     p.pop();

     return { p0HandStartX: p0StartX, p0TileW: TILE_W };
  }

  static drawDiscards(ctx: RenderContext, player: any, index: number) {
      const tiles = player.discards || [];
      if (tiles.length === 0) return;
      
      const { p, width, height, globalScale } = ctx;
      p.push();
      
      const w = 32 * globalScale; 
      const h = 42 * globalScale; 
      const cols = 6; 
      const RIVER_OFFSET = 100 * globalScale;

      p.translate(width/2, height/2);
      
      if (index === 0) p.translate(0, RIVER_OFFSET);
      if (index === 1) { p.translate(RIVER_OFFSET + (30*globalScale), 0); p.rotate(-p.HALF_PI); }
      if (index === 2) { p.translate(0, -RIVER_OFFSET); p.rotate(p.PI); }
      if (index === 3) { p.translate(-RIVER_OFFSET - (30*globalScale), 0); p.rotate(p.HALF_PI); }
      
      const startX = -(cols * w) / 2;
      
      tiles.forEach((tile: Tile, i: number) => {
          const r = Math.floor(i / cols);
          const c = i % cols;
          const overlapY = -6 * globalScale; 
          TileRenderService.drawTile(p, startX + c*w, r*(h + overlapY), tile, w, h, 'FLAT', globalScale);
      });
      p.pop();
  }

  private static drawHandSequence(
      ctx: RenderContext, hand: Tile[], startX: number, y: number, w: number, h: number, 
      dir: 1 | -1, type: string, 
      hasNewTile: boolean, playerIdx: number, newTileGap: number
  ) {
      const { p, globalScale, hoveredTileIndex } = ctx;
      const count = hand.length;
      const gapIndex = hasNewTile ? count - 1 : -1;
      
      let cx = startX;
      for (let i = 0; i < count; i++) {
          if (i === gapIndex) cx += (newTileGap * dir);
          const drawX = dir === 1 ? cx : cx - w;
          let renderY = y;
          
          if (playerIdx === 0 && i === hoveredTileIndex) {
              renderY -= (15 * globalScale);
          }
          
          // @ts-ignore
          TileRenderService.drawTile(p, drawX, renderY, hand[i], w, h, type, globalScale);
          cx += (w * dir);
      }
  }

  // Special Reverse Drawer for Left Player to fix Z-Order overlap
  private static drawLeftHandReverse(
    ctx: RenderContext, hand: Tile[], endX: number, y: number, w: number, h: number,
    hasNewTile: boolean, newTileGap: number
  ) {
      const { p, globalScale } = ctx;
      const count = hand.length;
      
      // Start from the Top (High X) and move Down (Low X)
      // We iterate backwards through the array so the first tile (index 0, Bottom of screen) 
      // is drawn LAST (on top).
      
      let cx = endX; // Top-most coordinate
      
      // Loop backwards: i = count-1 (Top tile) down to 0 (Bottom tile)
      // Wait, if we draw count-1 first, it is at the Top.
      // Then we draw count-2 below it.
      // The later drawing covers the earlier.
      // So Bottom covers Top. This is what we want!
      
      for (let i = count - 1; i >= 0; i--) {
          // If this is the new tile (last index), it has a gap before the rest
          if (hasNewTile && i === count - 1) {
              // cx is already at end.
              // The next tile should be at cx - w - gap.
          } else if (hasNewTile && i === count - 2) {
              cx -= newTileGap;
          }

          cx -= w; // Move down for current tile space (since we draw at cx)
          
          // @ts-ignore
          TileRenderService.drawTile(p, cx, y, hand[i], w, h, 'SIDE_STANDING_L', globalScale);
      }
  }

  private static drawMelds(
      ctx: RenderContext, melds: any[], startX: number, y: number, w: number, h: number, 
      dir: 1 | -1, gap: number
  ) {
      const { p, globalScale } = ctx;
      let cx = startX;
      melds.forEach(meld => {
         const count = meld?.tiles?.length || 0;
         for(let i=0; i<count; i++) {
             const drawX = dir === 1 ? cx : cx - w;
             // @ts-ignore
             TileRenderService.drawTile(p, drawX, y, meld.tiles[i], w, h, 'FLAT', globalScale); 
             cx += (w * dir);
         }
         cx += (gap * dir);
      });
  }
}
