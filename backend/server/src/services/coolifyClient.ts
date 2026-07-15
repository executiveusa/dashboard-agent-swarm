/**
 * Coolify API client for managing deployments
 * Used by the deploy script and DeployManager page
 *
 * Coolify docs: https://coolify.io/docs/api-reference
 */

const COOLIFY_BASE = process.env.COOLIFY_URL || 'http://localhost:8000';
const COOLIFY_TOKEN = process.env.COOLIFY_API_TOKEN || '';

interface CoolifyHeaders {
  'Content-Type': string;
  'Authorization': string;
}

function headers(): CoolifyHeaders {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${COOLIFY_TOKEN}`,
  };
}

export interface CoolifyApplication {
  id: number;
  uuid: string;
  name: string;
  fqdn: string;
  status: string;
  git_repository: string;
  git_branch: string;
  build_pack: string;
  created_at: string;
  updated_at: string;
}

export interface CoolifyServer {
  id: number;
  uuid: string;
  name: string;
  ip: string;
  user: string;
  port: number;
  is_reachable: boolean;
  is_usable: boolean;
}

export interface DeployResult {
  success: boolean;
  message: string;
  deployment_uuid?: string;
}

/**
 * List all servers
 */
export async function listServers(): Promise<CoolifyServer[]> {
  const res = await fetch(`${COOLIFY_BASE}/api/v1/servers`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error(`Coolify API error: ${res.status} ${res.statusText}`);
  return res.json();
}

/**
 * List all applications
 */
export async function listApplications(): Promise<CoolifyApplication[]> {
  const res = await fetch(`${COOLIFY_BASE}/api/v1/applications`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error(`Coolify API error: ${res.status} ${res.statusText}`);
  return res.json();
}

/**
 * Get application details by UUID
 */
export async function getApplication(uuid: string): Promise<CoolifyApplication> {
  const res = await fetch(`${COOLIFY_BASE}/api/v1/applications/${uuid}`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error(`Coolify API error: ${res.status} ${res.statusText}`);
  return res.json();
}

/**
 * Deploy an application by UUID
 */
export async function deployApplication(uuid: string, force = false): Promise<DeployResult> {
  const res = await fetch(`${COOLIFY_BASE}/api/v1/applications/${uuid}/deploy`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ force }),
  });
  if (!res.ok) {
    const errText = await res.text();
    return { success: false, message: `Deploy failed: ${res.status} — ${errText}` };
  }
  const data = await res.json();
  return {
    success: true,
    message: 'Deployment triggered',
    deployment_uuid: data.deployment_uuid || data.uuid,
  };
}

/**
 * Restart an application by UUID
 */
export async function restartApplication(uuid: string): Promise<DeployResult> {
  const res = await fetch(`${COOLIFY_BASE}/api/v1/applications/${uuid}/restart`, {
    method: 'POST',
    headers: headers(),
  });
  if (!res.ok) {
    const errText = await res.text();
    return { success: false, message: `Restart failed: ${res.status} — ${errText}` };
  }
  return { success: true, message: 'Restart triggered' };
}

/**
 * Stop an application by UUID
 */
export async function stopApplication(uuid: string): Promise<DeployResult> {
  const res = await fetch(`${COOLIFY_BASE}/api/v1/applications/${uuid}/stop`, {
    method: 'POST',
    headers: headers(),
  });
  if (!res.ok) {
    const errText = await res.text();
    return { success: false, message: `Stop failed: ${res.status} — ${errText}` };
  }
  return { success: true, message: 'Application stopped' };
}

/**
 * Get deployment logs by deployment UUID
 */
export async function getDeploymentLogs(deploymentUuid: string): Promise<string> {
  const res = await fetch(`${COOLIFY_BASE}/api/v1/deployments/${deploymentUuid}`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error(`Coolify API error: ${res.status}`);
  const data = await res.json();
  return data.logs || '';
}

/**
 * Check server reachability
 */
export async function validateServer(serverUuid: string): Promise<boolean> {
  try {
    const res = await fetch(`${COOLIFY_BASE}/api/v1/servers/${serverUuid}/validate`, {
      headers: headers(),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.is_reachable === true;
  } catch {
    return false;
  }
}
