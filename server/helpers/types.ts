export interface Point {
  x: number;
  y: number;
}

export interface FlowerSlot {
  position: Point;
  rotation: number;
  scaleW: number;
  scaleH: number;
}

export interface LayoutTemplate {
  flowerCount: number;
  bindingPoint: Point;
  slots: FlowerSlot[];
  viewBox: { width: number; height: number };
}

/** Normalized polygon (0-1) for flower head collision region */
export type FlowerPoly = Point[];

export interface FlowerSVG {
  content: string;
  width: number;
  height: number;
  transformCenter?: Point;
  baseRotation?: number;
  flowerPoly?: FlowerPoly;
}
