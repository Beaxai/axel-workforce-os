import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan("combined"));
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
// Credentialed CORS must use an explicit origin allowlist — never reflect
// arbitrary origins. Allow the Replit dev preview domain, any published
// domains, and same-origin / non-browser requests (no Origin header).
const allowedOrigins = new Set<string>();
for (const d of (process.env.REPLIT_DOMAINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)) {
  allowedOrigins.add(`https://${d}`);
}
if (process.env.REPLIT_DEV_DOMAIN) {
  allowedOrigins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
}
app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowedOrigins.has(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
  }),
);

import webhooksRouter from "./routes/webhooks";
app.use("/webhooks", webhooksRouter);

// Preserve the exact raw bytes for webhook signature verification (Svix HMAC
// must be computed over the bytes as sent, not a re-serialization).
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf.toString("utf8");
    },
  }),
);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api", router);

export default app;
