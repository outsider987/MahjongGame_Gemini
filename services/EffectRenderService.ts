
import { VisualEffect } from '../types';
import { RenderContext } from './RenderTypes';
import { TileRenderService } from './TileRenderService';

export class EffectRenderService {
  static drawEffects(ctx: RenderContext, effects: VisualEffect[]) {
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
          else if (fx.type === 'SHOCKWAVE') {
              const maxLife = 30;
              const progress = 1 - (fx.life / maxLife); // 0 to 1 (expands)
              const maxRadius = 400 * globalScale;
              
              p.push();
              p.translate(fx.x, fx.y);
              p.noFill();
              // Stroke weight fades out
              p.strokeWeight(20 * (1 - progress) * globalScale);
              
              if (fx.variant === 'HU') {
                  p.stroke(255, 215, 0, 200 * (1 - progress)); // Gold
              } else {
                  p.stroke(255, 255, 255, 150 * (1 - progress));
              }
              
              p.circle(0, 0, maxRadius * progress * 2); 
              p.pop();
          }
          else if (fx.type === 'TEXT') {
               p.push();
               p.translate(fx.x || p.width/2, fx.y || p.height/2);
               
               // Pop animation
               let scale = p.map(fx.life, 50, 0, 0.8, 1.5);
               if (fx.life > 40) scale = p.map(fx.life, 50, 40, 0.1, 1.5); // Scale up quickly
               
               // Shake for HU
               if (fx.text?.includes('胡') || fx.text?.includes('自摸')) {
                   p.translate(p.random(-2, 2), p.random(-2, 2));
               }

               p.scale(scale);
               p.textAlign(p.CENTER, p.CENTER);
               p.textSize(100 * globalScale);
               p.textStyle(p.BOLD);
               
               // Shadow
               p.fill(0, 0, 0, fx.life * 5);
               p.text(fx.text, 6, 6); 
               
               // Main Text
               p.fill('#fbbf24');
               p.stroke('#b91c1c');
               p.strokeWeight(4);
               p.text(fx.text, 0, 0);
               p.pop();
          }
          else if (fx.type === 'TILE_POPUP' && fx.tile) {
               p.push();
               p.translate(fx.x || p.width/2, fx.y || p.height/2);
               
               // Rise animation
               const maxLife = 50;
               const progress = 1 - (fx.life / maxLife); // 0 to 1
               const yOffset = -50 * progress * globalScale;
               
               p.translate(0, yOffset);
               
               // Pulse Scale
               let s = 1.0;
               if (progress < 0.2) s = p.map(progress, 0, 0.2, 0, 1.2);
               else if (progress < 0.4) s = p.map(progress, 0.2, 0.4, 1.2, 1.0);
               
               p.scale(s);
               
               // Fade out at end
               let alpha = 1;
               if (fx.life < 15) {
                   alpha = fx.life / 15;
                   p.drawingContext.globalAlpha = alpha;
               }

               const w = 50 * globalScale;
               const h = 70 * globalScale;
               TileRenderService.drawTile(p, -w/2, -h/2, fx.tile, w, h, 'FLAT', globalScale);
               
               if (fx.text) {
                   p.fill('#fbbf24');
                   p.stroke(0);
                   p.strokeWeight(2);
                   p.textAlign(p.CENTER);
                   p.textSize(18 * globalScale);
                   p.text(fx.text, 0, -h/2 - 10*globalScale);
               }

               p.pop();
               p.drawingContext.globalAlpha = 1; 
          }
          else if (fx.type === 'PARTICLES' && fx.particles) {
              fx.particles.forEach((pt: any) => {
                  // Physics
                  pt.x += pt.vx;
                  pt.y += pt.vy;
                  if (pt.gravity) pt.vy += pt.gravity;
                  
                  // Drag
                  pt.vx *= 0.96;
                  pt.vy *= 0.96;

                  pt.life--;
                  
                  // Rendering
                  if (pt.life > 0) {
                      const alpha = (pt.life / pt.maxLife) * 255;
                      p.noStroke();
                      
                      // Parse color string (assuming hex) and set alpha
                      // Or just use a simple hack if p5 color parsing is expensive
                      const c = p.color(pt.color);
                      c.setAlpha(alpha);
                      p.fill(c);
                      
                      p.circle(pt.x, pt.y, pt.size * globalScale);
                  }
              });
          }

          if (fx.life <= 0) effects.splice(i, 1);
      }
  }
}