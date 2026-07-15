import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { accessKernelApi } from "@/services/accessKernelApi";

export default function AccessSecrets() {
  const [name, setName] = useState("demo-secrets");
  const [payload, setPayload] = useState('{"API_KEY":"demo"}');
  const [workItemId, setWorkItemId] = useState("WI-UI-1001");
  const [result, setResult] = useState("");

  const upload = async () => {
    const parsed = JSON.parse(payload) as Record<string, string>;
    const res = await accessKernelApi.uploadSecret({
      principal: "dashboard-user",
      work_item_id: workItemId,
      name,
      payload: parsed,
    });
    setResult(JSON.stringify(res, null, 2));
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Secrets</h2>
      <Card>
        <CardHeader><CardTitle>Upload JSON Secret</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="secret name" />
          <Input value={workItemId} onChange={(e) => setWorkItemId(e.target.value)} placeholder="work_item_id" />
          <Textarea value={payload} onChange={(e) => setPayload(e.target.value)} className="min-h-[120px]" />
          <Button onClick={upload}>Upload</Button>
          <pre className="text-xs whitespace-pre-wrap">{result}</pre>
        </CardContent>
      </Card>
    </div>
  );
}
