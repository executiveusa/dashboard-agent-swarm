import { randomUUID } from 'node:crypto';
import { LocalRunnerConfig, ToolType } from './config.js';

export class ResourceExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResourceExceededError';
  }
}

export interface Session {
  id: string;
  type: ToolType;
  createdAt: number;
  lastAccessed: number;
  executions: number;
}

export class SessionManager {
  private sessions = new Map<string, Session>();
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor(private readonly config: LocalRunnerConfig) {
    this.cleanupInterval = setInterval(() => this.prune(), 60_000).unref();
  }

  stop(): void {
    clearInterval(this.cleanupInterval);
  }

  ensureSession(id: string | undefined, type: ToolType): Session {
    const sessionId = id ?? randomUUID();
    let session = this.sessions.get(sessionId);

    if (!session) {
      if (this.sessions.size >= this.config.maxSessions) {
        throw new ResourceExceededError('Maximum concurrent sessions reached');
      }
      session = {
        id: sessionId,
        type,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        executions: 0,
      };
      this.sessions.set(sessionId, session);
    } else if (session.type !== type) {
      throw new Error(`Session ${sessionId} was created for ${session.type} workloads`);
    }

    this.assertActive(session);
    session.lastAccessed = Date.now();
    return session;
  }

  registerExecution(session: Session): void {
    session.executions += 1;
    if (session.executions > this.config.sessionMaxExecutions) {
      throw new ResourceExceededError('Session execution quota exceeded');
    }
  }

  complete(session: Session): void {
    session.lastAccessed = Date.now();
  }

  private assertActive(session: Session): void {
    const now = Date.now();
    if (now - session.createdAt > this.config.sessionLifetimeMs) {
      this.sessions.delete(session.id);
      throw new ResourceExceededError('Session lifetime exceeded');
    }
    if (now - session.lastAccessed > this.config.sessionIdleMs) {
      this.sessions.delete(session.id);
      throw new ResourceExceededError('Session idle timeout exceeded');
    }
  }

  private prune(): void {
    const now = Date.now();
    for (const session of this.sessions.values()) {
      if (now - session.createdAt > this.config.sessionLifetimeMs || now - session.lastAccessed > this.config.sessionIdleMs) {
        this.sessions.delete(session.id);
      }
    }
  }
}
