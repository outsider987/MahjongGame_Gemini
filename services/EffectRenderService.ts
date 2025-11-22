
import { VisualEffect } from '../types';
import { RenderContext } from './RenderTypes';
import { 
  IEffectRenderer, 
  TextEffectRenderer, 
  LightningEffectRenderer, 
  ParticleEffectRenderer, 
  ShockwaveEffectRenderer, 
  TilePopupRenderer 
} from './EffectStrategies';

export class EffectRenderService {
  
  private static strategies: Record<string, IEffectRenderer> = {
      'TEXT': new TextEffectRenderer(),
      'LIGHTNING': new LightningEffectRenderer(),
      'PARTICLES': new ParticleEffectRenderer(),
      'SHOCKWAVE': new ShockwaveEffectRenderer(),
      'TILE_POPUP': new TilePopupRenderer()
  };

  static drawEffects(ctx: RenderContext, effects: VisualEffect[]) {
      const { p } = ctx;
      if (!effects || effects.length === 0) return;
      
      // Safely reset context before drawing effects overlay
      const drawCtx = p.drawingContext;
      drawCtx.shadowBlur = 0;
      p.blendMode(p.BLEND);

      for (let i = effects.length - 1; i >= 0; i--) {
          const fx = effects[i];
          
          // Decrement Life
          fx.life--;

          // Delegate to Strategy
          const renderer = this.strategies[fx.type];
          if (renderer) {
              renderer.render(ctx, fx);
          }

          // Remove dead effects
          if (fx.life <= 0) {
              effects.splice(i, 1);
          }
      }
      
      // Cleanup after all effects
      p.blendMode(p.BLEND);
      drawCtx.shadowBlur = 0;
      drawCtx.globalAlpha = 1;
  }
}
