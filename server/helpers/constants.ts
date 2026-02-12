import type { CharmShape } from '@shared/schema';
import { Point } from './types';

export const MONTH_TO_FLOWER: Record<string, string> = {
  Januari: 'january',
  Februari: 'february',
  Maart: 'march',
  April: 'april',
  Mei: 'may',
  Juni: 'june',
  Juli: 'july',
  Augustus: 'august',
  September: 'september',
  Oktober: 'october',
  November: 'november',
  December: 'december',
};

type FlowerAsset = {
  path: string;
  transformCenter: Point;
  baseRotation: number;
};

export const FLOWER_FILES: Record<
  string,
  { left: FlowerAsset; center: FlowerAsset; right: FlowerAsset }
> = {
  january: {
    left: {
      path: 'january_mostly_used_left.svg',
      transformCenter: { x: 0.615, y: 0.785 },
      baseRotation: 0,
    },
    center: {
      path: 'january_simple_mostly_used_in_the_middle.svg',
      transformCenter: { x: 0, y: 0 },
      baseRotation: 0,
    },
    right: {
      path: 'january_mirrored_mostly_used_right.svg',
      transformCenter: { x: 0, y: 0 },
      baseRotation: 0,
    },
  },
  february: {
    left: {
      path: 'february_single_flower_mirrored_leaf_left_side.svg',
      transformCenter: { x: 0, y: 0 },
      baseRotation: 0,
    },
    center: {
      path: 'february_single_flower.svg',
      transformCenter: { x: 0.643, y: 0.76 },
      baseRotation: 13.5,
    },
    right: {
      path: 'february_leaf_right_side.svg',
      transformCenter: { x: 0.7, y: 0.81 },
      baseRotation: 25.5,
    },
  },
  march: {
    left: {
      path: 'march_single_flower.svg',
      transformCenter: { x: 0, y: 0 },
      baseRotation: 0,
    },
    center: {
      path: 'march_flower.svg',
      transformCenter: { x: 0, y: 0 },
      baseRotation: 0,
    },
    right: {
      path: 'march_single_flower_mirrored.svg',
      transformCenter: { x: 0, y: 0 },
      baseRotation: 0,
    },
  },
  april: {
    left: {
      path: 'april_mostly_used_left.svg',
      transformCenter: { x: 0.837, y: 0.813 },
      baseRotation: 0,
    },
    center: {
      path: 'april_mostly_used_left.svg',
      transformCenter: { x: 0, y: 0 },
      baseRotation: 0,
    },
    right: {
      path: 'april_mirrored_mostly_used_right.svg',
      transformCenter: { x: 0, y: 0 },
      baseRotation: 0,
    },
  },
  may: {
    left: {
      path: 'may_mirrored_with_leaf_left.svg',
      transformCenter: { x: 0, y: 0 },
      baseRotation: 0,
    },
    center: {
      path: 'may_without_leafs.svg',
      transformCenter: { x: 0, y: 0 },
      baseRotation: 0,
    },
    right: {
      path: 'may_with_leaf_right.svg',
      transformCenter: { x: 0.628, y: 0.764 },
      baseRotation: 22.0,
    },
  },
  june: {
    left: {
      path: 'june_single_flower.svg',
      transformCenter: { x: 0.342, y: 0.752 },
      baseRotation: -23.0,
    },
    center: {
      path: 'june_single_flower.svg',
      transformCenter: { x: 0.343, y: 0.752 },
      baseRotation: -21.5,
    },
    right: {
      path: 'june_single_flower_mirrored.svg',
      transformCenter: { x: 0, y: 0 },
      baseRotation: 0,
    },
  },
  july: {
    left: {
      path: 'july_single_flower_mirrored.svg',
      transformCenter: { x: 0, y: 0 },
      baseRotation: 0,
    },
    center: {
      path: 'july_single_flower.svg',
      transformCenter: { x: 0.297, y: 0.806 },
      baseRotation: 2.0,
    },
    right: {
      path: 'july_single_flower.svg',
      transformCenter: { x: 0.297, y: 0.806 },
      baseRotation: 2.0,
    },
  },
  august: {
    left: {
      path: 'august_single_flower.svg',
      transformCenter: { x: 0, y: 0 },
      baseRotation: 0,
    },
    center: {
      path: 'august.svg',
      transformCenter: { x: 0, y: 0 },
      baseRotation: 0,
    },
    right: {
      path: 'august_single_flower_mirrored.svg',
      transformCenter: { x: 0, y: 0 },
      baseRotation: 0,
    },
  },
  september: {
    left: {
      path: 'september_simpel_mirrored.svg',
      transformCenter: { x: 0.556, y: 0.714 },
      baseRotation: -6.0,
    },
    center: {
      path: 'september_simpel.svg',
      transformCenter: { x: 0.514, y: 0.801 },
      baseRotation: 0,
    },
    right: {
      path: 'september_simpel.svg',
      transformCenter: { x: 0, y: 0 },
      baseRotation: 0,
    },
  },
  october: {
    left: {
      path: 'october_single_flower.svg',
      transformCenter: { x: 0.494, y: 0.828 },
      baseRotation: -2.0,
    },
    center: {
      path: 'october_single_flower.svg',
      transformCenter: { x: 0.494, y: 0.828 },
      baseRotation: 2.0,
    },
    right: {
      path: 'october_single_flower_mirrored.svg',
      transformCenter: { x: 0.494, y: 0.828 },
      baseRotation: 0,
    },
  },
  november: {
    left: {
      path: 'november_less_leafs.svg',
      transformCenter: { x: 0, y: 0 },
      baseRotation: 0,
    },
    center: {
      path: 'november.svg',
      transformCenter: { x: 0, y: 0 },
      baseRotation: 0,
    },
    right: {
      path: 'november_less_leafs_mirrored.svg',
      transformCenter: { x: 0, y: 0 },
      baseRotation: 0,
    },
  },
  december: {
    left: {
      path: 'december_single_flower.svg',
      transformCenter: { x: 0, y: 0 },
      baseRotation: 0,
    },
    center: {
      path: 'december.svg',
      transformCenter: { x: 0, y: 0 },
      baseRotation: 0,
    },
    right: {
      path: 'december_single_flower_mirrored.svg',
      transformCenter: { x: 0, y: 0 },
      baseRotation: 0,
    },
  },
};

