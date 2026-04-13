const ACCESS_BASE = (import.meta.env.VITE_ACCESS_KERNEL_BASE as string | undefined) || "/api/access-kernel";

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(`${ACCESS_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || `Request failed: ${resp.status}`);
  }
  return resp.json() as Promise<T>;
}

export type Grant = {
  id: string;
  principal: string;
  principal_type: string;
  work_item_id: string;
  resource: string;
  action: string;
  status: string;
  created_at: string;
};

export const accessKernelApi = {
  health: () => call<{ status: string; service: string; policy_hash: string; time: string }>("/health"),
  loginMock: (principal: string) => call<{ session_id: string; expires_at: string }>("/login/mock", { method: "POST", body: JSON.stringify({ principal, principal_type: "human", duration_minutes: 60 }) }),
  uploadSecret: (body: { principal: string; work_item_id: string; name: string; payload: Record<string, string> }) => call<{ secret_id: string; preview: Record<string, string> }>("/secrets/upload", { method: "POST", body: JSON.stringify(body) }),
  listGrants: () => call<{ items: Grant[] }>("/grants/list"),
  requestGrant: (body: { principal: string; work_item_id: string; resource: string; action: string; duration_minutes: number }) => call<{ grant_id: string; status: string }>("/grants/request", { method: "POST", body: JSON.stringify({ ...body, principal_type: "human" }) }),
  approveGrant: (grantId: string, approver: string, workItemId: string) => call("/grants/approve", { method: "POST", body: JSON.stringify({ grant_id: grantId, approver, work_item_id: workItemId }) }),
  revokeGrant: (grantId: string, actor: string, workItemId: string) => call("/grants/revoke", { method: "POST", body: JSON.stringify({ grant_id: grantId, actor, work_item_id: workItemId }) }),
  exportAudit: () => call<{ data: string }>("/audit/export?format=jsonl"),
  voiceSimulate: (body: Record<string, unknown>) => call("/voice/dev/simulate", { method: "POST", body: JSON.stringify(body) }),
};
