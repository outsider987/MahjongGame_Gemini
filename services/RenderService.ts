
import { COLORS } from '../constants';
import { Suit, Tile, Player } from '../types';
import { AssetLoader } from './AssetLoader';

// Shared Types for Rendering
type RenderContext = {
  p: any;
  globalScale: number;
  width: number;
  height: number;
  hoveredTileIndex: number;
};

// Metadata returned after a render pass (for hit testing)
export interface RenderMetrics {
  p0HandStartX: number;
  p0TileW: number;
}

export class RenderService {
  
  static drawScene(
    p: any, 
    gameState: any, 
    globalScale: number, 
    hoveredTileIndex: number
  ): RenderMetrics {
    
    // Defensive Check: If gameState is not ready, return safe defaults
    if (!gameState || !gameState.players) {
        return { p0HandStartX: 0, p0TileW: 0 };
    }

    const ctx: RenderContext = {
      p,
      globalScale,
      width: p.width,
      height: p.height,
      hoveredTileIndex
    };

    // 1. Background
    this.drawTable(ctx);
    // Use deckCount instead of deck.length
    this.drawTableInfo(ctx, gameState.deckCount || 0);

    // 2. Players & Discards (Painter's Algorithm: Top/Sides first, Bottom last)
    const renderOrder = [2, 1, 3, 0]; // Top, Right, Left, Self
    let metrics: RenderMetrics = { p0HandStartX: 0, p0TileW: 0 };

    renderOrder.forEach(i => {
      const player = gameState.players[i];
      if (!player) return;

      const isActive = (i === gameState.turn);
      
      // Draw Player Hand & Melds
      const result = this.drawPlayer(ctx, player, i, isActive);
      
      // Capture metrics for Player 0 (Self) for hit testing
      if (i === 0) {
        metrics = result;
      }

      // Draw Discards
      this.drawDiscards(ctx, player, i);
    });

    // 3. Overlay Effects
    this.drawCenterCompass(ctx, gameState);
    this.drawEffects(ctx, gameState.effects);

    return metrics;
  }

  // --- Private Render Helpers ---

  private static drawTable({ p, width, height }: RenderContext) {
    const ctx = p.drawingContext;
    const gradient = ctx.createRadialGradient(width/2, height/2, 200, width/2, height/2, height);
    gradient.addColorStop(0, '#0f4c3a'); 
    gradient.addColorStop(1, '#022c22'); 
    ctx.fillStyle = gradient;
    p.noStroke();
    p.rect(0, 0, width, height);
  }

  private static drawTableInfo({ p, globalScale }: RenderContext, deckCount: number) {
    p.push();
    p.scale(globalScale);
    // Moved up slightly to avoid overlapping left player area on mobile
    p.translate(20, 60);
    p.fill(0, 0, 0, 80);
    p.stroke(COLORS.UI_BORDER_GOLD);
    p.rect(0, 0, 180, 80, 12);
    p.noStroke();
    p.fill('#fbbf24');
    p.textSize(14);
    p.text("CURRENT ROUND", 16, 12, 150);
    p.fill(255);
    p.textSize(22);
    p.textStyle(p.BOLD);
    p.text("南風北局 (2/4)", 16, 45);
    p.textSize(28);
    p.fill('#34d399'); 
    p.text(deckCount, 130, 45);
    p.pop();
  }

  private static drawCenterCompass({ p, width, height, globalScale }: RenderContext, game: any) {
    p.push();
    // Perfectly centered for symmetry
    p.translate(width/2, height/2);
    p.scale(globalScale);
    
    // Reduced size to allow River to be closer to center
    const boxSize = 90; 
    
    p.fill(0, 0, 0, 200);
    p.stroke(COLORS.UI_BORDER_GOLD);
    p.strokeWeight(2);
    p.rectMode(p.CENTER);
    p.rect(0, 0, boxSize, boxSize, 20);
    
    const timeLeft = Math.ceil((game.actionTimer || 0) / 30);
    const isInterrupt = game.state === 'INTERRUPT';
    
    p.noStroke();
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(32); // Slightly smaller text
    p.fill(isInterrupt ? '#fbbf24' : COLORS.CYAN_LED);
    p.text(isInterrupt ? "!" : timeLeft, 0, 0);

    const turn = game.turn;
    const offset = boxSize/2 - 15;
    const positions = [
       { label: '南', x: 0, y: offset, idx: 0 }, 
       { label: '西', x: offset, y: 0, idx: 1 }, 
       { label: '北', x: 0, y: -offset, idx: 2 }, 
       { label: '東', x: -offset, y: 0, idx: 3 }  
    ];

    const ctx = p.drawingContext;
    positions.forEach(pos => {
        p.push();
        p.translate(pos.x, pos.y);
        if (turn === pos.idx) {
           ctx.shadowBlur = 15;
           ctx.shadowColor = '#fbbf24';
           p.fill('#fbbf24');
           p.textSize(20);
        } else {
           ctx.shadowBlur = 0;
           p.fill(255, 255, 255, 50);
           p.textSize(14);
        }
        p.textStyle(p.BOLD);
        p.text(pos.label, 0, 0);
        p.pop();
    });
    p.pop();
  }

