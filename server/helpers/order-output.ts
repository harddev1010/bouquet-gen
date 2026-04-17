import path from "path";
import { getProjectRoot } from "./path-utils";

/** All files for one Shopify order (SVG + PDF) live here */
export function getOrderOutputDir(orderId: string): string {
  return path.join(getProjectRoot(), "generated_orders", String(orderId));
}
