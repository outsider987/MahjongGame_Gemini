
import { RenderContext } from './RenderTypes';
import { COLORS } from '../constants';

export class HudRenderService {

  static drawHud(ctx: RenderContext, deckCount: number) {
      this.drawTableInfoBox(ctx, deckCount);
  }

  private static drawTableInfoBox({ p, globalScale }: RenderContext, deckCount: number) {
    p.push();
    p.scale(globalScale);
    p.translate(30, 70); 
    
    // 1. Info Box Container
    p.fill(0, 0, 0, 180);
    p.stroke(COLORS.UI_BORDER_GOLD);
    p.strokeWeight(1);
    p.rect(0, 0, 210, 80, 12); 
    
    // 2. Left Side: Round Info (Mock Data for now)
    p.noStroke();
    p.textAlign(p.LEFT, p.TOP);

    p.fill('#fbbf24');
    p.textSize(10);
    p.text("CURRENT ROUND", 16, 15);
    
    p.fill(255);
    p.textSize(18);
    p.textStyle(p.BOLD);
    p.text("南風北局 (2/4)", 16, 35);
    
    // 3. Right Side: Deck Count (The Requested Feature)
    this.drawDeckCounter(p, deckCount);
    
    p.pop();
  }

  private static drawDeckCounter(p: any, deckCount: number) {
    const WARNING_LIMIT = 20;
    const CRITICAL_LIMIT = 8;

    let countColor = '#34d399'; // Default: Green
    let labelColor = '#9ca3af'; // Default: Gray
    let shadowBlur = 0;
    let shadowColor = 'transparent';

    // State Logic
    if (deckCount <= CRITICAL_LIMIT) {
        // Critical State
        countColor = '#ef4444'; // Red
        shadowColor = '#ef4444';
        
        // Blinking Logic (Fast pulse)
        const blinkSpeed = 300;
        if (Math.floor(p.millis() / blinkSpeed) % 2 === 0) {
           countColor = '#ff8888'; // Flash lighter red
           shadowBlur = 20;
        } else {
           shadowBlur = 5;
        }

    } else if (deckCount <= WARNING_LIMIT) {
        // Warning State
        countColor = '#f59e0b'; // Orange
        shadowColor = '#f59e0b';
        shadowBlur = 10;
    }

    // Draw Label
    p.textAlign(p.RIGHT, p.TOP);
    p.fill(labelColor);
    p.textSize(10);
    p.text("TILES LEFT", 194, 15);

    // Draw Count Number
    p.textAlign(p.RIGHT, p.BASELINE);
    p.textSize(32);
    p.textStyle(p.BOLD);
    
    // Apply Glow Effects
    p.drawingContext.shadowColor = shadowColor;
    p.drawingContext.shadowBlur = shadowBlur;

    p.fill(countColor);
    p.text(deckCount, 194, 60);
    
    // Reset Effects
    p.drawingContext.shadowBlur = 0; 
  }
}
