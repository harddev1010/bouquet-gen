# Bouquet Generator

Generates SVG bouquets from Dutch birth month flowers. Each bouquet is composed of 1–5 flower SVGs arranged around a central binding point, with configurable charm shapes (coin, round, oval, heart).

## Prerequisites

- **Node.js** >= 18
- **npm**

## Setup

```bash
npm install
```

## Running

### Development (with auto-reload)

```bash
npm run dev:watch
```

### Development (single run)

```bash
npm run dev
```

The server starts on **http://localhost:8000**. Open it in a browser to use the demo UI.

### Production

```bash
npm run build
npm start
```

## API Endpoints

### `POST /api/bouquet`

Generate a bouquet from a list of flowers.

```json
{
  "flowers": ["Februari", "April", "Augustus"],
  "charmShape": "coin"
}
```

- `flowers` — array of 1–5 Dutch month names: `Januari`, `Februari`, `Maart`, `April`, `Mei`, `Juni`, `Juli`, `Augustus`, `September`, `Oktober`, `November`, `December`
- `charmShape` — optional, one of `coin`, `round`, `oval`, `heart` (default: `coin`)

Returns `{ ok, filename, path, svg }`.

### `POST /api/bouquet/from-order`

Generate bouquets from a Shopify-style order payload. Expects `line_items` with SKUs starting with `BFB` and flower properties named `Voorkant geboortebloem 1`, `2`, etc.

### `GET /api/flowers`

Returns all available flower configurations, SVG paths, months, and positions.

### `GET /api/bouquet/status`

Health check — returns supported flower counts and charm shapes.

## Testing with the Demo UI

1. Start the server (`npm run dev:watch`)
2. Open **http://localhost:8000**
3. Enter comma-separated Dutch month names (e.g. `Februari,April,Augustus`)
4. Select a charm shape
5. Click **Generate**

### Test flower combinations

Some example inputs to try (from `test.txt`):

```
Februari,Maart,Februari
Januari,Mei,Juni
Mei,Oktober
Februari,Maart,April,Juni,December
April,Mei,Augustus,Oktober,December
```

## Testing with cURL

```bash
curl -X POST http://localhost:8000/api/bouquet \
  -H "Content-Type: application/json" \
  -d '{"flowers":["Februari","April","Augustus"],"charmShape":"coin"}'
```

## Project Structure

```
├── assets/flowers/       # SVG flower assets (per month and position)
├── public/
│   └── index.html        # Demo UI
├── server/
│   ├── index.ts          # Express server entry
│   ├── routes.ts         # API route handlers
│   └── helpers/
│       ├── bouquet-generator.ts  # Orchestrates bouquet generation
│       ├── svg-utils.ts          # SVG parsing, transforms, collision detection
│       ├── layout.ts             # Flower positioning and angle layout
│       ├── constants.ts          # Layout angles, scales, charm configs
│       ├── flower_constants.ts   # Per-flower SVG file mappings and polygons
│       └── types.ts              # TypeScript interfaces
├── shared/
│   └── schema.ts         # Zod validation schemas
└── script/
    └── build.ts          # Production build script (esbuild)
```
