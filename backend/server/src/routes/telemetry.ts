import type { Request, Response } from "express";
import { z } from "zod";

import type { Database } from "../lib/db";
import { createSseConnection } from "../lib/sse";
import type { RuntimeConfig } from "../lib/config";
import { logger } from "../lib/logger";
import { redactTelemetryEvent } from "../lib/redaction";
import { attachStreamCleanup } from "./shared";

// Validation schemas
const telemetryEventSchema = z.object({
  session_id: z.string().min(1),
  agent: z.string().default("cynthia"),
  type: z.string().min(1),
  summary: z.string().optional(),
  data: z.record(z.any()).default({}),
  timestamp: z.string().datetime().optional(),
});

const sessionMetaSchema = z.object({
  session_id: z.string().min(1),
  agent: z.string().default("cynthia"),
  mode: z.string().optional(),
  goal: z.string().optional(),
  model: z.string().optional(),
  status: z.enum(["active", "completed", "failed", "paused"]).optional(),
  metadata: z.record(z.any()).default({}),
});

const listSessionsParamsSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  agent: z.string().optional(),
  status: z.enum(["active", "completed", "failed", "paused"]).optional(),
});

const listEventsParamsSchema = z.object({
  limit: z.coerce.number().min(1).max(500).default(100),
  session_id: z.string().optional(),
  agent: z.string().optional(),
  type: z.string().optional(),
});