export const LAYOUT_ANGLES: Record<number, number[]> = {
  1: [0],
  2: [-25, 25],
  3: [-30, 0, 30],
  4: [-40, -15, 15, 40],
  5: [-45, -22, 0, 22, 45],
};

export const BASE_FLOWER_HEIGHT = 270;

export const SPREAD_MULTIPLIER: Record<CharmShape, number> = {
  coin: 1.0,
  round: 1.0,
  oval: 1.0,
  heart: 1.0,
};

export type CharmShapeConfig = {
  bindingPointX: number;
  bindingPointY: number;
  scaleX: number;
  scaleY: number;
};

export const CHARM_SHAPE_CONFIG: Record<CharmShape, CharmShapeConfig> = {
  coin: {
    bindingPointX: 0.5,
    bindingPointY: 0.8,
    scaleX: 0.9,
    scaleY: 0.9,
  },
  round: {
    bindingPointX: 0.5,
    bindingPointY: 0.8,
    scaleX: 1.1,
    scaleY: 1.8,
  },
  oval: {
    bindingPointX: 0.5,
    bindingPointY: 0.8,
    scaleX: 1,
    scaleY: 1,
  },
  heart: {
    bindingPointX: 0.5,
    bindingPointY: 0.8,
    scaleX: 1,
    scaleY: 1,
  },
};

export const SVG_CONFIG = {
  viewBoxWidth: 400,
  viewBoxHeight: 400,
  strokeColor: '#000000',
  strokeWidth: 4,
};
