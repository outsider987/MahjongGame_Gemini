
import { COLORS } from '../constants';
import { RenderContext } from './RenderTypes';

export class TableRenderService {

  static drawTable({ p, width, height }: RenderContext) {
    const ctx = p.drawingContext;
    const gradient = ctx.createRadialGradient(width/2, height/2, 200, width/2, height/2, height);
    gradient.addColorStop(0, '#0f4c3a'); 
    gradient.addColorStop(1, '#022c22'); 
    ctx.fillStyle = gradient;
    p.noStroke();
    p.rect(0, 0, width, height);
  }

  static drawTableInfo({ p, globalScale }: RenderContext, deckCount: number) {
    p.push();
    p.scale(globalScale);
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
    
    p.noStroke();
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(32); 
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
}
