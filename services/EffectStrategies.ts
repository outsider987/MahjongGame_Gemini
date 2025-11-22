
import { VisualEffect } from '../types';
import { RenderContext } from './RenderTypes';
import { TileRenderService } from './TileRenderService';
import { COLORS } from '../constants';

// --- Interface (Strategy) ---
export interface IEffectRenderer {
  render(ctx: RenderContext, effect: VisualEffect): void;
}

// --- Concrete Strategies ---

/**
 * Renders high-impact text with gradients, stroke, and elastic bounce.
 */
export class TextEffectRenderer implements IEffectRenderer {
  render(ctx: RenderContext, fx: VisualEffect) {
    const { p, globalScale } = ctx;
    
    // Physics: Elastic Pop
    // Life goes from Max -> 0
    const maxLife = 60; 
    const progress = 1 - (fx.life / maxLife); // 0 to 1
    
    // Elastic Out Easing: overshoot and settle
    let scale = 1;
    if (progress < 0.2) {
       scale = p.map(progress, 0, 0.2, 0, 1.4);
    } else if (progress < 0.4) {
       scale = p.map(progress, 0.2, 0.4, 1.4, 0.9);
    } else if (progress < 0.6) {
       scale = p.map(progress, 0.4, 0.6, 0.9, 1.05);
    } else {
       scale = 1.0;
    }
    
    // Fade out at very end
    const alpha = fx.life < 10 ? p.map(fx.life, 0, 10, 0, 1) : 1;

    p.push();
    p.translate(fx.x || p.width/2, fx.y || p.height/2);
    p.scale(scale * globalScale);
    
    // Shake logic for high intensity events
    if (fx.variant === 'HU' && fx.life > 30) {
        p.translate(p.random(-5, 5), p.random(-5, 5));
    }

    this.drawStyledText(p, fx.text || '', fx.variant || 'GOLD', alpha);
    p.pop();
  }

  private drawStyledText(p: any, text: string, variant: string, alpha: number) {
    const ctx = p.drawingContext;
    
    // Define Palette based on variant
    let core = COLORS.FX_GOLD_CORE;
    let glow = COLORS.FX_GOLD_GLOW;
    let outer = COLORS.FX_GOLD_OUTER;
    
    if (variant === 'BLUE') { // PONG
        core = COLORS.FX_BLUE_CORE; glow = COLORS.FX_BLUE_GLOW; outer = COLORS.FX_BLUE_OUTER;
    } else if (variant === 'PURPLE') { // KONG
        core = COLORS.FX_PURPLE_CORE; glow = COLORS.FX_PURPLE_GLOW; outer = COLORS.FX_PURPLE_OUTER;
    } else if (variant === 'GREEN') { // CHOW
        core = COLORS.FX_GREEN_CORE; glow = COLORS.FX_GREEN_GLOW; outer = COLORS.FX_GREEN_OUTER;
    } else if (variant === 'HU') {
        core = COLORS.FX_RED_CORE; glow = COLORS.FX_RED_GLOW; outer = COLORS.FX_RED_OUTER;
    }

    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(120);
    p.textStyle(p.BOLD);
    p.strokeJoin(p.ROUND);

    // Layer 1: Outer Glow (Bloom)
    ctx.shadowColor = glow;
    ctx.shadowBlur = 30;
    p.noFill();
    p.stroke(glow);
    p.strokeWeight(15);
    p.strokeCap(p.ROUND);
    // Reduce alpha for glow
    p.stroke(p.color(glow + Math.floor(alpha * 255).toString(16).padStart(2,'0'))); 
    p.text(text, 0, 0);
    ctx.shadowBlur = 0;

    // Layer 2: Thick Stroke (Dark outline)
    p.stroke(outer);
    p.strokeWeight(8);
    p.fill(outer);
    p.text(text, 0, 5); // Drop shadow effect physically

    // Layer 3: Gradient Fill
    const gradient = ctx.createLinearGradient(0, -60, 0, 60);
    gradient.addColorStop(0, core);
    gradient.addColorStop(0.5, glow);
    gradient.addColorStop(1, outer);
    ctx.fillStyle = gradient;
    p.noStroke();
    
    // Apply alpha to fill
    ctx.globalAlpha = alpha;
    p.text(text, 0, 0);
    ctx.globalAlpha = 1.0;

    // Layer 4: Inner Highlight (Shiny top)
    p.fill(255, 255, 255, 180 * alpha);
    p.text(text, -2, -2);
  }
}

