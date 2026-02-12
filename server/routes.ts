import type { Express, Request, Response } from 'express';
import { createServer, type Server } from 'http';
import { generateBouquetSchema } from '@shared/schema';
import {
  generateBouquet,
  extractFlowersFromLineItem,
  parseCharmTypeFromSKU,
} from './helpers/bouquet-generator';
import { checkAssetsExist } from './helpers/svg-utils';
import { FLOWER_FILES } from './helpers/constants';

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  app.post('/api/bouquet', async (req: Request, res: Response) => {
    try {
      const parseResult = generateBouquetSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          ok: false,
          error: 'Invalid request',
          details: parseResult.error.errors,
        });
      }

      const result = await generateBouquet(parseResult.data);

      return res.json({
        ok: true,
        filename: result.filename,
        path: result.path,
        svg: result.svg,
      });
    } catch (error) {
      console.error('Bouquet generation error:', error);
      return res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.post('/api/bouquet/from-order', async (req: Request, res: Response) => {
    try {
      const orderData = req.body.order || req.body;

      if (!orderData.line_items || !Array.isArray(orderData.line_items)) {
        return res.status(400).json({
          ok: false,
          error: 'No line_items found',
        });
      }

      const results = [];

      for (const lineItem of orderData.line_items) {
        if (!lineItem.sku?.startsWith('BFB')) continue;

        const flowers = extractFlowersFromLineItem(lineItem);
        if (!flowers || flowers.length === 0) continue;

        const charmShape = parseCharmTypeFromSKU(lineItem.sku);

        const result = await generateBouquet({ flowers, charmShape });
        results.push({
          lineItemId: lineItem.id,
          ...result,
        });
      }

      if (results.length === 0) {
        return res.status(400).json({
          ok: false,
          error: 'No valid birthflower products found',
        });
      }

      return res.json({
        ok: true,
        orderId: orderData.id,
        bouquets: results,
      });
    } catch (error) {
      console.error('Order processing error:', error);
      return res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.get('/api/flowers', (_req: Request, res: Response) => {
    const flowers: Record<
      string,
      {
        left: { path: string; transformCenter: { x: number; y: number }; baseRotation: number };
        center: { path: string; transformCenter: { x: number; y: number }; baseRotation: number };
        right: { path: string; transformCenter: { x: number; y: number }; baseRotation: number };
      }
    > = {};
    const pathsSet = new Set<string>();

    for (const [month, positions] of Object.entries(FLOWER_FILES)) {
      flowers[month] = {
        left: {
          path: positions.left.path,
          transformCenter: positions.left.transformCenter,
          baseRotation: positions.left.baseRotation,
        },
        center: {
          path: positions.center.path,
          transformCenter: positions.center.transformCenter,
          baseRotation: positions.center.baseRotation,
        },
        right: {
          path: positions.right.path,
          transformCenter: positions.right.transformCenter,
          baseRotation: positions.right.baseRotation,
        },
      };
      pathsSet.add(positions.left.path).add(positions.center.path).add(positions.right.path);
    }

    return res.json({
      flowers,
      paths: [...pathsSet].sort(),
      months: Object.keys(FLOWER_FILES),
      positions: ['left', 'center', 'right'] as const,
    });
  });

  app.get('/api/bouquet/status', (_req: Request, res: Response) => {
    return res.json({
      ok: true,
      assetsAvailable: checkAssetsExist(),
      supportedFlowerCounts: [1, 2, 3, 4, 5],
      supportedCharmShapes: ['coin', 'oval', 'heart', 'round'],
    });
  });

  return httpServer;
}
