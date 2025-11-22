
import { RenderContext } from './RenderTypes';
import { GameStateDTO, Player, Meld, Tile } from '../types';
import { TileRenderService } from './TileRenderService';
import { COLORS } from '../constants';

export class GameOverRenderService {

    static drawGameOver(ctx: RenderContext, gameState: GameStateDTO) {
        const { p, width, height, globalScale } = ctx;

        // 1. Dark Overlay
        p.push();
        p.fill(0, 0, 0, 150);
        p.noStroke();
        p.rect(0, 0, width, height);

        // 2. Modal Dimensions
        const modalW = Math.min(1000 * globalScale, width * 0.95);
        const modalH = Math.min(600 * globalScale, height * 0.85);
        const modalX = (width - modalW) / 2;
        const modalY = (height - modalH) / 2;

        p.translate(modalX, modalY);

        // 3. Modal Background (Gradient)
        const drawCtx = p.drawingContext;
        const bgGrad = drawCtx.createLinearGradient(0, 0, 0, modalH);
        bgGrad.addColorStop(0, '#042f2e'); // Dark Teal
        bgGrad.addColorStop(1, '#064e3b'); // Emerald
        
        drawCtx.fillStyle = bgGrad;
        drawCtx.shadowColor = 'rgba(0,0,0,0.5)';
        drawCtx.shadowBlur = 30;
        
        p.stroke(COLORS.UI_BORDER_GOLD);
        p.strokeWeight(2);
        p.rect(0, 0, modalW, modalH, 16);
        drawCtx.shadowBlur = 0; // Reset

        // 4. Header "結算"
        p.textAlign(p.CENTER, p.TOP);
        p.textSize(40 * globalScale);
        p.textStyle(p.BOLD);
        
        drawCtx.shadowColor = '#fbbf24';
        drawCtx.shadowBlur = 15;
        p.fill('#fffbeb');
        p.noStroke();
        p.text("結算", modalW / 2, 20 * globalScale);
        
        p.textSize(14 * globalScale);
        p.fill('#fbbf24');
        p.text("BALANCE", modalW / 2, 65 * globalScale);
        drawCtx.shadowBlur = 0;

        // 5. Divider Line
        p.stroke(255, 255, 255, 30);
        p.strokeWeight(1);
        p.line(30 * globalScale, 90 * globalScale, modalW - 30 * globalScale, 90 * globalScale);

        // 6. Player Rows
        const rowH = (modalH - 120 * globalScale) / 4;
        const startY = 100 * globalScale;

        // Sort players to show Winner first, or self first? 
        // Standard: Just show in order 0-3 for consistency
        gameState.players.forEach((playerDTO, idx) => {
            const y = startY + (idx * rowH);
            this.drawPlayerRow(ctx, playerDTO.info, playerDTO.hand, playerDTO.melds, 0, y, modalW, rowH);
        });

        p.pop();
    }

