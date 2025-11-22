
export interface RenderMetrics {
  p0HandStartX: number;
  p0TileW: number;
}

export type RenderContext = {
  p: any;
  globalScale: number;
  width: number;
  height: number;
  hoveredTileIndex: number;
  animation: {
    lastTurnTime: number;
    lastDiscardTime: number;
    discardingPlayer: number; // ID or Index of the player who last discarded
  };
};
