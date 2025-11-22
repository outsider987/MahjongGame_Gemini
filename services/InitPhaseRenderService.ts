
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
        p.textAlign(p.CENTER);
        p.textSize(24 * globalScale);
        p.fill(255);
        p.text("等待玩家加入...", 0, 0);
        p.textSize(14 * globalScale);
        p.fill(255, 255, 255, 150);
        p.text("伺服器連線中", 0, 30 * globalScale);
    }

    private static drawDiceAnimation(ctx: RenderContext, values: number[]) {
        const { p, globalScale } = ctx;
        const size = 60 * globalScale;
        const gap = 20 * globalScale;
        
        // Animation: Shake effect
        // We use a sine wave on time to create intensity
        const time = p.millis();
        // The animation plays for roughly 2500ms. 
        // 0-1800ms: Shaking. 1800-2500ms: Settled.
        const phase = time % 2500;
        const isSettling = phase > 1800;
        
        // Decay Shake Intensity
        let shakeIntensity = 0;
        if (!isSettling) {
            // High intensity start, decaying over time
            shakeIntensity = p.map(phase, 0, 1800, 10, 0, true);
        }

        // Random shake offset
        const shakeX = p.random(-shakeIntensity, shakeIntensity);
        const shakeY = p.random(-shakeIntensity, shakeIntensity);
        
        // Rotation shake
        const rot = p.random(-0.1 * shakeIntensity, 0.1 * shakeIntensity);

        p.textAlign(p.CENTER);
        p.textSize(20 * globalScale);
        p.fill('#fbbf24');
        p.text("莊家擲骰決定抓位順序", 0, -100 * globalScale);

        p.push();
        p.translate(shakeX, shakeY);

        // Dice 1
        p.push();
        p.translate(-(size/2 + gap/2), 0);
        p.rotate(rot);
        this.drawSingleDie(p, size, values[0]);
        p.pop();

        // Dice 2
        p.push();
        p.translate((size/2 + gap/2), 0);
        p.rotate(-rot);
        this.drawSingleDie(p, size, values[1]);
        p.pop();

        p.pop();
    }

    private static drawSingleDie(p: any, size: number, value: number) {
        // Shadow
        p.noStroke();
        p.fill(0, 0, 0, 50);
        p.rectMode(p.CENTER);
        p.rect(5, 5, size, size, 12);

        // Die Body
        const ctx = p.drawingContext;
        const grd = ctx.createLinearGradient(-size/2, -size/2, size/2, size/2);
        grd.addColorStop(0, '#ffffff');
        grd.addColorStop(1, '#e2e8f0');
        ctx.fillStyle = grd;
        p.rect(0, 0, size, size, 12);

        // Dots
        const dotSize = size * 0.18;
        const range = size * 0.25;

        const drawDot = (x: number, y: number, col: string, s: number = dotSize) => {
            p.fill(col);
            p.circle(x, y, s);
        };
        
        const RED = '#dc2626';
        const BLACK = '#171717';

        if (value === 1) {
            drawDot(0, 0, RED, dotSize * 2.5);
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
        const w = 60 * globalScale;
        const h = 80 * globalScale;
        const radius = 100 * globalScale;
        
        p.textAlign(p.CENTER);
        p.textSize(20 * globalScale);
        p.fill('#fbbf24');
        p.text("洗牌中...", 0, -150 * globalScale);

        // Rotate tiles in a circle quickly
        const speed = p.frameCount * 0.2;
        
        for(let i=0; i<4; i++) {
            p.push();
            const angle = (p.TWO_PI / 4) * i + speed;
            p.translate(Math.cos(angle) * radius, Math.sin(angle) * radius);
            p.rotate(angle + p.HALF_PI);
            
            // Draw Face Down Tile
            p.translate(-w/2, -h/2);
            p.fill('#047857'); // Tile Back Green
            p.stroke('#064e3b');
            p.strokeWeight(2);
            p.rect(0, 0, w, h, 6);
            
            // Shine
            p.noStroke();
            p.fill(255,255,255,30);
            p.rect(0,0,w,h,6); 
            
            p.pop();
        }
    }

    private static drawRevealWinds(ctx: RenderContext, assignment: Record<string, number>) {
        const { p, globalScale } = ctx;
        const w = 70 * globalScale;
        const h = 96 * globalScale;
        
        // Standard Layout: Bottom(0), Right(1), Top(2), Left(3)
        const positions = [
            { x: 0, y: 150 * globalScale, label: "您" }, // Bottom
            { x: 250 * globalScale, y: 0, label: "下家" }, // Right
            { x: 0, y: -150 * globalScale, label: "對家" }, // Top
            { x: -250 * globalScale, y: 0, label: "上家" }, // Left
        ];

        // Animation: Flip effect
        // We assume this state lasts ~3 seconds.
        // We want a flip animation that starts shortly after entering state.
        // Since we don't have absolute state entry time in this stateless render,
        // we use a looped helper or just open them. 
        // To create a "Flip" visual, we can just keep them open as the previous state was "SHUFFLE" (Face Down).
        // But to add juice, let's pulse the scale.
        
        const pulse = 1 + Math.sin(p.frameCount * 0.05) * 0.02;

        positions.forEach((pos, idx) => {
            p.push();
            p.translate(pos.x, pos.y);
            p.scale(pulse); // Subtle breathe effect

            // Wind Value: 1=East, 2=South, 3=West, 4=North
            const val = assignment[String(idx)] || 1;
            const tile: Tile = { id: 'init', suit: Suit.WINDS, value: val, isFlower: false };
            
            // Draw Centered
            p.translate(-w/2, -h/2);
            
            // Render Flat Tile
            TileRenderService.drawTile(p, 0, 0, tile, w, h, 'FLAT', globalScale);
            
            // Highlight Dealer (East = 1)
            if (val === 1) {
                p.push();
                p.translate(w/2, -25 * globalScale);
                
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

            // Label
            p.fill('#fbbf24');
            p.noStroke();
            p.textAlign(p.CENTER);
            p.textSize(16 * globalScale);
            p.text(pos.label, w/2, h + 25*globalScale);

            p.pop();
        });
    }
}
