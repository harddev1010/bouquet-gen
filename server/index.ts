import express, { type Request, Response, NextFunction } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { getProjectRoot } from './helpers/path-utils';
import { registerRoutes } from './routes';
import { createServer } from 'http';

dotenv.config({ path: path.join(getProjectRoot(), '.env') });

const app = express();
const httpServer = createServer(app);

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));
app.use('/flowers', express.static(path.join(getProjectRoot(), 'assets/flowers')));
app.use(
  '/generated_orders',
  express.static(path.join(getProjectRoot(), 'generated_orders')),
);

export function log(message: string, _source = 'express') {
  const formattedTime = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  console.log(`${formattedTime} [express] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on('finish', () => {
    const duration = Date.now() - start;
    if (path.startsWith('/api')) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    await registerRoutes(httpServer, app);

    app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || 'Internal Server Error';

      console.error('Internal Server Error:', err);

      if (res.headersSent) {
        return next(err);
      }

      return res.status(status).json({ message });
    });

    const port = parseInt(process.env.PORT || '8080', 10);
    // Listen on the same server instance passed to registerRoutes (avoid a second implicit server from app.listen)
    httpServer.listen(port, () => {
      log(`Server running on http://localhost:${port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