/**
 * Renders fractal lightning for dramatic emphasis (Richii/Hu).
 */
export class LightningEffectRenderer implements IEffectRenderer {
  render(ctx: RenderContext, fx: VisualEffect) {
     const { p, globalScale } = ctx;
     p.push();
     p.blendMode(p.ADD); // Additive blending for energy look
     
     const alpha = (fx.life / 20); // Fast fade
     const startY = -p.height * 0.2;
     const endY = p.height * 0.8;
     const midX = p.width / 2;

     // Main color
     const color = (fx.variant === 'GOLD') ? COLORS.FX_GOLD_GLOW : COLORS.CYAN_LED;
     
     p.strokeCap(p.ROUND);
     p.noFill();

     // Draw Main Bolts
     for (let i=0; i<2; i++) {
         this.drawBolt(p, midX, startY, midX + p.random(-100, 100), endY, 8 * globalScale, color, alpha);
     }

     p.pop();
  }

  private drawBolt(p: any, x1: number, y1: number, x2: number, y2: number, thick: number, color: string, alpha: number) {
      const dist = p.dist(x1, y1, x2, y2);
      if (dist < 10 || thick < 1) {
          p.strokeWeight(Math.max(1, thick));
          p.stroke(p.color(color)); // Apply alpha manually or via context if needed, simplistic here
          p.line(x1, y1, x2, y2);
          return;
      }

      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      
      // Jagged offset
      const offset = (Math.random() - 0.5) * dist * 0.3;
      const perpX = -(y2 - y1) / dist * offset;
      const perpY = (x2 - x1) / dist * offset;

      const newX = midX + perpX;
      const newY = midY + perpY;

      this.drawBolt(p, x1, y1, newX, newY, thick * 0.6, color, alpha);
      this.drawBolt(p, newX, newY, x2, y2, thick * 0.6, color, alpha);

      // Occasional Branch
      if (Math.random() > 0.7) {
          const branchEndX = newX + (Math.random() - 0.5) * 100;
          const branchEndY = newY + (Math.random() * 100);
          this.drawBolt(p, newX, newY, branchEndX, branchEndY, thick * 0.3, color, alpha * 0.5);
      }
  }
}

/**
 * Renders physics-based particles (Sparks, Confetti).
 */
export class ParticleEffectRenderer implements IEffectRenderer {
  render(ctx: RenderContext, fx: VisualEffect) {
     if (!fx.particles) return;
     
     const { p, globalScale } = ctx;
     p.push();
     p.blendMode(p.ADD);
     p.noStroke();

     for (let i = fx.particles.length - 1; i >= 0; i--) {
         const pt = fx.particles[i];
         
         // Physics Update
         pt.x += pt.vx * globalScale;
         pt.y += pt.vy * globalScale;
         pt.vy += (pt.gravity || 0.1) * globalScale; // Gravity
         if (pt.drag) {
             pt.vx *= pt.drag;
             pt.vy *= pt.drag;
         }
         
         pt.life--;
         pt.rotation += pt.vRot || 0;
         
         // Render
         const lifeRatio = pt.life / pt.maxLife;
         if (lifeRatio > 0) {
             const size = pt.size * globalScale * lifeRatio;
             const c = p.color(pt.color);
             c.setAlpha(lifeRatio * 255);
             p.fill(c);
             
             p.push();
             p.translate(pt.x, pt.y);
             p.rotate(pt.rotation);
             
             // Draw Spark Shape (Diamond)
             p.beginShape();
             p.vertex(0, -size);
             p.vertex(size * 0.6, 0);
             p.vertex(0, size);
             p.vertex(-size * 0.6, 0);
             p.endShape(p.CLOSE);
             
             p.pop();
         }
     }
     p.pop();
  }
}

