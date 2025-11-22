

import { RenderContext } from './RenderTypes';
import { InitData, Suit, Tile } from '../types';
import { TileRenderService } from './TileRenderService';
import { TableRenderService } from './TableRenderService';

export class InitPhaseRenderService {

    static drawInitPhase(ctx: RenderContext, initData?: InitData) {
        const { p, width, height } = ctx;

        // 1. Draw Background
        TableRenderService.drawTable(ctx);

        if (!initData) return;

        const step = initData.step;

        // 2. Render based on Step
        p.push();
        p.translate(width / 2, height / 2);
        
        if (step === 'WAITING') {
            this.drawWaiting(ctx);
        } else if (step === 'DICE') {
            this.drawDiceAnimation(ctx, initData.diceValues);
        } else if (step === 'SHUFFLE') {
            this.drawShufflingTiles(ctx);
        } else if (step === 'REVEAL') {
            this.drawRevealWinds(ctx, initData.windAssignment);
        }
        
        p.pop();
    }

    private static drawWaiting(ctx: RenderContext) {
        const { p, globalScale } = ctx;
        const t = p.millis() * 0.002;
        const alpha = 150 + Math.sin(t) * 100;

        p.textAlign(p.CENTER);
        p.textSize(24 * globalScale);
        p.fill(255, 255, 255, alpha);
        p.text("等待玩家加入...", 0, 0);
        
        p.textSize(14 * globalScale);
        p.fill(255, 255, 255, 150);
        p.text("伺服器連線中", 0, 30 * globalScale);

        // Rotating loading circle
        p.push();
        p.rotate(p.millis() * 0.003);
        p.noFill();
        p.stroke(255, 255, 255, 50);
        p.strokeWeight(4);
        p.arc(0, 0, 100 * globalScale, 100 * globalScale, 0, p.PI);
        p.pop();
    }

    private static drawDiceAnimation(ctx: RenderContext, finalValues: number[]) {
        const { p, globalScale, animation } = ctx;
        const size = 60 * globalScale;
        const gap = 20 * globalScale;
        
        // Use state change time to animate the roll
        const elapsed = Date.now() - animation.lastStateChangeTime;
        const rollDuration = 1800;
        const isRolling = elapsed < rollDuration;
        
        // Decay Shake Intensity
        let shakeIntensity = 0;
        let displayValues = [1, 1];

        if (isRolling) {
            // High intensity start, decaying over time
            shakeIntensity = p.map(elapsed, 0, rollDuration, 15, 0, true);
            
            // Change numbers rapidly
            if (p.frameCount % 5 === 0) {
                displayValues = [
                    Math.floor(p.random(1, 7)),
                    Math.floor(p.random(1, 7))
                ];
            } else {
                // Keep previous random (fake stability)
                displayValues = [
                    Math.floor(p.noise(p.frameCount) * 6) + 1,
                    Math.floor(p.noise(p.frameCount + 100) * 6) + 1
                ];
            }
        } else {
            displayValues = finalValues;
        }

        const shakeX = p.random(-shakeIntensity, shakeIntensity);
        const shakeY = p.random(-shakeIntensity, shakeIntensity);
        const rot = p.random(-0.02 * shakeIntensity, 0.02 * shakeIntensity);

        p.textAlign(p.CENTER);
        p.textSize(20 * globalScale);
        p.fill('#fbbf24');
        p.text("莊家擲骰決定抓位順序", 0, -120 * globalScale);

        p.push();
        p.translate(shakeX, shakeY);

        // Shadow for Dice
        p.fill(0, 0, 0, 60);
        p.noStroke();
        p.rectMode(p.CENTER);
        p.rect(0, 10 * globalScale, size * 2.5, size, 20);

        // Dice 1
        p.push();
        p.translate(-(size/2 + gap/2), 0);
        p.rotate(rot);
        this.drawSingleDie(p, size, displayValues[0]);
        p.pop();

        // Dice 2
        p.push();
        p.translate((size/2 + gap/2), 0);
        p.rotate(-rot);
        this.drawSingleDie(p, size, displayValues[1]);
        p.pop();

        p.pop();
    }

    private static drawSingleDie(p: any, size: number, value: number) {
        const ctx = p.drawingContext;
        
        // Die Body (Gradient)
        const grd = ctx.createLinearGradient(-size/2, -size/2, size/2, size/2);
        grd.addColorStop(0, '#ffffff');
        grd.addColorStop(1, '#d1d5db');
        ctx.fillStyle = grd;
        
        p.noStroke();
        p.rectMode(p.CENTER);
        p.rect(0, 0, size, size, size * 0.2);

        // Inner bevel highlight
        p.noFill();
        p.stroke(255, 255, 255, 200);
        p.strokeWeight(2);
        p.rect(0, 0, size - 4, size - 4, size * 0.15);

        // Dots
        const dotSize = size * 0.16;
        const range = size * 0.26;

        const drawDot = (x: number, y: number, col: string, s: number = dotSize) => {
            p.fill(col);
            p.noStroke();
            p.circle(x, y, s);
            // Specular on dot
            p.fill(255, 255, 255, 50);
            p.circle(x - s*0.2, y - s*0.2, s*0.3);
        };
        
        const RED = '#dc2626';
        const BLACK = '#171717';

        if (value === 1) {
            drawDot(0, 0, RED, dotSize * 2.6);
        } else if (value === 2) {
            drawDot(-range, -range, BLACK); drawDot(range, range, BLACK);
        } else if (value === 3) {
             drawDot(-range, -range, BLACK); drawDot(0, 0, BLACK); drawDot(range, range, BLACK);
        } else if (value === 4) {
            [ -range, range ].forEach(x => { [ -range, range ].forEach(y => drawDot(x, y, RED)); });
        } else if (value === 5) {
            [ -range, range ].forEach(x => { [ -range, range ].forEach(y => drawDot(x, y, BLACK)); });
            drawDot(0, 0, BLACK);
        } else if (value === 6) {
            [ -range, range ].forEach(x => { [ -range, 0, range ].forEach(y => drawDot(x, y, BLACK)); });
        }
    }

