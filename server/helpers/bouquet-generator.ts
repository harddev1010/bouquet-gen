import * as fs from 'fs';
import * as path from 'path';
import { getProjectRoot } from './path-utils';
import type { GenerateBouquetRequest, CharmShape } from '@shared/schema';
import {
  POSTER_TITLE_PROP,
  POSTER_NAMES_PROP,
  LOCALE_MONTH_TO_KEY,
  MONTH_TO_FLOWER,
  BACK_TEXT_PROPERTY_NAMES,
} from './constants';
import { generateLayout, getFlowerPosition } from './layout';
import {
  loadFlowerSVG,
  composeBouquet,
  checkAssetsExist,
  getFlowersAssetsPath,
  resolveCollisions,
  balanceFlowerAngles,
} from './svg-utils';

const OUTPUT_DIR = path.join(getProjectRoot(), 'generated_svg');

function ensureOutputDir(): void {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

function generateFilename(flowers: string[]): string {
  const timestamp = Date.now();
  const flowerList = flowers.join('_').toLowerCase().replace(/\s/g, '');
  return `bouquet_${flowerList}_${timestamp}.svg`;
}

export async function generateBouquet(
  request: GenerateBouquetRequest,
): Promise<{ filename: string; path: string; svg: string }> {
  const { flowers, charmShape } = request;

  if (flowers.length < 1 || flowers.length > 5) {
    throw new Error(`Invalid flower count: ${flowers.length}. Must be 1-5.`);
  }

  if (!checkAssetsExist()) {
    throw new Error(`Flower assets not found at ${getFlowersAssetsPath()}`);
  }

  const positions = flowers.map((_, index) =>
    getFlowerPosition(index, flowers.length),
  );
  const flowerSVGs = flowers.map((month, index) =>
    loadFlowerSVG(month, positions[index]),
  );

  const loadedCount = flowerSVGs.filter((f) => f !== null).length;
  if (loadedCount === 0) {
    throw new Error('Failed to load any flower SVGs');
  }

  const layout = generateLayout(flowerSVGs, charmShape as CharmShape);
  const resolvedLayout = resolveCollisions(
    layout,
    flowerSVGs,
    layout.bindingPoint,
  );

  const balancedLayout = balanceFlowerAngles(resolvedLayout, flowerSVGs);

  // Re-run collision resolution after balancing (balancing can re-introduce overlaps)
  const finalLayout = resolveCollisions(
    balancedLayout,
    flowerSVGs,
    balancedLayout.bindingPoint,
  );

  const svg = composeBouquet(
    finalLayout,
    flowerSVGs,
    charmShape as CharmShape,
  );

  ensureOutputDir();
  const filename = generateFilename(flowers);
  const filepath = path.join(OUTPUT_DIR, filename);

  return { filename, path: filepath, svg };
}

const FRONT_FLOWER_NAME_PATTERNS = [
  /^Voorkant geboortebloem (\d)$/,
  /^Vorderseite Geburtsblume (\d)$/,
];

const TITLE_PROPERTY_NAMES = [
  POSTER_TITLE_PROP,
  'Poster title',
  'Poster titel',
  'Titel',
  'Title',
];

const NAMES_PROPERTY_NAMES = [
  POSTER_NAMES_PROP,
  'Naam',
  'Namen',
  'Name',
  'Names',
];

function normalizeMonthToFlowerKey(label: string): string {
  const t = label.trim();
  const direct =
    LOCALE_MONTH_TO_KEY[t] ??
    MONTH_TO_FLOWER[t as keyof typeof MONTH_TO_FLOWER];
  if (direct) return direct;
  const tl = t.toLowerCase();
  const merged = { ...LOCALE_MONTH_TO_KEY, ...MONTH_TO_FLOWER } as Record<
    string,
    string
  >;
  for (const [k, v] of Object.entries(merged)) {
    if (k.toLowerCase() === tl) return v;
  }
  return t;
}

export function extractFlowersFromLineItem(lineItem: any): string[] | null {
  if (!lineItem.properties || !Array.isArray(lineItem.properties)) {
    return null;
  }

  const flowers: string[] = [];

  for (const prop of lineItem.properties) {
    if (!prop?.name || !prop.value) continue;
    for (const re of FRONT_FLOWER_NAME_PATTERNS) {
      const match = prop.name.match(re);
      if (match) {
        const index = parseInt(match[1], 10) - 1;
        flowers[index] = normalizeMonthToFlowerKey(String(prop.value));
        break;
      }
    }
  }

  const ordered = flowers.filter(Boolean);
  return ordered.length > 0 ? ordered : null;
}

export function extractTextFromLineItem(lineItem: {
  properties?: Array<{ name: string; value: string }>;
  title?: string;
}): { title?: string; names?: string } {
  const result: { title?: string; names?: string } = {};

  function normalizeKey(input: string): string {
    return input
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  function getProp(
    props: Array<{ name: string; value: string }> | undefined,
    name: string,
  ): string | undefined {
    if (!props) return undefined;
    const p = props.find((x) => x.name === name);
    return p?.value?.trim() || undefined;
  }

  function getFirstMatchingProp(
    props: Array<{ name: string; value: string }> | undefined,
    names: string[],
  ): string | undefined {
    if (!props || props.length === 0) return undefined;
    for (const name of names) {
      const exact = getProp(props, name);
      if (exact) return exact;
    }

    const normalizedNames = new Set(names.map(normalizeKey));
    for (const prop of props) {
      if (!prop?.name || !prop.value) continue;
      const key = normalizeKey(prop.name);
      if (normalizedNames.has(key)) {
        const value = String(prop.value).trim();
        if (value) return value;
      }
    }
    return undefined;
  }

  function deriveTitleFromLineItemTitle(title: string | undefined): string | undefined {
    if (!title) return undefined;
    const clean = title.trim();
    if (!clean) return undefined;
    const segments = clean
      .split(' - ')
      .map((segment) => segment.trim())
      .filter(Boolean);
    return segments[0] || clean;
  }

  if (lineItem.properties?.length) {
    result.title = getFirstMatchingProp(lineItem.properties, TITLE_PROPERTY_NAMES);
    result.names = getFirstMatchingProp(lineItem.properties, NAMES_PROPERTY_NAMES);
    if (!result.names) {
      for (const name of BACK_TEXT_PROPERTY_NAMES) {
        const v = getProp(lineItem.properties, name);
        if (v) {
          result.names = v;
          break;
        }
      }
    }
  }

  if (!result.title) {
    result.title = deriveTitleFromLineItemTitle(lineItem.title);
  }

  return result;
}

export function extractTextFromOrder(orderData: {
  note_attributes?: Array<{ name: string; value: string }>;
  line_items?: Array<{
    properties?: Array<{ name: string; value: string }>;
    title?: string;
  }>;
  shipping_address?: { name?: string | null };
  billing_address?: { name?: string | null };
  customer?: { first_name?: string | null; last_name?: string | null };
}): { title?: string; names?: string } {
  const result: { title?: string; names?: string } = {};

  function normalizeKey(input: string): string {
    return input
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  function getProp(
    props: Array<{ name: string; value: string }> | undefined,
    name: string,
  ): string | undefined {
    if (!props) return undefined;
    const p = props.find((x) => x.name === name);
    return p?.value?.trim() || undefined;
  }

  function getFirstMatchingProp(
    props: Array<{ name: string; value: string }> | undefined,
    names: string[],
  ): string | undefined {
    if (!props || props.length === 0) return undefined;
    for (const name of names) {
      const exact = getProp(props, name);
      if (exact) return exact;
    }

    const normalizedNames = new Set(names.map(normalizeKey));
    for (const prop of props) {
      if (!prop?.name || !prop.value) continue;
      const key = normalizeKey(prop.name);
      if (normalizedNames.has(key)) {
        const value = String(prop.value).trim();
        if (value) return value;
      }
    }
    return undefined;
  }

  function getCustomerName(): string | undefined {
    const shippingName = orderData.shipping_address?.name?.trim();
    if (shippingName) return shippingName;

    const billingName = orderData.billing_address?.name?.trim();
    if (billingName) return billingName;

    const firstName = orderData.customer?.first_name?.trim() ?? '';
    const lastName = orderData.customer?.last_name?.trim() ?? '';
    const combined = `${firstName} ${lastName}`.trim();
    return combined || undefined;
  }

  if (orderData.note_attributes?.length) {
    result.title = getFirstMatchingProp(orderData.note_attributes, TITLE_PROPERTY_NAMES);
    result.names = getFirstMatchingProp(orderData.note_attributes, NAMES_PROPERTY_NAMES);
  }

  if (orderData.line_items?.length) {
    for (const item of orderData.line_items) {
      if (result.title && result.names) break;
      const fromLine = extractTextFromLineItem(item);
      if (!result.title && fromLine.title) result.title = fromLine.title;
      if (!result.names && fromLine.names) result.names = fromLine.names;
    }
  }

  if (!result.names) {
    result.names = getCustomerName();
  }

  return result;
}

export function parseCharmTypeFromSKU(sku: string): CharmShape {
  if (!sku) return 'coin';
  const parts = sku.split('-');
  if (parts.length < 2) return 'coin';

  const code = parts[1];
  switch (code) {
    case 'CO':
      return 'coin';
    case 'OV':
      return 'oval';
    case 'HT':
      return 'heart';
    case 'RN':
      return 'round';
    default:
      return 'coin';
  }
}