  private static drawPlayer(ctx: RenderContext, player: any, index: number, isActive: boolean): RenderMetrics {
     const { p, width, height, globalScale } = ctx;
     p.push();
     
     const s = globalScale;
     // Base Config
     const BASE_TILE_W = 44;
     const BASE_TILE_H = 60;
     
     // Reduced bottom offset to push hands lower and avoid river collision
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
     const SIDE_MARGIN_BOTTOM = 150 * s; // Slightly adjusted
     const BOTTOM_Y = BASE_BOTTOM_OFFSET * s;

     // Safety check for player.hand being undefined
     const hand = player.hand || [];
     const handLen = hand.length;
     
     // If hand is hidden (other players), use handCount
     const visualHandCount = index === 0 ? handLen : (player.handCount || 0);
     const hasNew = visualHandCount % 3 === 2;
     
     const tileWidthInHand = (index === 1 || index === 3) ? SIDE_TILE_W : TILE_W;
     const handSizePx = (visualHandCount * tileWidthInHand) + (hasNew ? GAP_NEW_TILE : 0);
     
     const melds = player.melds || [];
     const meldSizePx = melds.reduce((acc: number, m: any) => {
        return acc + ((m?.tiles?.length || 0) * MELD_W) + MELD_GAP;
     }, 0);
     
     const totalSize = handSizePx + (meldSizePx > 0 ? GAP_HAND_MELD + meldSizePx : 0);
     
     // Metrics to return
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
         p.translate(width - (110 * s), 0); // Moved slightly closer to edge
         p.rotate(p.HALF_PI);
         
         let startY = (height - totalSize) / 2;
         const endY = startY + totalSize;
         const limitY = height - SIDE_MARGIN_BOTTOM;
         if (endY > limitY) startY = limitY - totalSize;

         // Draw dummy hand for opponents
         const dummyHand = Array(visualHandCount).fill(null);
         this.drawHandSequence(ctx, dummyHand, startY, 0, TILE_W, TILE_H, 1, 'SIDE_STANDING', hasNew, 1, GAP_NEW_TILE);
         
         if (melds.length > 0) {
             const meldStartY = startY + handSizePx + GAP_HAND_MELD;
             this.drawMelds(ctx, melds, meldStartY, 0, MELD_W, MELD_H, 1, MELD_GAP);
         }
         
     } else if (index === 2) {
         // Top
         p.translate(width, 80 * s); // Moved higher up
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
         p.translate(110 * s, height); // Moved closer to edge
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
          // Hover Effect for P0
          if (playerIdx === 0 && i === hoveredTileIndex) renderY -= (20 * globalScale);
          
          this.drawTile(p, drawX, renderY, hand[i], w, h, type, globalScale);
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
             // Align bottom
             this.drawTile(p, drawX, y + ((60*globalScale) * 0.85 - h), meld.tiles[i], w, h, 'FLAT', globalScale); 
             cx += (w * dir);
         }
         cx += (gap * dir);
      });
  }

  private static drawDiscards(ctx: RenderContext, player: any, index: number) {
      const tiles = player.discards || [];
      if (tiles.length === 0) return;
      
      const { p, width, height, globalScale } = ctx;
      p.push();
      
      // Compact sizes for discards to prevent overlapping hands on mobile
      const w = 30 * globalScale; 
      const h = 39 * globalScale; 
      const cols = 6; 
      // Significantly reduced offset to pull river toward center
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
          // Reduced vertical gap slightly
          this.drawTile(p, startX + c*w, r*(h-(5*globalScale)), tile, w, h, 'FLAT', globalScale);
      });
      p.pop();
  }

  private static drawTile(
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
      
      // Check if image is loaded and valid (width > 1 for safety, as failed loads can result in 0 or 1 size)
      if (img && img.width > 1) {
          // SVG Rendering
          const padding = w * 0.15;
          p.imageMode(p.CENTER);
          p.image(img, 0, 0, w - padding, h - padding);
      } else {
          // 2. Fallback to Procedural Text (for network errors or missing assets)
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

  private static drawEffects(ctx: RenderContext, effects: any[]) {
      const { p, globalScale } = ctx;
      if (!effects) return;
      
      for (let i = effects.length - 1; i >= 0; i--) {
          const fx = effects[i];
          fx.life--;

          if (fx.type === 'LIGHTNING') {
               p.push();
               p.stroke(0, 255, 255, fx.life * 10);
               p.strokeWeight(4);
               p.noFill();
               p.beginShape();
               for(let k=0; k<p.width; k+=30) {
                   p.vertex(k, p.height/2 + p.random(-80, 80));
               }
               p.endShape();
               p.noStroke();
               p.fill(255, 255, 255, fx.life * 3);
               p.rect(0, 0, p.width, p.height);
               p.pop();
          } 
          else if (fx.type === 'TEXT') {
               p.push();
               p.translate(fx.x || p.width/2, fx.y || p.height/2);
               const scale = p.map(fx.life, 50, 0, 0.8, 1.5);
               p.scale(scale);
               p.textAlign(p.CENTER, p.CENTER);
               p.textSize(100 * globalScale);
               p.textStyle(p.BOLD);
               p.fill(0, 0, 0, fx.life * 5);
               p.text(fx.text, 6, 6); 
               p.fill('#fbbf24');
               p.stroke('#b91c1c');
               p.strokeWeight(4);
               p.text(fx.text, 0, 0);
               p.pop();
          }
          else if (fx.type === 'PARTICLES' && fx.particles) {
              fx.particles.forEach((pt: any) => {
                  pt.x += pt.vx;
                  pt.y += pt.vy;
                  pt.life--;
                  p.noStroke();
                  p.fill(pt.color);
                  p.circle(pt.x, pt.y, pt.size * globalScale);
              });
          }

          if (fx.life <= 0) effects.splice(i, 1);
      }
  }
}

const INK_BLACK = '#0f172a'; // Helper constant for fallback text