    private static drawShufflingTiles(ctx: RenderContext) {
        const { p, globalScale } = ctx;
        const w = 50 * globalScale;
        const h = 70 * globalScale;
        
        p.textAlign(p.CENTER);
        p.textSize(20 * globalScale);
        p.fill('#fbbf24');
        p.text("洗牌中... (Zhuā Wèi)", 0, -180 * globalScale);

        // "Washing Machine" Effect
        const count = 16;
        const baseRadius = 120 * globalScale;
        const time = p.millis() * 0.002;

        for(let i=0; i<count; i++) {
            p.push();
            
            // Chaos Math
            const offsetIdx = i * 0.5;
            const radius = baseRadius + Math.sin(time * 2 + offsetIdx) * 40 * globalScale;
            const angle = time + (p.TWO_PI / count) * i + Math.sin(time * 3 + i) * 0.5;
            
            const cx = Math.cos(angle) * radius;
            const cy = Math.sin(angle) * radius;
            
            p.translate(cx, cy);
            // Spin tile
            p.rotate(angle + time * 2);
            
            // Render proper face-down tile asset
            // We draw centered at current translation
            TileRenderService.drawTile(p, -w/2, -h/2, null, w, h, 'BACK_FLAT', globalScale);
            
            p.pop();
        }
        
        // Center Whirlpool Overlay
        p.noFill();
        p.stroke('#fbbf24');
        p.strokeWeight(2);
        p.drawingContext.setLineDash([10, 20]);
        p.circle(0, 0, baseRadius * 2.5);
        p.drawingContext.setLineDash([]);
    }

    private static drawRevealWinds(ctx: RenderContext, assignment: Record<string, number>) {
        const { p, globalScale, animation } = ctx;
        const w = 70 * globalScale;
        const h = 96 * globalScale;
        
        // Animation: Flip Tiles
        const elapsed = Date.now() - animation.lastStateChangeTime;
        const flipDuration = 800; // ms per tile flip effect
        
        // Standard Layout: Bottom(0), Right(1), Top(2), Left(3)
        const positions = [
            { x: 0, y: 150 * globalScale, label: "您" },
            { x: 250 * globalScale, y: 0, label: "下家" }, 
            { x: 0, y: -150 * globalScale, label: "對家" }, 
            { x: -250 * globalScale, y: 0, label: "上家" }, 
        ];

        let allRevealed = true;

        positions.forEach((pos, idx) => {
            // Staggered Animation
            const delay = idx * 200;
            const localTime = elapsed - delay;
            let progress = 0; // 0 = Back, 1 = Front
            
            if (localTime < 0) {
                progress = 0;
                allRevealed = false;
            } else {
                progress = Math.min(1, localTime / flipDuration);
                if (progress < 1) allRevealed = false;
            }

            // Scale X from 1 -> 0 -> 1 to simulate 3D Flip
            let scaleX = 1;
            const isFaceUp = progress > 0.5;
            
            if (progress <= 0.5) {
                scaleX = 1 - (progress * 2);
            } else {
                scaleX = (progress - 0.5) * 2;
            }

            p.push();
            p.translate(pos.x, pos.y);
            
            // Flip Transform
            p.scale(scaleX, 1);

            const val = assignment[String(idx)] || 1;
            const tile: Tile = { id: 'init', suit: Suit.WINDS, value: val, isFlower: false };
            
            if (!isFaceUp) {
                // Draw Back (Face Down) using high-quality asset
                TileRenderService.drawTile(p, -w/2, -h/2, null, w, h, 'BACK_FLAT', globalScale);
            } else {
                // Draw Front (Face Up)
                TileRenderService.drawTile(p, -w/2, -h/2, tile, w, h, 'FLAT', globalScale);
                
                // Highlight Dealer
                if (val === 1) {
                    p.push();
                    p.translate(0, -25 * globalScale - h/2);
                    
                    // Glowing Dealer Indicator
                    p.drawingContext.shadowColor = '#ef4444';
                    p.drawingContext.shadowBlur = 15;
                    p.fill('#ef4444');
                    p.noStroke();
                    p.circle(0, 0, 24 * globalScale);
                    p.drawingContext.shadowBlur = 0;
    
                    p.fill(255);
                    p.textAlign(p.CENTER, p.CENTER);
                    p.textSize(12 * globalScale);
                    p.textStyle(p.BOLD);
                    p.text("莊", 0, 0);
                    p.pop();
                }
            }
            
            p.pop(); // End Flip

            // Label (Always visible, no flip)
            p.fill('#fbbf24');
            p.noStroke();
            p.textAlign(p.CENTER);
            p.textSize(16 * globalScale);
            p.text(pos.label, pos.x, pos.y + h/2 + 25*globalScale);

        });
        
        // Instruction Text (Dynamic)
        const titleText = allRevealed ? "東風位為莊家 (抓位結果)" : "抓位中...";
        
        p.push();
        p.translate(0, -50 * globalScale);
        const alpha = Math.min(255, elapsed * 0.1);
        p.fill(255, 255, 255, alpha);
        p.textAlign(p.CENTER);
        p.textSize(22 * globalScale);
        p.text(titleText, 0, 0);
        p.pop();
    }
}
