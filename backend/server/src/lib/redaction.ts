/**
 * Redaction middleware for Cynthia telemetry
 * Removes sensitive data (API keys, tokens, secrets) from event payloads
 */

// Patterns to detect sensitive data
const SENSITIVE_PATTERNS = {
  // API Keys and tokens
  apiKey: /\b([a-zA-Z0-9_-]*(?:api[-_]?key|token|secret|password|auth|credential)[a-zA-Z0-9_-]*)\s*[:=]\s*["']?([^"'\s,}]+)["']?/gi,
  // Bearer tokens
  bearer: /Bearer\s+[a-zA-Z0-9_\-\.]+/gi,
  // JWT tokens
  jwt: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/gi,
  // AWS access keys
  awsAccessKey: /AKIA[0-9A-Z]{16}/gi,
  // Generic secrets (40+ hex chars)
  hexSecret: /\b[a-f0-9]{40,}\b/gi,
  // Base64 encoded (likely secrets if long enough)
  base64: /(?:[A-Za-z0-9+/]{4}){10,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?/g,
};

// Keys that commonly contain sensitive data
const SENSITIVE_KEYS = new Set([
  'apiKey',
  'api_key',
  'apikey',
  'token',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'secret',
  'secretKey',
  'secret_key',
  'password',
  'passwd',
  'pwd',
  'credential',
  'credentials',
  'auth',
  'authorization',
  'authToken',
  'auth_token',
  'privateKey',
  'private_key',
  'clientSecret',
  'client_secret',
  'sessionId',
  'session_id',
]);

/**
 * Redacts sensitive strings using pattern matching
 */
function redactString(value: string): string {
  let redacted = value;

  // Apply each pattern
  Object.entries(SENSITIVE_PATTERNS).forEach(([patternName, pattern]) => {
    redacted = redacted.replace(pattern, (match, ...groups) => {
      // For key-value patterns, keep the key but redact the value
      if (groups.length >= 2) {
        return `${groups[0]}=[REDACTED]`;
      }
      // For token patterns, redact entirely
      return '[REDACTED]';
    });
  });

  return redacted;
}

/**
 * Recursively redacts sensitive data from objects
 */
function redactObject(obj: any, depth = 0): any {
  // Prevent infinite recursion
  if (depth > 10) {
    return '[MAX_DEPTH_EXCEEDED]';
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => redactObject(item, depth + 1));
  }

  // Handle objects
  if (typeof obj === 'object') {
    const redacted: any = {};

    for (const [key, value] of Object.entries(obj)) {
      // Check if key is sensitive
      if (SENSITIVE_KEYS.has(key) || SENSITIVE_KEYS.has(key.toLowerCase())) {
        redacted[key] = '[REDACTED]';
        continue;
      }

      // Recursively redact nested objects/arrays
      if (typeof value === 'object' && value !== null) {
        redacted[key] = redactObject(value, depth + 1);
      } else if (typeof value === 'string') {
        redacted[key] = redactString(value);
      } else {
        redacted[key] = value;
      }
    }

    return redacted;
  }

  // Handle strings
  if (typeof obj === 'string') {
    return redactString(obj);
  }

  // Return primitives as-is
  return obj;
}

/**
 * Redacts sensitive data from telemetry event
 */
export function redactTelemetryEvent(event: {
  session_id: string;
  agent: string;
  type: string;
  summary?: string;
  data: any;
  timestamp?: string;
}): typeof event {
  return {
    ...event,
    summary: event.summary ? redactString(event.summary) : undefined,
    data: redactObject(event.data),
  };
}

/**
 * Express middleware to redact request bodies
 */
export function redactionMiddleware(req: any, res: any, next: any) {
  if (req.body) {
    req.body = redactObject(req.body);
  }
  next();
}

/**
 * Validates that required admin token header is present
 */
export function requireAdminToken(req: any, res: any, next: any) {
  const adminToken = process.env.ADMIN_TOKEN || 'dev-admin-token-change-in-production';
  const providedToken = req.headers['x-admin-token'];

  if (!providedToken || providedToken !== adminToken) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid X-Admin-Token header required',
    });
  }

  next();
}