    private static drawPlayerRow(
        ctx: RenderContext, 
        player: Player, 
        hand: Tile[], 
        melds: Meld[], 
        x: number, 
        y: number, 
        w: number, 
        h: number
    ) {
        const { p, globalScale } = ctx;
        const cy = y + h / 2;

        // Alternating row background
        if (player.id % 2 !== 0) { // Simple alternating
            p.fill(0, 0, 0, 30);
            p.noStroke();
            p.rect(x, y, w, h);
        }

        // Highlight if Winner or Self
        if (player.isWinner) {
            p.fill(251, 191, 36, 20); // Gold tint
            p.rect(x, y, w, h);
        }

        // --- Column 1: Avatar & Name ---
        const avatarSize = 50 * globalScale;
        const leftPad = 40 * globalScale;
        
        // Avatar
        // Placeholder circle if no image, or just a colored ring
        p.push();
        p.translate(leftPad + avatarSize/2, cy);
        
        // Ring
        if (player.isWinner) {
             p.stroke('#ef4444');
             p.strokeWeight(3);
             p.drawingContext.shadowColor = '#ef4444';
             p.drawingContext.shadowBlur = 10;
        } else {
             p.stroke(255, 255, 255, 50);
             p.strokeWeight(2);
        }
        p.fill(30);
        p.circle(0, 0, avatarSize);
        p.drawingContext.shadowBlur = 0;
        
        // Dealer Badge
        if (player.isDealer) {
            p.noStroke();
            p.fill('#ef4444');
            p.circle(avatarSize/2 * 0.7, -avatarSize/2 * 0.7, 16 * globalScale);
            p.fill(255);
            p.textSize(10 * globalScale);
            p.textAlign(p.CENTER, p.CENTER);
            p.text("莊", avatarSize/2 * 0.7, -avatarSize/2 * 0.7);
        }

        // Name
        p.noStroke();
        p.fill(player.isWinner ? '#fbbf24' : '#e5e7eb');
        p.textAlign(p.LEFT, p.CENTER);
        p.textSize(16 * globalScale);
        p.textStyle(p.BOLD);
        p.text(player.name, avatarSize/2 + 15 * globalScale, -8 * globalScale);
        
        p.fill(255, 255, 255, 100);
        p.textSize(12 * globalScale);
        p.text(`ID: ${player.id}`, avatarSize/2 + 15 * globalScale, 10 * globalScale);

        // Win/Lose Badge
        if (player.isWinner) {
            this.drawBadge(p, -avatarSize/2 - 30 * globalScale, 0, "胡牌", '#ef4444', globalScale);
        } else if (player.isLoser) {
            this.drawBadge(p, -avatarSize/2 - 30 * globalScale, 0, "放槍", '#6366f1', globalScale);
        }

        p.pop();

        // --- Column 2: Tiles (Hand + Melds) ---
        // Layout: Melds on Left? Or Hand on Left? 
        // Screenshot shows: Melds on Left (Exposed), Hand on Right (Concealed).
        // Let's draw: [Melds] ... [Hand]
        
        const tileScale = 0.6 * globalScale;
        const tileW = 46 * tileScale;
        const tileH = 64 * tileScale;
        const gap = 2 * tileScale;
        const groupGap = 15 * tileScale;

        let startTileX = 220 * globalScale;

        // Draw Melds first
        if (melds && melds.length > 0) {
            melds.forEach(meld => {
                meld.tiles.forEach(t => {
                    // @ts-ignore
                    TileRenderService.drawTile(p, startTileX, cy - tileH/2, t, tileW, tileH, 'FLAT', tileScale);
                    startTileX += tileW;
                });
                startTileX += groupGap;
            });
        }
        
        // Draw Hand
        // If winner, separate the winning tile?
        // For now, just draw all tiles. Mock backend should have sorted/appended the winning tile.
        if (hand) {
            hand.forEach((t, i) => {
                const isWinningTile = (player.isWinner && i === hand.length - 1);
                const drawX = isWinningTile ? startTileX + groupGap : startTileX;
                
                // @ts-ignore
                TileRenderService.drawTile(p, drawX, cy - tileH/2, t, tileW, tileH, 'FLAT', tileScale);
                startTileX = drawX + tileW;
            });
        }

        // --- Column 3: Scores ---
        const rightPad = 40 * globalScale;
        const endX = w - rightPad;

        p.push();
        p.translate(endX, cy);
        
        // Delta Score
        p.textAlign(p.RIGHT, p.CENTER);
        p.textStyle(p.BOLD);
        p.textSize(20 * globalScale);
        
        const delta = player.roundScoreDelta || 0;
        const scoreStr = delta > 0 ? `+${delta}` : `${delta}`;
        
        if (delta > 0) p.fill('#fbbf24'); // Gold
        else if (delta < 0) p.fill('#ef4444'); // Red
        else p.fill('#9ca3af'); // Gray
        
        p.text(scoreStr, 0, 0);

        // Tai (Fan) Count
        if (player.tai !== undefined && player.tai > 0) {
             p.textSize(14 * globalScale);
             p.fill('#fff');
             p.text(`${player.tai} 台`, -80 * globalScale, 0);
        } else {
             p.textSize(14 * globalScale);
             p.fill(255,255,255,50);
             p.text("0", -80 * globalScale, 0);
        }

        p.pop();
    }

    private static drawBadge(p: any, x: number, y: number, text: string, color: string, s: number) {
        const w = 40 * s;
        const h = 20 * s;
        
        p.push();
        p.translate(x, y);
        p.fill(color);
        p.stroke(255);
        p.strokeWeight(1);
        p.rectMode(p.CENTER);
        p.rect(0, 0, w, h, 4);
        
        p.fill(255);
        p.noStroke();
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(10 * s);
        p.text(text, 0, 0);
        p.pop();
    }
}
