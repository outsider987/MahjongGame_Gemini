
import { COLORS } from '../constants';
import { RenderContext } from './RenderTypes';
import { AssetLoader } from './AssetLoader';

export class TableRenderService {

  static drawTable({ p, width, height }: RenderContext) {
    const ctx = p.drawingContext;
    const woodImg = AssetLoader.getWoodTexture();

    // 1. Draw Wood Background (Full Screen)
    if (woodImg) {
        p.imageMode(p.CORNER);
        p.image(woodImg, 0, 0, width, height);
    } else {
        p.background('#2a1b0e');
    }

    // 2. Draw Central Felt Mat (The playing area)
    // Leave a border of "Wood" visible
    const margin = Math.min(width, height) * 0.03; // 3% margin
    const matW = width - (margin * 2);
    const matH = height - (margin * 2);

    p.push();
    p.translate(margin, margin);
    
    // Drop Shadow for the Mat to give depth
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 5;

    // Mat Gradient (Green)
    const gradient = ctx.createRadialGradient(matW/2, matH/2, 100, matW/2, matH/2, matH);
    gradient.addColorStop(0, '#0f4c3a'); // Rich Emerald
    gradient.addColorStop(1, '#022c22'); // Darker Edge
    ctx.fillStyle = gradient;
    
    p.noStroke();
    p.rect(0, 0, matW, matH, 20); // Rounded corners
    
    // Reset Shadow
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    
    // Vignette inside the mat
    const gradVignette = ctx.createRadialGradient(matW/2, matH/2, matH * 0.4, matW/2, matH/2, matH * 0.8);
    gradVignette.addColorStop(0, 'rgba(0,0,0,0)');
    gradVignette.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = gradVignette;
    p.rect(0, 0, matW, matH, 20);

    p.pop();
  }

  static drawCenterCompass({ p, width, height, globalScale }: RenderContext, game: any) {
    p.push();
    p.translate(width/2, height/2);
    p.scale(globalScale);
    
    const boxSize = 90; 
    
    p.fill(0, 0, 0, 200);
    p.stroke(COLORS.UI_BORDER_GOLD);
    p.strokeWeight(2);
    p.rectMode(p.CENTER);
    p.rect(0, 0, boxSize, boxSize, 20);
    
    // Use the backend timer value directly (seconds)
    const timeLeft = game.actionTimer !== undefined ? game.actionTimer : 0;
    const isInterrupt = game.state === 'INTERRUPT';
    const isCheckingFlowers = game.state === 'STATE_CHECK_FLOWERS' || game.state === 'CHECK_FLOWERS';
    
    p.noStroke();
    p.textAlign(p.CENTER, p.CENTER);
    
    if (isCheckingFlowers) {
        p.textSize(24);
        p.fill('#fbbf24');
        p.text("補花", 0, 0);
    } else {
        p.textSize(32); 
        p.fill(isInterrupt ? '#fbbf24' : COLORS.CYAN_LED);
        p.text(isInterrupt ? "!" : timeLeft, 0, 0);
    }

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
}
