import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { accessKernelApi, type Grant } from "@/services/accessKernelApi";

export default function AccessGrants() {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [role, setRole] = useState<"admin" | "user">("admin");
  const [resource, setResource] = useState("github");
  const [action, setAction] = useState("write");
  const [workItemId, setWorkItemId] = useState("WI-UI-2001");

  const load = async () => {
    const data = await accessKernelApi.listGrants();
    setGrants(data.items);
  };

  useEffect(() => { load(); }, []);

  const requestGrant = async () => {
    await accessKernelApi.requestGrant({ principal: "dashboard-user", work_item_id: workItemId, resource, action, duration_minutes: 30 });
    await load();
  };

  const approve = async (id: string) => {
    await accessKernelApi.approveGrant(id, "dashboard-admin", workItemId);
    await load();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Grants</h2>
      <Card>
        <CardHeader><CardTitle>Request Grant</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input value={role} onChange={(e) => setRole(e.target.value === "admin" ? "admin" : "user")} placeholder="role (admin|user)" />
          <Input value={resource} onChange={(e) => setResource(e.target.value)} placeholder="resource" />
          <Input value={action} onChange={(e) => setAction(e.target.value)} placeholder="action" />
          <Input value={workItemId} onChange={(e) => setWorkItemId(e.target.value)} placeholder="work_item_id" />
          <Button onClick={requestGrant}>Request</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Active and Pending</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {grants.map((g) => (
            <div key={g.id} className="flex items-center justify-between border rounded p-2">
              <div className="text-sm">{g.principal} :: {g.resource}:{g.action} [{g.status}]</div>
              {g.status === "pending_approval" && role === "admin" && <Button size="sm" onClick={() => approve(g.id)}>Approve</Button>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