/**
 * Renders expanding ripples for impact.
 */
export class ShockwaveEffectRenderer implements IEffectRenderer {
  render(ctx: RenderContext, fx: VisualEffect) {
      const { p, globalScale } = ctx;
      
      const maxLife = 45;
      const t = 1 - (fx.life / maxLife);
      const easeOut = 1 - Math.pow(1 - t, 3); // Cubic ease out

      p.push();
      p.translate(fx.x, fx.y);
      p.noFill();
      p.blendMode(p.ADD);

      const maxRadius = 1000 * globalScale;
      const baseAlpha = 1 - t;

      // Multiple Rings
      for(let i=0; i<3; i++) {
          const lag = i * 0.1;
          let localT = (t - lag) / (1 - lag);
          if (localT < 0) localT = 0;
          
          const r = maxRadius * localT;
          const strokeW = 50 * globalScale * (1 - localT);
          const alpha = baseAlpha * (1 - localT);

          if (alpha <= 0) continue;

          if (fx.variant === 'HU') {
              p.stroke(255, 100, 50, 255 * alpha);
          } else {
              p.stroke(200, 255, 255, 200 * alpha);
          }
          
          p.strokeWeight(strokeW);
          p.circle(0, 0, r * 2);
      }

      p.pop();
  }
}

/**
 * Renders a tile popping up with a holy light ray background.
 */
export class TilePopupRenderer implements IEffectRenderer {
  render(ctx: RenderContext, fx: VisualEffect) {
      const { p, globalScale } = ctx;
      if (!fx.tile) return;

      const maxLife = 60;
      const t = 1 - (fx.life / maxLife);
      
      // Animation: Rise up and settle
      const yOffset = p.lerp(50, -100, Math.min(t * 3, 1)) * globalScale;
      const scaleAnim = t < 0.2 ? (t/0.2) : 1.0;
      const alpha = t > 0.8 ? (1 - t)/0.2 : 1.0; // Fade out at end

      p.push();
      p.translate(fx.x, fx.y + yOffset);
      p.scale(scaleAnim * 1.5); // 1.5x size

      // 1. God Rays (Rotating)
      p.push();
      p.rotate(p.frameCount * 0.05);
      p.noStroke();
      const ctx2 = p.drawingContext;
      
      const grad = ctx2.createRadialGradient(0, 0, 10, 0, 0, 150 * globalScale);
      grad.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
      grad.addColorStop(1, 'rgba(255, 215, 0, 0)');
      ctx2.fillStyle = grad;
      
      // Draw starburst
      const spikes = 12;
      p.beginShape();
      for(let i=0; i<spikes * 2; i++) {
          const r = (i % 2 === 0) ? 150 * globalScale : 40 * globalScale;
          const ang = (Math.PI * 2 / (spikes*2)) * i;
          p.vertex(Math.cos(ang) * r, Math.sin(ang) * r);
      }
      p.endShape(p.CLOSE);
      p.pop();

      // 2. The Tile
      // Using TileRenderService
      // Need to offset to center the tile
      const tileW = 60 * globalScale;
      const tileH = 84 * globalScale;
      
      // Apply alpha to whole context
      ctx2.globalAlpha = alpha;
      TileRenderService.drawTile(p, -tileW/2, -tileH/2, fx.tile, tileW, tileH, 'FLAT', globalScale);
      
      // 3. Text Label
      if (fx.text) {
          p.fill(COLORS.FX_GOLD_CORE);
          p.stroke(COLORS.FX_GOLD_OUTER);
          p.strokeWeight(4);
          p.textSize(24 * globalScale);
          p.textAlign(p.CENTER);
          p.textStyle(p.BOLD);
          p.text(fx.text, 0, tileH/2 + 30*globalScale);
      }
      
      ctx2.globalAlpha = 1;
      p.pop();
  }
}
