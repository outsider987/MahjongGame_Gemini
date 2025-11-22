
import { RenderContext, RenderMetrics } from './RenderTypes';
import { TableRenderService } from './TableRenderService';
import { PlayerRenderService } from './PlayerRenderService';
import { EffectRenderService } from './EffectRenderService';
import { InitPhaseRenderService } from './InitPhaseRenderService';
import { HudRenderService } from './HudRenderService';

// Re-export for compatibility with consumers (like GameCanvas)
export type { RenderMetrics, RenderContext } from './RenderTypes';

export class RenderService {
  
  static drawScene(
    p: any, 
    gameState: any, 
    globalScale: number, 
    hoveredTileIndex: number,
    selectedTileIndex: number,
    animation: { lastTurnTime: number; lastDiscardTime: number; discardingPlayer: number; lastStateChangeTime: number; },
    camera: { shake: number }
  ): RenderMetrics {
    
    const ctx: RenderContext = {
      p,
      globalScale,
      width: p.width,
      height: p.height,
      hoveredTileIndex,
      selectedTileIndex,
      animation,
      camera
    };

    // 0. INIT STATE OVERRIDE
    if (gameState && gameState.state === 'STATE_INIT') {
        InitPhaseRenderService.drawInitPhase(ctx, gameState.initData);
        // Still draw effects (like text overlays) on top
        EffectRenderService.drawEffects(ctx, gameState.effects);
        return { p0HandStartX: 0, p0TileW: 0 };
    }

    if (!gameState || !gameState.players) {
        return { p0HandStartX: 0, p0TileW: 0 };
    }

    // 1. Table Environment (Physical world)
    TableRenderService.drawTable(ctx);

    // 2. Discards Layer (Pass 1 - Bottom)
    // Drawn before hands so hands can visually overlap "the river" if screen is tight
    const renderOrder = [2, 1, 3, 0]; // Top, Right, Left, Self
    renderOrder.forEach(i => {
      const player = gameState.players[i];
      if (player) PlayerRenderService.drawDiscards(ctx, player, i);
    });

    // 3. Hands Layer (Pass 2 - Top)
    // Ensures player hands are always the topmost physical elements
    let metrics: RenderMetrics = { p0HandStartX: 0, p0TileW: 0 };
    renderOrder.forEach(i => {
      const player = gameState.players[i];
      if (!player) return;

      const isActive = (i === gameState.turn);
      
      // Draw Hand & Melds
      const result = PlayerRenderService.drawPlayer(ctx, player, i, isActive);
      
      // Capture P0 Metrics for Hit Testing
      if (i === 0) metrics = result;
    });

    // 4. UI & Effects (Overlays)
    TableRenderService.drawCenterCompass(ctx, gameState);
    
    // New HUD Service for Deck Count & Game Info
    HudRenderService.drawHud(ctx, gameState.deckCount || 0);
    
    EffectRenderService.drawEffects(ctx, gameState.effects);

    return metrics;
  }
}
