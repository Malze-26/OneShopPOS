/// <reference path="./.sst/platform/config.d.ts" />

/**
 * POS — one deployment serving every tenant.
 *
 * Each shop reaches its own till at <tenant>.pos.allinoneshop.store. The tenant
 * is the FIRST label deliberately: a wildcard certificate matches exactly one
 * label, so *.pos.allinoneshop.store covers every tenant at once. Had it been
 * pos.<tenant>.allinoneshop.store, each new shop would need its own certificate
 * before it could serve traffic.
 *
 * A Router fans out by path — /api/* to the Express API, the rest to Next —
 * so both share a hostname and the API sees the tenant in the Host header.
 */

/** Reads a value from an .env at deploy time. Keeps secrets out of git. */
function env(key: string, file = "backend/.env"): string {
  const fs = require("fs");
  const line = fs.readFileSync(file, "utf8")
    .split("\n")
    .find((l: string) => l.startsWith(key + "="));
  if (!line) throw new Error(`${key} missing from backend/.env`);
  return line.slice(key.length + 1).trim();
}

const ZONE = "Z04324423NALZ4VWGZ6FR";
const POS_CERT = "arn:aws:acm:us-east-1:293528979228:certificate/2c268499-1105-4ab6-8ae7-4c8c50698020";

/** Wildcard cert for *.allinoneshop.store, used by the admin console. */
const ROOT_CERT = "arn:aws:acm:us-east-1:293528979228:certificate/e970e2b6-8ee2-44bc-99c9-208daebe46a9";

export default $config({
  app(input) {
    return {
      name: "oneshop-pos",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: input?.stage === "production",
      home: "aws",
      providers: { aws: { region: "ap-south-1" } },
    };
  },
  async run() {
    const api = new sst.aws.Function("PosApi", {
      handler: "backend/src/lambda.handler",
      runtime: "nodejs22.x",
      memory: "512 MB",
      timeout: "30 seconds",
      url: { cors: false },
      environment: {
        NODE_ENV: "production",
        MONGODB_URI: env("MONGODB_URI"),
        JWT_SECRET: env("JWT_SECRET"),
        JWT_EXPIRES_IN: "7d",
        TENANT_FACTORY_DB: "oneshop-tenant-factory",
        // Tenants are subdomains, so CORS is validated against this suffix.
        PLATFORM_DOMAIN: "allinoneshop.store",
        // CloudFront rewrites Host; the tenant subdomain arrives here.
        TRUST_PROXY_HOST: "true",
        S3_BUCKET: env("S3_BUCKET"),
        ASSET_BASE_URL: "https://cdn.allinoneshop.store",
        FRONTEND_URL: "https://pos.allinoneshop.store",
      },
      permissions: [
        { actions: ["s3:PutObject", "s3:DeleteObject"], resources: [`arn:aws:s3:::${env("S3_BUCKET")}/*`] },
      ],
    });

    const router = new sst.aws.Router("PosRouter", {
      domain: {
        name: "pos.allinoneshop.store",
        aliases: ["*.pos.allinoneshop.store"],
        cert: POS_CERT,
        dns: sst.aws.dns({ zone: ZONE }),
      },
    });

    router.route("/api", api.url);

    new sst.aws.Nextjs("Pos", {
      path: "frontend",
      router: { instance: router },
      environment: { NEXT_PUBLIC_API_URL: "/api" },
    });

    // ── Tenant Factory (super admin console) ────────────────────────────────
    const FACTORY_ENV = "oneshop-tenant-factory/backend/.env";

    const adminApi = new sst.aws.Function("FactoryApi", {
      handler: "oneshop-tenant-factory/backend/src/lambda.handler",
      runtime: "nodejs22.x",
      memory: "512 MB",
      timeout: "30 seconds",
      url: { cors: false },
      environment: {
        NODE_ENV: "production",
        MONGODB_URI: env("MONGODB_URI", FACTORY_ENV),
        JWT_SECRET: env("JWT_SECRET", FACTORY_ENV),
        JWT_EXPIRES_IN: "7d",
        FRONTEND_URL: "https://admin.allinoneshop.store",
      },
    });

    const adminRouter = new sst.aws.Router("FactoryRouter", {
      domain: {
        name: "admin.allinoneshop.store",
        cert: ROOT_CERT,
        dns: sst.aws.dns({ zone: ZONE }),
      },
    });

    adminRouter.route("/api", adminApi.url);

    new sst.aws.Nextjs("Factory", {
      path: "oneshop-tenant-factory/frontend",
      router: { instance: adminRouter },
      environment: { NEXT_PUBLIC_API_URL: "/api" },
    });

    return { api: api.url, url: router.url, admin: adminRouter.url };
  },
});
