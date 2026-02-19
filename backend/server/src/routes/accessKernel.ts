import { Router } from "express";

export function createAccessKernelRoutes() {
  const router = Router();
  const base = process.env.ACCESS_KERNEL_BASE_URL || "http://localhost:8090/v1";
  const voiceBase = process.env.VOICE_GATEWAY_BASE_URL || "http://localhost:8091/v1";

  router.get("/health", async (_req, res) => {
    const out = await fetch(`${base}/health`);
    res.status(out.status).json(await out.json());
  });

  router.post("/login/mock", async (req, res) => {
    const out = await fetch(`${base}/login/mock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    res.status(out.status).json(await out.json());
  });

  router.post("/secrets/upload", async (req, res) => {
    const out = await fetch(`${base}/secrets/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    res.status(out.status).json(await out.json());
  });

  router.get("/grants/list", async (_req, res) => {
    const out = await fetch(`${base}/grants/list`);
    res.status(out.status).json(await out.json());
  });

  router.post("/grants/request", async (req, res) => {
    const out = await fetch(`${base}/grants/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    res.status(out.status).json(await out.json());
  });

  router.post("/grants/approve", async (req, res) => {
    const out = await fetch(`${base}/grants/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    res.status(out.status).json(await out.json());
  });

  router.post("/grants/revoke", async (req, res) => {
    const out = await fetch(`${base}/grants/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    res.status(out.status).json(await out.json());
  });

  router.get("/audit/export", async (_req, res) => {
    const out = await fetch(`${base}/audit/export?format=jsonl`);
    res.status(out.status).json(await out.json());
  });

  router.post("/voice/dev/simulate", async (req, res) => {
    const out = await fetch(`${voiceBase}/voice/dev/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    res.status(out.status).json(await out.json());
  });

  return router;
}