export function createTelemetryRoutes(db: Database, config: RuntimeConfig) {
  /**
   * POST /telemetry/event
   * Receives a telemetry event from Cynthia agent
   */
  const postEvent = async (req: Request, res: Response) => {
    try {
      // Validate and parse the event
      const rawEvent = telemetryEventSchema.parse(req.body);

      // Redact sensitive data
      const event = redactTelemetryEvent(rawEvent);

      // Ensure session exists (upsert)
      await db.query(
        `INSERT INTO agent_sessions (session_id, agent, status, metadata)
         VALUES ($1, $2, 'active', '{}'::jsonb)
         ON CONFLICT (session_id) DO UPDATE
         SET updated_at = now()`,
        [event.session_id, event.agent]
      );

      // Insert event
      const result = await db.query(
        `INSERT INTO agent_events (session_id, agent, event_type, summary, data, timestamp)
         VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, now()))
         RETURNING id, session_id, agent, event_type, summary, data, timestamp, created_at`,
        [
          event.session_id,
          event.agent,
          event.type,
          event.summary || null,
          JSON.stringify(event.data),
          event.timestamp || null,
        ]
      );

      const insertedEvent = result.rows[0];

      res.status(201).json({
        success: true,
        event: insertedEvent,
      });
    } catch (error) {
      logger.error({ error, body: req.body }, "Failed to process telemetry event");

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: "Validation error",
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  };

  /**
   * POST /telemetry/session
   * Updates session metadata (mode, goal, model, status)
   */
  const postSession = async (req: Request, res: Response) => {
    try {
      const session = sessionMetaSchema.parse(req.body);

      const result = await db.query(
        `INSERT INTO agent_sessions (session_id, agent, mode, goal, model, status, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (session_id) DO UPDATE
         SET mode = COALESCE($3, agent_sessions.mode),
             goal = COALESCE($4, agent_sessions.goal),
             model = COALESCE($5, agent_sessions.model),
             status = COALESCE($6, agent_sessions.status),
             metadata = COALESCE($7, agent_sessions.metadata),
             updated_at = now()
         RETURNING id, session_id, agent, mode, goal, model, status, started_at, ended_at, metadata, created_at, updated_at`,
        [
          session.session_id,
          session.agent,
          session.mode || null,
          session.goal || null,
          session.model || null,
          session.status || "active",
          JSON.stringify(session.metadata),
        ]
      );

      res.status(200).json({
        success: true,
        session: result.rows[0],
      });
    } catch (error) {
      logger.error({ error, body: req.body }, "Failed to update session");

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: "Validation error",
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  };

  /**
   * GET /telemetry/stream
   * SSE stream of real-time events
   */
  const streamEvents = async (req: Request, res: Response) => {
    const connection = createSseConnection(res, {
      heartbeatMs: config.SSE_HEARTBEAT_INTERVAL_MS,
    });

    connection.send({ type: "ready", timestamp: new Date().toISOString() });

    const release = await db.listen("agent_events_changes", (payload) => {
      try {
        const event = JSON.parse(payload);
        connection.send({ type: "event", data: event });
      } catch (error) {
        logger.error({ error, payload }, "Failed to parse agent event notification");
      }
    });

    await attachStreamCleanup({ res, release, connection });
  };

  /**
   * GET /telemetry/sessions
   * List agent sessions with pagination and filtering
   */
  const listSessions = async (req: Request, res: Response) => {
    try {
      const params = listSessionsParamsSchema.parse(req.query);

      let query = `
        SELECT
          id, session_id, agent, mode, goal, model, status,
          started_at, ended_at, metadata, created_at, updated_at,
          (SELECT COUNT(*) FROM agent_events WHERE agent_events.session_id = agent_sessions.session_id) as event_count
        FROM agent_sessions
        WHERE 1=1
      `;
      const queryParams: any[] = [];

      if (params.agent) {
        queryParams.push(params.agent);
        query += ` AND agent = $${queryParams.length}`;
      }

      if (params.status) {
        queryParams.push(params.status);
        query += ` AND status = $${queryParams.length}`;
      }

      query += ` ORDER BY started_at DESC`;

      queryParams.push(params.limit);
      query += ` LIMIT $${queryParams.length}`;

      const result = await db.query(query, queryParams);

      res.json({
        success: true,
        sessions: result.rows,
        count: result.rows.length,
      });
    } catch (error) {
      logger.error({ error }, "Failed to list sessions");

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: "Validation error",
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  };

  /**
   * GET /telemetry/sessions/:id/events
   * Get events for a specific session (session replay)
   */
  const getSessionEvents = async (req: Request, res: Response) => {
    try {
      const { id: sessionId } = req.params;
      const params = listEventsParamsSchema.parse(req.query);

      // Get session info
      const sessionResult = await db.query(
        `SELECT id, session_id, agent, mode, goal, model, status,
                started_at, ended_at, metadata, created_at, updated_at
         FROM agent_sessions
         WHERE session_id = $1`,
        [sessionId]
      );

      if (sessionResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Session not found",
        });
      }

      // Get events for this session
      const eventsResult = await db.query(
        `SELECT id, session_id, agent, event_type, summary, data, timestamp, created_at
         FROM agent_events
         WHERE session_id = $1
         ORDER BY timestamp ASC
         LIMIT $2`,
        [sessionId, params.limit]
      );

      res.json({
        success: true,
        session: sessionResult.rows[0],
        events: eventsResult.rows,
        count: eventsResult.rows.length,
      });
    } catch (error) {
      logger.error({ error }, "Failed to get session events");

      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  };

  /**
   * GET /telemetry/events
   * List all recent events with optional filtering
   */
  const listEvents = async (req: Request, res: Response) => {
    try {
      const params = listEventsParamsSchema.parse(req.query);

      let query = `
        SELECT
          e.id, e.session_id, e.agent, e.event_type, e.summary, e.data, e.timestamp, e.created_at,
          s.mode, s.goal, s.model, s.status
        FROM agent_events e
        LEFT JOIN agent_sessions s ON e.session_id = s.session_id
        WHERE 1=1
      `;
      const queryParams: any[] = [];

      if (params.session_id) {
        queryParams.push(params.session_id);
        query += ` AND e.session_id = $${queryParams.length}`;
      }

      if (params.agent) {
        queryParams.push(params.agent);
        query += ` AND e.agent = $${queryParams.length}`;
      }

      if (params.type) {
        queryParams.push(params.type);
        query += ` AND e.event_type = $${queryParams.length}`;
      }

      query += ` ORDER BY e.timestamp DESC`;

      queryParams.push(params.limit);
      query += ` LIMIT $${queryParams.length}`;

      const result = await db.query(query, queryParams);

      res.json({
        success: true,
        events: result.rows,
        count: result.rows.length,
      });
    } catch (error) {
      logger.error({ error }, "Failed to list events");

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: "Validation error",
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  };

  return {
    postEvent,
    postSession,
    streamEvents,
    listSessions,
    getSessionEvents,
    listEvents,
  };
}
