
import { RenderContext, RenderMetrics } from './RenderTypes';
import { TableRenderService } from './TableRenderService';
import { PlayerRenderService } from './PlayerRenderService';
import { EffectRenderService } from './EffectRenderService';
import { InitPhaseRenderService } from './InitPhaseRenderService';

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

    // 1. Table Environment
    TableRenderService.drawTable(ctx);
    TableRenderService.drawTableInfo(ctx, gameState.deckCount || 0);

    // 2. Players & Discards
    const renderOrder = [2, 1, 3, 0]; // Top, Right, Left, Self
    let metrics: RenderMetrics = { p0HandStartX: 0, p0TileW: 0 };

    renderOrder.forEach(i => {
      const player = gameState.players[i];
      if (!player) return;

      const isActive = (i === gameState.turn);
      
      // Draw Hand & Melds
      const result = PlayerRenderService.drawPlayer(ctx, player, i, isActive);
      if (i === 0) metrics = result;

      // Draw Discards
      PlayerRenderService.drawDiscards(ctx, player, i);
    });

    // 3. UI & Effects
    TableRenderService.drawCenterCompass(ctx, gameState);
    EffectRenderService.drawEffects(ctx, gameState.effects);

    return metrics;
  }
}