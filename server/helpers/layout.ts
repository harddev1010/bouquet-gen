import type { CharmShape } from '@shared/schema';
import type { FlowerSlot, FlowerSVG, LayoutTemplate, Point } from './types';
import {
  LAYOUT_ANGLES,
  LAYOUT_SCALE,
  SVG_CONFIG,
  SPREAD_MULTIPLIER,
  CHARM_SHAPE_CONFIG,
} from './constants';

type FlowerPosition =
  | 'left'
  | 'center_left'
  | 'center'
  | 'center_right'
  | 'right';

export function getFlowerPosition(
  slotIndex: number,
  totalSlots: number,
): FlowerPosition {
  switch (totalSlots) {
    case 1:
      return 'center';
    case 2:
      return ['left', 'right'][slotIndex] as FlowerPosition;
    case 3:
      return ['left', 'center', 'right'][slotIndex] as FlowerPosition;
    case 4:
      return ['left', 'center_left', 'center_right', 'right'][
        slotIndex
      ] as FlowerPosition;
    case 5:
      return ['left', 'center_left', 'center', 'center_right', 'right'][
        slotIndex
      ] as FlowerPosition;
    default:
      throw new Error(`Invalid total slots: ${totalSlots}`);
  }
}

export function generateLayout(
  flowers: Array<FlowerSVG | null>,
  charmShape: CharmShape,
): LayoutTemplate {
  const { viewBoxWidth, viewBoxHeight } = SVG_CONFIG;
  const config = CHARM_SHAPE_CONFIG[charmShape] ?? CHARM_SHAPE_CONFIG.coin;

  const bindingPoint: Point = {
    x: viewBoxWidth * config.bindingPointX,
    y: viewBoxHeight * config.bindingPointY,
  };

  const flowerCount = flowers.length;
  const baseAngles = LAYOUT_ANGLES[flowerCount] || LAYOUT_ANGLES[3];
  const baseScales = LAYOUT_SCALE[flowerCount] || LAYOUT_SCALE[3];
  const spreadMult = SPREAD_MULTIPLIER[charmShape] || 1.0;

  const slots: FlowerSlot[] = baseAngles.map((baseAngle, index) => {
    const flower = flowers[index];
    const { w: scaleW, h: scaleH } = baseScales[index] ?? { w: 1.0, h: 1.0 };
    let angle = baseAngle * spreadMult + (flower?.baseRotation ?? 0);

    const scaledW = (flower?.width ?? 0) * scaleW;
    const scaledH = (flower?.height ?? 0) * scaleH;

    const transformCenter = flower?.transformCenter
      ? {
          x: flower.transformCenter.x * scaledW,
          y: flower.transformCenter.y * scaledH,
        }
      : {
          x: scaledW / 2,
          y: scaledH * 0.75,
        };

    return {
      position: {
        x: bindingPoint.x - transformCenter.x,
        y: bindingPoint.y - transformCenter.y,
      },
      rotation: angle,
      scaleW,
      scaleH,
    };
  });

  return {
    flowerCount,
    bindingPoint,
    slots,
    viewBox: { width: viewBoxWidth, height: viewBoxHeight },
  };
}
