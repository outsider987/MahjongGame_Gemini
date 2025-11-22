
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
     
     const SIDE_TILE_THICKNESS = 32 * s; 
     
     const P0_MARGIN_RIGHT = 160 * s;
     const SIDE_MARGIN_BOTTOM = 150 * s; 
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

         this.drawHandSequence(ctx, hand, startX, 0, TILE_W, TILE_H, 1, 'STANDING', hasNew, 0, GAP_NEW_TILE, isActive);
         
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
         this.drawHandSequence(ctx, dummyHand, startY, 0, SIDE_TILE_THICKNESS, TILE_H, 1, 'SIDE_STANDING_R', hasNew, 1, GAP_NEW_TILE, isActive);
         
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
         this.drawHandSequence(ctx, dummyHand, startX, 0, TILE_W, TILE_H, 1, 'BACK_STANDING', hasNew, 2, GAP_NEW_TILE, isActive);
         
         if (melds.length > 0) {
             const meldStartX = startX + handSizePx + GAP_HAND_MELD;
             this.drawMelds(ctx, melds, meldStartX, 10 * s, MELD_W, MELD_H, 1, MELD_GAP);
         }

     } else if (index === 3) {
         // Left Player
         p.translate(100 * s, height); 
         p.rotate(-p.HALF_PI); // Rotate -90. X is Up. Y is Right.
         
         let startY = (height - totalSize) / 2;
         const endY = startY + totalSize;
         const limitY = height - SIDE_MARGIN_BOTTOM;
         if (endY > limitY) startY = limitY - totalSize;

         const dummyHand = Array(visualHandCount).fill(null);
         
         const fullLen = (visualHandCount * SIDE_TILE_THICKNESS) + (hasNew ? GAP_NEW_TILE : 0);
         const endPos = startY + fullLen;
         
         // Custom Reverse Loop for Left Player Hand
         this.drawLeftHandReverse(ctx, dummyHand, endPos, 0, SIDE_TILE_THICKNESS, TILE_H, hasNew, GAP_NEW_TILE, isActive);
         
         if (melds.length > 0) {
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
      
      const { p, width, height, globalScale, animation } = ctx;
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
      
      const isDiscardingPlayer = (index === animation.discardingPlayer);

      tiles.forEach((tile: Tile, i: number) => {
          const r = Math.floor(i / cols);
          const c = i % cols;
          const overlapY = -6 * globalScale; 
          
          p.push();
          p.translate(startX + c*w, r*(h + overlapY));
          
          // DISCARD ANIMATION (Toss & Settle)
          const isLastDiscard = (i === tiles.length - 1);
          if (isLastDiscard && isDiscardingPlayer) {
               const dur = 350; // ms
               const elapsed = Date.now() - animation.lastDiscardTime;
               
               if (elapsed < dur) {
                   const t = elapsed / dur;
                   // Scale: Large to Normal (1.5 -> 1.0)
                   const scaleFactor = 1.5 - (0.5 * t);
                   // Rotate: Spin slightly into place (0.2rad -> 0)
                   const rot = 0.2 * (1 - t);
                   // Offset: Drop from height (-20 -> 0)
                   const dropY = -20 * globalScale * (1 - t);
                   
                   p.translate(0, dropY);
                   p.scale(scaleFactor);
                   p.rotate(rot);
               }
          }

          // @ts-ignore
          TileRenderService.drawTile(p, 0, 0, tile, w, h, 'FLAT', globalScale);
          p.pop();
      });
      p.pop();
  }

  private static drawHandSequence(
      ctx: RenderContext, hand: Tile[], startX: number, y: number, w: number, h: number, 
      dir: 1 | -1, type: string, 
      hasNewTile: boolean, playerIdx: number, newTileGap: number, isActive: boolean
  ) {
      const { p, globalScale, hoveredTileIndex, animation } = ctx;
      const count = hand.length;
      const gapIndex = hasNewTile ? count - 1 : -1;
      
      let cx = startX;
      for (let i = 0; i < count; i++) {
          if (i === gapIndex) cx += (newTileGap * dir);
          const drawX = dir === 1 ? cx : cx - w;
          let renderY = y;
          
          p.push();
          p.translate(drawX, renderY);

          // DRAW ANIMATION (Flip Up)
          // Only animate the last tile if it is "new" and the player is active
          const isLastTile = (i === count - 1);
          if (hasNewTile && isLastTile && isActive) {
              const dur = 400; // ms
              const elapsed = Date.now() - animation.lastTurnTime;
              
              if (elapsed < dur) {
                  const t = elapsed / dur; 
                  // Ease Out Quad
                  const ease = 1 - (1 - t) * (1 - t);
                  
                  // Translate: Rise up from bottom
                  const dropY = 30 * globalScale * (1 - ease);
                  
                  // Scale Y: Flip Open (0.1 -> 1.0)
                  const scaleY = 0.1 + (0.9 * ease);
                  
                  p.translate(0, dropY);
                  // Simulate 3D Flip around X axis by scaling Y
                  p.scale(1, scaleY);
              }
          }

          if (playerIdx === 0 && i === hoveredTileIndex) {
              p.translate(0, -15 * globalScale);
          }
          
          // @ts-ignore
          TileRenderService.drawTile(p, 0, 0, hand[i], w, h, type, globalScale);
          p.pop();

          cx += (w * dir);
      }
  }

  private static drawLeftHandReverse(
    ctx: RenderContext, hand: Tile[], endX: number, y: number, w: number, h: number,
    hasNewTile: boolean, newTileGap: number, isActive: boolean
  ) {
      const { p, globalScale, animation } = ctx;
      const count = hand.length;
      
      let cx = endX; 
      
      for (let i = count - 1; i >= 0; i--) {
          if (hasNewTile && i === count - 1) {
              // no gap for first (last in array)
          } else if (hasNewTile && i === count - 2) {
              cx -= newTileGap;
          }

          cx -= w; 
          
          p.push();
          p.translate(cx, y);

          // DRAW ANIMATION (Flip Up)
          const isLastTile = (i === count - 1);
          if (hasNewTile && isLastTile && isActive) {
              const dur = 400; 
              const elapsed = Date.now() - animation.lastTurnTime;
              if (elapsed < dur) {
                  const t = elapsed / dur; 
                  const ease = 1 - (1 - t) * (1 - t);
                  // For Left player, Y is horizontal in screen space due to rotation in parent
                  // But here we are in local space where Y is perpendicular to tile line.
                  // "Drop" means moving away from the center? Or simple scale.
                  
                  const scaleY = 0.1 + (0.9 * ease);
                  p.scale(1, scaleY);
              }
          }

          // @ts-ignore
          TileRenderService.drawTile(p, 0, 0, hand[i], w, h, 'SIDE_STANDING_L', globalScale);
          p.pop();
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
