
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
};
