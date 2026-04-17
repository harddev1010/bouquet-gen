import * as fs from "fs";
import path from "path";
import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { generateBouquetSchema, generatePosterSchema } from "@shared/schema";
import {
  generateBouquet,
  extractFlowersFromLineItem,
  parseCharmTypeFromSKU,
} from "./helpers/bouquet-generator";
import { generatePoster } from "./helpers/poster-generator";
import { checkAssetsExist } from "./helpers/svg-utils";
import { FLOWER_FILES } from "./helpers/constants";
import {
  appendGenerationHistory,
  readGenerationHistory,
} from "./helpers/generation-history";
import { getOrderOutputDir } from "./helpers/order-output";
import { isGmailConfigured, sendOrderPosterPdfsEmail } from "./helpers/gmail";
import { getProjectRoot } from "./helpers/path-utils";

/** Resolve position config: if it has base, merge base config with overrides */
function resolveFlowerPosition(
  positions: Record<
    string,
    {
      path?: string;
      base?: string;
      transformCenter?: { x: number; y: number };
      baseRotation?: number;
      flowerPoly?: { x: number; y: number }[];
    }
  >,
  position: string,
) {
  const posConfig = positions[position];
  const resolved = posConfig?.base
    ? { ...positions[posConfig.base], ...posConfig }
    : { ...(posConfig ?? {}) };
  return resolved.path
    ? {
        path: resolved.path,
        transformCenter: resolved.transformCenter ?? { x: 0.5, y: 0.8 },
        baseRotation: resolved.baseRotation ?? 0,
        flowerPoly: resolved.flowerPoly ?? [],
      }
    : null;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  const getLineItemPropertyValue = (
    lineItem: { properties?: Array<{ name?: string; value?: string }> },
    propertyName: string,
  ): string | undefined => {
    if (!lineItem.properties || !Array.isArray(lineItem.properties)) {
      return undefined;
    }
    const match = lineItem.properties.find((p) => p?.name === propertyName);
    const value = match?.value?.trim();
    return value || undefined;
  };

  const toPublicFileUrl = (filePath: string): string | undefined => {
    const normalizedRoot = getProjectRoot().replace(/\\/g, "/");
    const normalizedPath = filePath.replace(/\\/g, "/");
    if (!normalizedPath.startsWith(normalizedRoot)) {
      return undefined;
    }
    const relative = normalizedPath
      .slice(normalizedRoot.length)
      .replace(/^\/+/, "");
    return `/${relative}`;
  };

  app.post("/api/bouquet", async (req: Request, res: Response) => {
    try {
      const parseResult = generateBouquetSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          ok: false,
          error: "Invalid request",
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
      console.error("Bouquet generation error:", error);
      return res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.post("/api/bouquet/from-order", async (req: Request, res: Response) => {
    try {
      const orderData = req.body.order || req.body;

      if (!orderData.line_items || !Array.isArray(orderData.line_items)) {
        return res.status(400).json({
          ok: false,
          error: "No line_items found",
        });
      }

      const orderId = String(orderData.id);
      const orderDir = getOrderOutputDir(orderId);
      fs.mkdirSync(orderDir, { recursive: true });

      const orderDataPath = path.join(
        getProjectRoot(),
        "order_data",
        `${orderId}_${Date.now()}.json`,
      );
      fs.mkdirSync(path.dirname(orderDataPath), { recursive: true });
      fs.writeFileSync(
        orderDataPath,
        JSON.stringify(orderData, null, 2),
        "utf8",
      );

      const forcedReceiver = process.env.TEST_FORCE_RECEIVER?.trim();
      const customerEmail =
        (typeof orderData.email === "string" && orderData.email.trim()) ||
        (typeof orderData.contact_email === "string" &&
          orderData.contact_email.trim()) ||
        "";
      const emailTo = forcedReceiver || customerEmail;
      const orderTitle =
        typeof orderData.name === "string" && orderData.name.trim()
          ? orderData.name.trim()
          : `#${orderData.order_number ?? orderData.id}`;

      const bouquets: Array<{
        lineItemId: number | string;
        filename: string;
        path: string;
        pdfFilename: string;
        pdfPath: string;
      }> = [];
      const pdfAttachments: { path: string; filename: string }[] = [];

      for (const lineItem of orderData.line_items) {
        if (!lineItem.sku?.startsWith("BFB")) continue;

        const flowers = extractFlowersFromLineItem(lineItem);
        if (!flowers || flowers.length === 0) continue;

        const charmShape = parseCharmTypeFromSKU(lineItem.sku);
        const backPersonalText = getLineItemPropertyValue(
          lineItem,
          "Achterkant persoonlijke tekst",
        );
        const title = backPersonalText ?? "";
        const names = "";

        const bouquetResult = await generateBouquet({ flowers, charmShape });
        const svgFilename = `bouquet_${lineItem.id}.svg`;
        const svgPath = path.join(orderDir, svgFilename);
        fs.writeFileSync(svgPath, bouquetResult.svg, "utf8");

        const posterBouquet = await generateBouquet({
          flowers,
          charmShape: "poster",
        });
        const posterResult = await generatePoster(
          { svg: posterBouquet.svg, title, names },
          {
            orderId,
            lineItemId: String(lineItem.id),
            flowers,
            outputDir: orderDir,
          },
        );

        bouquets.push({
          lineItemId: lineItem.id,
          filename: svgFilename,
          path: svgPath,
          pdfFilename: posterResult.filename,
          pdfPath: posterResult.path,
        });
        pdfAttachments.push({
          path: posterResult.path,
          filename: posterResult.filename,
        });

        void appendGenerationHistory({
          kind: "bouquet-line",
          orderId,
          lineItemId: String(lineItem.id),
          filename: svgFilename,
          path: svgPath,
          orderTitle,
          customerEmail,
          lineItemTitle:
            typeof lineItem.title === "string" ? lineItem.title : undefined,
        }).catch((err) =>
          console.error("Generation history (bouquet-line):", err),
        );
        void appendGenerationHistory({
          kind: "poster-line",
          orderId,
          lineItemId: String(lineItem.id),
          filename: posterResult.filename,
          path: posterResult.path,
          orderTitle,
          customerEmail,
          lineItemTitle:
            typeof lineItem.title === "string" ? lineItem.title : undefined,
        }).catch((err) =>
          console.error("Generation history (poster-line):", err),
        );
      }

      if (bouquets.length === 0) {
        return res.status(400).json({
          ok: false,
          error: "No valid birthflower products found",
        });
      }

      const orderLabel = orderTitle;

      let emailSent = false;
      let emailSkippedReason: string | undefined;
      let emailError: string | undefined;

      if (!emailTo) {
        emailSkippedReason = "No customer email on order";
      } else if (!isGmailConfigured()) {
        emailSkippedReason =
          "Gmail SMTP not configured (GMAIL_USER, GMAIL_APP_PASSWORD)";
      } else {
        try {
          await sendOrderPosterPdfsEmail({
            to: emailTo,
            orderLabel,
            attachments: pdfAttachments,
          });
          emailSent = true;
        } catch (e) {
          emailError = e instanceof Error ? e.message : String(e);
          console.error("Order PDF email error:", e);
        }
      }

      return res.json({
        ok: true,
        orderId: orderData.id,
        orderOutputDir: orderDir,
        bouquets,
        emailSent,
        emailSkippedReason,
        emailError,
      });
    } catch (error) {
      console.error("Order processing error:", error);
      return res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.get("/api/flowers", (_req: Request, res: Response) => {
    const positionKeys = Object.keys(
      Object.values(FLOWER_FILES)[0] ?? {},
    ) as string[];
    const flowers: Record<
      string,
      Record<
        string,
        {
          path: string;
          transformCenter: { x: number; y: number };
          baseRotation: number;
          flowerPoly: { x: number; y: number }[];
        }
      >
    > = {};
    const pathsSet = new Set<string>();

    for (const [month, positions] of Object.entries(FLOWER_FILES)) {
      flowers[month] = {};
      for (const pos of positionKeys) {
        const resolved = resolveFlowerPosition(positions, pos);
        if (resolved) {
          flowers[month][pos] = resolved;
          pathsSet.add(resolved.path);
        }
      }
    }

    return res.json({
      flowers,
      paths: Array.from(pathsSet).sort(),
      months: Object.keys(FLOWER_FILES),
      positions: positionKeys,
    });
  });

  app.get("/api/bouquet/status", (_req: Request, res: Response) => {
    return res.json({
      ok: true,
      assetsAvailable: checkAssetsExist(),
      supportedFlowerCounts: [1, 2, 3, 4, 5],
      supportedCharmShapes: ["coin", "oval", "heart", "round", "poster"],
    });
  });

  app.get("/api/order-history", async (_req: Request, res: Response) => {
    try {
      const entries = await readGenerationHistory();
      const byLine = new Map<
        string,
        {
          time: string;
          orderId: string;
          orderTitle?: string;
          customerEmail?: string;
          lineItemId: string;
          lineItemTitle?: string;
          posterUrl?: string;
          svgUrl?: string;
        }
      >();

      for (const entry of entries) {
        if (!entry.lineItemId) continue;
        const key = `${entry.orderId}:${entry.lineItemId}`;
        const existing = byLine.get(key);
        const nextTime = existing?.time ?? entry.at;
        const row = existing ?? {
          time: nextTime,
          orderId: entry.orderId,
          orderTitle: entry.orderTitle,
          customerEmail: entry.customerEmail,
          lineItemId: entry.lineItemId,
          lineItemTitle: entry.lineItemTitle,
          posterUrl: undefined,
          svgUrl: undefined,
        };

        if (entry.at > row.time) {
          row.time = entry.at;
        }
        if (!row.orderTitle && entry.orderTitle)
          row.orderTitle = entry.orderTitle;
        if (!row.customerEmail && entry.customerEmail) {
          row.customerEmail = entry.customerEmail;
        }
        if (!row.lineItemTitle && entry.lineItemTitle) {
          row.lineItemTitle = entry.lineItemTitle;
        }

        const fileUrl = toPublicFileUrl(entry.path);
        if (entry.kind === "poster-line" && fileUrl) row.posterUrl = fileUrl;
        if (entry.kind === "bouquet-line" && fileUrl) row.svgUrl = fileUrl;

        byLine.set(key, row);
      }

      const rows = Array.from(byLine.values())
        .sort((a, b) => b.time.localeCompare(a.time))
        .slice(0, 500);

      return res.json({ ok: true, rows });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.post("/api/poster", async (req: Request, res: Response) => {
    try {
      const parseResult = generatePosterSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          ok: false,
          error: "Invalid request",
          details: parseResult.error.errors,
        });
      }

      const { flowers, title, names } = parseResult.data;
      const bouquetResult = await generateBouquet({
        flowers,
        charmShape: "poster",
      });
      const posterResult = await generatePoster(
        { svg: bouquetResult.svg, title, names },
        { flowers },
      );

      return res.json({
        ok: true,
        filename: posterResult.filename,
        path: posterResult.path,
        pdf: posterResult.buffer.toString("base64"),
      });
    } catch (error) {
      console.error("Poster generation error:", error);
      return res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  return httpServer;
}
