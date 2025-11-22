
import { VisualEffect } from '../types';
import { RenderContext } from './RenderTypes';

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
