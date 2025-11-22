
import { Tile } from '../types';
import { RenderContext, RenderMetrics } from './RenderTypes';
import { TileRenderService } from './TileRenderService';

export class PlayerRenderService {

  static drawPlayer(ctx: RenderContext, player: any, index: number, isActive: boolean): RenderMetrics {
     const { p, width, height, globalScale } = ctx;
     p.push();
     
     const s = globalScale;
     // Base Config
     const BASE_TILE_W = 44;
     const BASE_TILE_H = 60;
     
     const BASE_BOTTOM_OFFSET = 100; 

     // Scaled Metrics
     const TILE_W = BASE_TILE_W * s;
     const TILE_H = BASE_TILE_H * s;
     const MELD_W = TILE_W * 0.85;
     const MELD_H = TILE_H * 0.85;
     const GAP_HAND_MELD = 30 * s;
     const GAP_NEW_TILE = 16 * s;
     const MELD_GAP = 8 * s;
     const SIDE_TILE_W = 20 * s; 
     
     const P0_MARGIN_RIGHT = 160 * s;
     const SIDE_MARGIN_BOTTOM = 150 * s; 
     const BOTTOM_Y = BASE_BOTTOM_OFFSET * s;

     const hand = player.hand || [];
     const handLen = hand.length;
     
     const visualHandCount = index === 0 ? handLen : (player.handCount || 0);
     const hasNew = visualHandCount % 3 === 2;
     
     const tileWidthInHand = (index === 1 || index === 3) ? SIDE_TILE_W : TILE_W;
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
            this.drawMelds(ctx, melds, meldStartX, 0, MELD_W, MELD_H, 1, MELD_GAP);
         }

         p0StartX = startX;

     } else if (index === 1) {
         // Right
         p.translate(width - (110 * s), 0); 
         p.rotate(p.HALF_PI);
         
         let startY = (height - totalSize) / 2;
         const endY = startY + totalSize;
         const limitY = height - SIDE_MARGIN_BOTTOM;
         if (endY > limitY) startY = limitY - totalSize;

         const dummyHand = Array(visualHandCount).fill(null);
         this.drawHandSequence(ctx, dummyHand, startY, 0, TILE_W, TILE_H, 1, 'SIDE_STANDING', hasNew, 1, GAP_NEW_TILE);
         
         if (melds.length > 0) {
             const meldStartY = startY + handSizePx + GAP_HAND_MELD;
             this.drawMelds(ctx, melds, meldStartY, 0, MELD_W, MELD_H, 1, MELD_GAP);
         }
         
     } else if (index === 2) {
         // Top
         p.translate(width, 80 * s); 
         p.rotate(p.PI);
         const startX = (width - totalSize) / 2;
         
         const dummyHand = Array(visualHandCount).fill(null);
         this.drawHandSequence(ctx, dummyHand, startX, 0, TILE_W, TILE_H, 1, 'BACK_STANDING', hasNew, 2, GAP_NEW_TILE);
         
         if (melds.length > 0) {
             const meldStartX = startX + handSizePx + GAP_HAND_MELD;
             this.drawMelds(ctx, melds, meldStartX, 0, MELD_W, MELD_H, 1, MELD_GAP);
         }

     } else if (index === 3) {
         // Left
         p.translate(110 * s, height); 
         p.rotate(-p.HALF_PI); 
         
         let startY = (height - totalSize) / 2;
         const endY = startY + totalSize;
         const limitY = height - SIDE_MARGIN_BOTTOM;
         if (endY > limitY) startY = limitY - totalSize;

         const dummyHand = Array(visualHandCount).fill(null);
         this.drawHandSequence(ctx, dummyHand, startY, 0, TILE_W, TILE_H, 1, 'SIDE_STANDING', hasNew, 3, GAP_NEW_TILE);
         
         if (melds.length > 0) {
             const meldStartY = startY + handSizePx + GAP_HAND_MELD;
             this.drawMelds(ctx, melds, meldStartY, 0, MELD_W, MELD_H, 1, MELD_GAP);
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
      
      const w = 30 * globalScale; 
      const h = 39 * globalScale; 
      const cols = 6; 
      const RIVER_OFFSET = 68 * globalScale; 

      p.translate(width/2, height/2);
      
      if (index === 0) p.translate(0, RIVER_OFFSET);
      if (index === 1) { p.translate(RIVER_OFFSET + (20*globalScale), 0); p.rotate(-p.HALF_PI); }
      if (index === 2) { p.translate(0, -RIVER_OFFSET); p.rotate(p.PI); }
      if (index === 3) { p.translate(-RIVER_OFFSET - (20*globalScale), 0); p.rotate(p.HALF_PI); }
      
      const startX = -(cols * w) / 2;
      tiles.forEach((tile: Tile, i: number) => {
          const r = Math.floor(i / cols);
          const c = i % cols;
          TileRenderService.drawTile(p, startX + c*w, r*(h-(5*globalScale)), tile, w, h, 'FLAT', globalScale);
      });
      p.pop();
  }

  private static drawHandSequence(
      ctx: RenderContext, hand: Tile[], startX: number, y: number, w: number, h: number, 
      dir: 1 | -1, type: 'STANDING' | 'BACK_STANDING' | 'SIDE_STANDING', 
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
          if (playerIdx === 0 && i === hoveredTileIndex) renderY -= (20 * globalScale);
          
          TileRenderService.drawTile(p, drawX, renderY, hand[i], w, h, type, globalScale);
          cx += (w * dir);
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
             TileRenderService.drawTile(p, drawX, y + ((60*globalScale) * 0.85 - h), meld.tiles[i], w, h, 'FLAT', globalScale); 
             cx += (w * dir);
         }
         cx += (gap * dir);
      });
  }
}
