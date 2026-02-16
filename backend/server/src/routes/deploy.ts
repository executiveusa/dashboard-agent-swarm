/**
 * Deploy management routes
 * Wraps the Coolify API client for frontend consumption
 */
import { Router, Request, Response } from 'express';
import {
  listServers,
  listApplications,
  getApplication,
  deployApplication,
  restartApplication,
  stopApplication,
  getDeploymentLogs,
  validateServer,
} from '../services/coolifyClient';

export function createDeployRoutes(): Router {
  const router = Router();

  /**
   * GET /api/deploy/servers
   * List all Coolify servers
   */
  router.get('/servers', async (_req: Request, res: Response) => {
    try {
      const servers = await listServers();
      res.json({ servers });
    } catch (err: any) {
      res.status(502).json({ error: 'Failed to reach Coolify', detail: err.message });
    }
  });

  /**
   * GET /api/deploy/servers/:uuid/validate
   * Check if a server is reachable
   */
  router.get('/servers/:uuid/validate', async (req: Request, res: Response) => {
    try {
      const reachable = await validateServer(req.params.uuid);
      res.json({ uuid: req.params.uuid, reachable });
    } catch (err: any) {
      res.status(502).json({ error: err.message });
    }
  });

  /**
   * GET /api/deploy/applications
   * List all Coolify applications
   */
  router.get('/applications', async (_req: Request, res: Response) => {
    try {
      const apps = await listApplications();
      res.json({ applications: apps });
    } catch (err: any) {
      res.status(502).json({ error: 'Failed to reach Coolify', detail: err.message });
    }
  });

  /**
   * GET /api/deploy/applications/:uuid
   * Get a single application's details
   */
  router.get('/applications/:uuid', async (req: Request, res: Response) => {
    try {
      const app = await getApplication(req.params.uuid);
      res.json(app);
    } catch (err: any) {
      res.status(502).json({ error: err.message });
    }
  });

  /**
   * POST /api/deploy/applications/:uuid/deploy
   * Trigger a deployment
   */
  router.post('/applications/:uuid/deploy', async (req: Request, res: Response) => {
    try {
      const result = await deployApplication(req.params.uuid, req.body?.force === true);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/deploy/applications/:uuid/restart
   * Restart an application
   */
  router.post('/applications/:uuid/restart', async (req: Request, res: Response) => {
    try {
      const result = await restartApplication(req.params.uuid);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/deploy/applications/:uuid/stop
   * Stop an application
   */
  router.post('/applications/:uuid/stop', async (req: Request, res: Response) => {
    try {
      const result = await stopApplication(req.params.uuid);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/deploy/deployments/:uuid/logs
   * Get deployment logs
   */
  router.get('/deployments/:uuid/logs', async (req: Request, res: Response) => {
    try {
      const logs = await getDeploymentLogs(req.params.uuid);
      res.json({ logs });
    } catch (err: any) {
      res.status(502).json({ error: err.message });
    }
  });

  return router;
}
