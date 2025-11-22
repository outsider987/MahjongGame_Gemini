
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
     
     // Increased Bottom Offset to avoid overlapping with mobile home bars / browser UI
     const BASE_BOTTOM_OFFSET = 120; 

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
     
     const melds = player.melds || [];
     const meldSizePx = melds.reduce((acc: number, m: any) => {
        return acc + ((m?.tiles?.length || 0) * MELD_W) + MELD_GAP;
     }, 0);
     
     // Default metrics (updated for P0)
     let p0StartX = 0;
     let p0EffectiveTileW = TILE_W;

     // Layout Logic
     if (index === 0) { 
         // Self (Bottom)
         p.translate(0, height - BOTTOM_Y);
         
         const tileWidthInHand = TILE_W;
         const handSizePx = (visualHandCount * tileWidthInHand) + (hasNew ? GAP_NEW_TILE : 0);
         const mainGroupSize = handSizePx + (meldSizePx > 0 ? GAP_HAND_MELD + meldSizePx : 0);
         
         // --- Mobile Fit Logic ---
         // If hand is wider than screen, scale it down locally to fit
         const safeMargin = 20 * s;
         const maxW = width - (safeMargin * 2);
         let fitScale = 1;
         
         if (mainGroupSize > maxW) {
             fitScale = maxW / mainGroupSize;
         }

         // Update effective dimensions for drawing and hit testing
         const EFF_TILE_W = TILE_W * fitScale;
         const EFF_TILE_H = TILE_H * fitScale;
         const EFF_MELD_W = MELD_W * fitScale;
         const EFF_MELD_H = MELD_H * fitScale;
         const EFF_GAP_NEW = GAP_NEW_TILE * fitScale;
         const EFF_GAP_MELD_GRP = GAP_HAND_MELD * fitScale;
         const EFF_GAP_MELD = MELD_GAP * fitScale;
         
         const effHandSize = (visualHandCount * EFF_TILE_W) + (hasNew ? EFF_GAP_NEW : 0);
         const effTotalSize = effHandSize + (meldSizePx > 0 ? EFF_GAP_MELD_GRP + (meldSizePx * fitScale) : 0);

         let startX = (width - effTotalSize) / 2;
         const endX = startX + effTotalSize;
         const limitX = width - (P0_MARGIN_RIGHT * fitScale); // Scale margin too
         
         // If room permits, offset to left to avoid UI buttons on right, but keep centered on small screens
         if (fitScale === 1 && endX > limitX) startX = limitX - effTotalSize;
         if (startX < safeMargin) startX = safeMargin;

         // Draw Hand with effective sizes
         this.drawHandSequence(ctx, hand, startX, 0, EFF_TILE_W, EFF_TILE_H, 1, 'STANDING', hasNew, 0, EFF_GAP_NEW, isActive, fitScale);
         
         if (melds.length > 0) {
            const meldStartX = startX + effHandSize + EFF_GAP_MELD_GRP;
            this.drawMelds(ctx, melds, meldStartX, 20 * s * fitScale, EFF_MELD_W, EFF_MELD_H, 1, EFF_GAP_MELD);
         }

         p0StartX = startX;
         p0EffectiveTileW = EFF_TILE_W;

     } else if (index === 1) {
         // Right Player
         const handSizePx = (visualHandCount * SIDE_TILE_THICKNESS) + (hasNew ? GAP_NEW_TILE : 0);
         const mainGroupSize = handSizePx + (meldSizePx > 0 ? GAP_HAND_MELD + meldSizePx : 0);
         
         p.translate(width - (100 * s), 0); 
         p.rotate(p.HALF_PI); 
         
         let startY = (height - mainGroupSize) / 2;
         const endY = startY + mainGroupSize;
         const limitY = height - SIDE_MARGIN_BOTTOM;
         if (endY > limitY) startY = limitY - mainGroupSize;

         const dummyHand = Array(visualHandCount).fill(null);
         this.drawHandSequence(ctx, dummyHand, startY, 0, SIDE_TILE_THICKNESS, TILE_H, 1, 'SIDE_STANDING_R', hasNew, 1, GAP_NEW_TILE, isActive);
         
         if (melds.length > 0) {
             const meldStartY = startY + handSizePx + GAP_HAND_MELD;
             this.drawMelds(ctx, melds, meldStartY, 10 * s, MELD_W, MELD_H, 1, MELD_GAP);
         }
         
     } else if (index === 2) {
         // Top Player
         const handSizePx = (visualHandCount * TILE_W) + (hasNew ? GAP_NEW_TILE : 0);
         const mainGroupSize = handSizePx + (meldSizePx > 0 ? GAP_HAND_MELD + meldSizePx : 0);

         p.translate(width, 80 * s); 
         p.rotate(p.PI);
         const startX = (width - mainGroupSize) / 2;
         
         const dummyHand = Array(visualHandCount).fill(null);
         this.drawHandSequence(ctx, dummyHand, startX, 0, TILE_W, TILE_H, 1, 'BACK_STANDING', hasNew, 2, GAP_NEW_TILE, isActive);
         
         if (melds.length > 0) {
             const meldStartX = startX + handSizePx + GAP_HAND_MELD;
             this.drawMelds(ctx, melds, meldStartX, 10 * s, MELD_W, MELD_H, 1, MELD_GAP);
         }

     } else if (index === 3) {
         // Left Player
         const handSizePx = (visualHandCount * SIDE_TILE_THICKNESS) + (hasNew ? GAP_NEW_TILE : 0);
         const mainGroupSize = handSizePx + (meldSizePx > 0 ? GAP_HAND_MELD + meldSizePx : 0);

         p.translate(100 * s, height); 
         p.rotate(-p.HALF_PI); 
         
         let startY = (height - mainGroupSize) / 2;
         const endY = startY + mainGroupSize;
         const limitY = height - SIDE_MARGIN_BOTTOM;
         if (endY > limitY) startY = limitY - mainGroupSize;

         const dummyHand = Array(visualHandCount).fill(null);
         const fullLen = (visualHandCount * SIDE_TILE_THICKNESS) + (hasNew ? GAP_NEW_TILE : 0);
         const endPos = startY + fullLen;
         
         this.drawLeftHandReverse(ctx, dummyHand, endPos, 0, SIDE_TILE_THICKNESS, TILE_H, hasNew, GAP_NEW_TILE, isActive);
         
         if (melds.length > 0) {
             const meldStartY = startY + fullLen + GAP_HAND_MELD;
             this.drawMelds(ctx, melds, meldStartY, 10 * s, MELD_W, MELD_H, 1, MELD_GAP);
         }
     }
     p.pop();

     return { p0HandStartX: p0StartX, p0TileW: p0EffectiveTileW };
  }

  static drawDiscards(ctx: RenderContext, player: any, index: number) {
      const tiles = player.discards || [];
      if (tiles.length === 0) return;
      
      const { p, width, height, globalScale, animation } = ctx;
      p.push();
      
      const w = 32 * globalScale; 
      const h = 42 * globalScale; 
      
      // Adjusted columns for Player 0 (Self) to 12 to reduce rows (2 rows max for typical game)
      // Others keep 6
      const cols = index === 0 ? 12 : 6; 

      const RIVER_OFFSET = 100 * globalScale;
      const richiiIndex = player.info?.richiiDiscardIndex ?? -1;

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
          const isRichiiTile = (i === richiiIndex);
          
          p.push();
          
          const destX = startX + c*w;
          const destY = r*(h + overlapY);
          
          // 1. Move to Destination
          p.translate(destX, destY);
          
          // 2. Animation Calculation
          let animScale = 1;
          const isLastDiscard = (i === tiles.length - 1);
          
          if (isLastDiscard && isDiscardingPlayer) {
               const dur = 400; 
               const elapsed = Date.now() - animation.lastDiscardTime;
               
               if (elapsed < dur) {
                   const t = elapsed / dur;
                   const ease = 1 - Math.pow(1 - t, 3);

                   const originX = 0; 
                   const originY = 220 * globalScale; 

                   const vX = originX - destX;
                   const vY = originY - destY;
                   
                   const currX = vX * (1 - ease);
                   const currY = vY * (1 - ease);
                   
                   p.translate(currX, currY);
                   
                   const arcH = 150 * globalScale;
                   const z = Math.sin(t * Math.PI) * arcH;
                   p.translate(0, -z);
                   
                   animScale = 1.4 - (0.4 * ease);
                   
                   const spins = 2;
                   const rot = (1 - ease) * Math.PI * 2 * spins;
                   p.rotate(rot);

               } else if (elapsed < dur + 150) {
                   const landT = (elapsed - dur) / 150;
                   const bounceH = 10 * globalScale * Math.sin(landT * Math.PI);
                   p.translate(0, -bounceH);
               }
          }

          p.scale(animScale);
          
          if (isRichiiTile) {
             p.translate(w/2, h/2);
             p.rotate(p.HALF_PI);
             p.translate(-w/2, -h/2);
             p.translate((h-w)/2, 0);
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
      hasNewTile: boolean, playerIdx: number, newTileGap: number, isActive: boolean, fitScale: number = 1
  ) {
      const { p, globalScale, hoveredTileIndex, selectedTileIndex, animation } = ctx;
      const count = hand.length;
      const gapIndex = hasNewTile ? count - 1 : -1;
      
      let cx = startX;
      
      // Store selected tile for drawing last (on top)
      let selectedTileParams: any = null;

      for (let i = 0; i < count; i++) {
          if (i === gapIndex) cx += (newTileGap * dir);
          const drawX = dir === 1 ? cx : cx - w;
          let renderY = y;
          
          // Check for Selection (Player 0 Only)
          // If selected, we skip drawing it in this loop pass
          if (playerIdx === 0 && i === selectedTileIndex) {
              selectedTileParams = { i, tile: hand[i], drawX, renderY };
              cx += (w * dir); // Advance cursor
              continue; // Skip draw
          }

          p.push();
          p.translate(drawX, renderY);

          // HOVER LOGIC (Self Only) - Hover is subtle, can be drawn in order
          if (playerIdx === 0 && i === hoveredTileIndex) {
               const liftAmount = 10 * globalScale * fitScale;
               p.translate(0, -liftAmount);
          }

          // NEW TILE ANIMATION
          const isLastTile = (i === count - 1);
          if (hasNewTile && isLastTile && isActive) {
              const dur = 400; 
              const elapsed = Date.now() - animation.lastTurnTime;
              if (elapsed < dur) {
                  const t = elapsed / dur; 
                  const ease = 1 - (1 - t) * (1 - t);
                  const dropY = 30 * globalScale * (1 - ease);
                  const scaleY = 0.1 + (0.9 * ease);
                  p.translate(0, dropY);
                  p.scale(1, scaleY);
              }
          }
          
          // @ts-ignore
          TileRenderService.drawTile(p, 0, 0, hand[i], w, h, type, globalScale);
          p.pop();

          cx += (w * dir);
      }

      // DRAW SELECTED TILE LAST (On Top)
      if (selectedTileParams) {
          const { tile, drawX, renderY } = selectedTileParams;
          p.push();
          p.translate(drawX, renderY);
          
          const liftAmount = 30 * globalScale * fitScale;
          p.translate(0, -liftAmount);
          
          // Selection Glow (Behind)
          p.push();
          p.drawingContext.shadowColor = "#fbbf24";
          p.drawingContext.shadowBlur = 25;
          p.noFill();
          p.stroke('#fbbf24');
          p.strokeWeight(2);
          p.rect(0, 0, w, h, 4);
          p.pop();

          // Arrow Indicator
          p.push();
          p.translate(w/2, -25 * globalScale * fitScale);
          const bounce = Math.sin(p.frameCount * 0.2) * 5 * globalScale;
          p.translate(0, bounce);
          
          p.fill('#fbbf24');
          p.stroke(0);
          p.strokeWeight(1);
          p.triangle(
              -8 * globalScale * fitScale, -8 * globalScale * fitScale, 
              8 * globalScale * fitScale, -8 * globalScale * fitScale, 
              0, 4 * globalScale * fitScale
          );
          p.pop();

          // Draw Tile
          // @ts-ignore
          TileRenderService.drawTile(p, 0, 0, tile, w, h, type, globalScale);

          p.pop();
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
              // no gap for first
          } else if (hasNewTile && i === count - 2) {
              cx -= newTileGap;
          }
          cx -= w; 
          
          p.push();
          p.translate(cx, y);

          const isLastTile = (i === count - 1);
          if (hasNewTile && isLastTile && isActive) {
              const dur = 400; 
              const elapsed = Date.now() - animation.lastTurnTime;
              if (elapsed < dur) {
                  const t = elapsed / dur; 
                  const ease = 1 - (1 - t) * (1 - t);
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
