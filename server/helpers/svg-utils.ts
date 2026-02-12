import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { CharmShape } from '@shared/schema';
import type { FlowerSVG, FlowerSlot, LayoutTemplate, Point } from './types';
import {
  FLOWER_FILES,
  MONTH_TO_FLOWER,
  SVG_CONFIG,
  BASE_FLOWER_HEIGHT,
  CHARM_SHAPE_CONFIG,
} from './constants';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ASSETS_PATH = path.join(__dirname, '../../assets/flowers');

function removeBackgroundPath(svgContent: string): string {
  return svgContent.replace(/<g>\s*<path[^>]*Z"\s*\/?>\s*<\/g>/i, '');
}

function convertToStrokeOnly(content: string): string {
  let result = content;

  result = result.replace(/fill="[^"]*"/g, 'fill="none"');
  result = result.replace(/fill:[^;"]*/g, 'fill:none');
  result = result.replace(/<path([^>]*)>/g, (match, attrs) => {
    if (attrs.includes('stroke=')) return match;
    const strokeAttr = ` stroke="${SVG_CONFIG.strokeColor}" stroke-width="${SVG_CONFIG.strokeWidth}"`;
    const cleanAttrs = attrs.replace(/\s*\/\s*$/g, '');
    return `<path${cleanAttrs}${strokeAttr} />`;
  });

  result = result.replace(
    /stroke="none"/g,
    `stroke="${SVG_CONFIG.strokeColor}"`,
  );

  return result;
}

function parseSVG(svgContent: string): FlowerSVG {
  let origWidth = 100,
    origHeight = 100;

  const widthMatch = svgContent.match(/width="([\d.]+)(px)?"/i);
  const heightMatch = svgContent.match(/height="([\d.]+)(px)?"/i);

  if (widthMatch && heightMatch) {
    origWidth = parseFloat(widthMatch[1]);
    origHeight = parseFloat(heightMatch[1]);
  } else {
    const viewBoxMatch = svgContent.match(/viewBox="([^"]+)"/i);
    if (viewBoxMatch) {
      const parts = viewBoxMatch[1].trim().split(/\s+/);
      if (parts.length === 4) {
        origWidth = parseFloat(parts[2]);
        origHeight = parseFloat(parts[3]);
      }
    }
  }

  svgContent = removeBackgroundPath(svgContent);

  const gMatch = svgContent.match(/<g[^>]*>([\s\S]*)<\/g>/i);
  let content = gMatch ? gMatch[0] : '';

  content = convertToStrokeOnly(content);

  const scaleFactor = BASE_FLOWER_HEIGHT / origHeight;
  const normalizedWidth = origWidth * scaleFactor;

  content = `<g transform="scale(${scaleFactor.toFixed(6)})">${content}</g>`;

  return {
    content,
    width: normalizedWidth,
    height: BASE_FLOWER_HEIGHT,
  };
}

export function loadFlowerSVG(
  month: string,
  position: 'left' | 'center' | 'right',
): FlowerSVG | null {
  const flowerName = MONTH_TO_FLOWER[month];
  if (!flowerName) {
    console.error(`Unknown month: ${month}`);
    return null;
  }

  const fileMapping = FLOWER_FILES[flowerName];
  if (!fileMapping) {
    console.error(`No file mapping for: ${flowerName}`);
    return null;
  }

  const svgInfo = fileMapping[position];
  const fileName = svgInfo.path;
  const filePath = path.join(ASSETS_PATH, fileName);

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = parseSVG(content);

    parsed.transformCenter = svgInfo.transformCenter;
    parsed.baseRotation = svgInfo.baseRotation;

    return parsed;
  } catch (error) {
    console.error(`Failed to load: ${filePath}`);
    return null;
  }
}

export function checkAssetsExist(): boolean {
  try {
    const files = fs.readdirSync(ASSETS_PATH);
    return files.length > 0;
  } catch {
    return false;
  }
}

function transformFlower(
  flower: FlowerSVG,
  slot: FlowerSlot,
  bindingPoint: Point,
  index: number,
): string {
  const { rotation, position } = slot;

  return `
    <g id="flower-${index}" 
       transform="rotate(${rotation.toFixed(2)}, ${bindingPoint.x}, ${bindingPoint.y}) translate(${position.x.toFixed(2)}, ${position.y.toFixed(2)}) ">
      ${flower.content}
    </g>`;
}

export function composeBouquet(
  layout: LayoutTemplate,
  flowers: Array<FlowerSVG | null>,
  charmShape: CharmShape,
): string {
  const { viewBox, bindingPoint } = layout;
  const config = CHARM_SHAPE_CONFIG[charmShape] ?? CHARM_SHAPE_CONFIG.coin;

  const flowersContent = flowers
    .map((flower, index) =>
      flower
        ? transformFlower(flower, layout.slots[index], bindingPoint, index)
        : '',
    )
    .join('\n');

  const cx = viewBox.width / 2;
  const cy = viewBox.height / 2;
  const needsScale = config.scaleX !== 1 || config.scaleY !== 1;
  const scaleAttr = needsScale
    ? ` transform="translate(${cx}, ${cy}) scale(${config.scaleX}, ${config.scaleY}) translate(${-cx}, ${-cy})"`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" version="1.1"
     viewBox="0 0 ${viewBox.width} ${viewBox.height}"
     width="${viewBox.width}px" height="${viewBox.height}px">
  <g id="bouquet"${scaleAttr}>
    <g id="flowers">
    ${flowersContent}
    </g>
  </g>
</svg>`;
}
