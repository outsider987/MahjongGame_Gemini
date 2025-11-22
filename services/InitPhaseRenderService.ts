
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
        
        if (step === 'DICE') {
            this.drawDiceAnimation(ctx, initData.diceValues);
        } else if (step === 'SHUFFLE') {
            // Show Dice fading out or smaller? Just tiles for now.
            this.drawShufflingTiles(ctx);
        } else if (step === 'REVEAL') {
            this.drawRevealWinds(ctx, initData.windAssignment);
        }
        
        p.pop();
    }

    private static drawDiceAnimation(ctx: RenderContext, values: number[]) {
        const { p, globalScale } = ctx;
        const size = 60 * globalScale;
        const gap = 20 * globalScale;
        
        // Animation: Rotate slightly based on frameCount
        const angle = Math.sin(p.frameCount * 0.1) * 0.1;

        // Dice 1
        p.push();
        p.translate(-(size/2 + gap/2), 0);
        p.rotate(angle);
        this.drawSingleDie(p, size, values[0]);
        p.pop();

        // Dice 2
        p.push();
        p.translate((size/2 + gap/2), 0);
        p.rotate(-angle);
        this.drawSingleDie(p, size, values[1]);
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
        
        // Rotate tiles in a circle
        const speed = p.frameCount * 0.05;
        
        for(let i=0; i<4; i++) {
            p.push();
            const angle = (p.TWO_PI / 4) * i + speed;
            p.translate(Math.cos(angle) * radius, Math.sin(angle) * radius);
            p.rotate(angle + p.HALF_PI);
            
            // Draw Face Down Tile
            // Using TileRenderService but forcing BACK_STANDING look or just manually drawing back
            // We'll reuse BACK_STANDING logic but centered
            p.translate(-w/2, -h/2);
            
            // Custom simple back draw for rotation
            p.fill('#047857');
            p.rect(0, 0, w, h, 6);
            p.fill(255,255,255,50);
            p.rect(0,0,w,h,6); // shine
            
            p.pop();
        }
    }

    private static drawRevealWinds(ctx: RenderContext, assignment: Record<string, string>) {
        const { p, globalScale } = ctx;
        const w = 70 * globalScale;
        const h = 96 * globalScale;
        
        // Standard Layout: Bottom(0), Right(1), Top(2), Left(3)
        // We show the tile assigned to them.
        const positions = [
            { x: 0, y: 150 * globalScale, label: "您" }, // Bottom
            { x: 250 * globalScale, y: 0, label: "下家" }, // Right
            { x: 0, y: -150 * globalScale, label: "對家" }, // Top
            { x: -250 * globalScale, y: 0, label: "上家" }, // Left
        ];

        positions.forEach((pos, idx) => {
            p.push();
            p.translate(pos.x, pos.y);
            
            // Animate pop in
            const scaleAnim = Math.min(1, (p.frameCount % 30) / 10 + 0.5); 
            // Note: In a real app we'd use a consistent start time from DTO, but frameCount is okay for mock.
            
            // Get Wind Tile
            // Assignment: 'EAST' | 'SOUTH' | 'WEST' | 'NORTH'
            const windName = assignment[String(idx)] || 'EAST';
            const valMap: Record<string, number> = { 'EAST': 1, 'SOUTH': 2, 'WEST': 3, 'NORTH': 4 };
            const val = valMap[windName];

            const tile: Tile = { id: 'init', suit: Suit.WINDS, value: val, isFlower: false };
            
            // Draw Centered
            p.translate(-w/2, -h/2);
            TileRenderService.drawTile(p, 0, 0, tile, w, h, 'FLAT', globalScale);
            
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
