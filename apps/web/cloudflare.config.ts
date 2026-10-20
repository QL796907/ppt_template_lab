import { bindings, defineConfig, defineWorker } from "cf/config";

const domain = process.env.WEB_DOMAIN?.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");

export default defineConfig({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || undefined,
  worker: defineWorker({
    name: "ppt-template-lab",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-10-20",
    compatibilityFlags: ["nodejs_compat"],
    workersDev: true,
    ...(domain ? { domains: [domain] } : {}),
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ASSETS: bindings.assets(),
    },
  }),
});
