import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { accessKernelApi } from "@/services/accessKernelApi";

export default function AccessVoice() {
  const [command, setCommand] = useState("status");
  const [workItemId, setWorkItemId] = useState("WI-VOICE-1001");
  const [result, setResult] = useState("");

  const run = async () => {
    const res = await accessKernelApi.voiceSimulate({
      caller: "+15550000001",
      passphrase: "archonx-passphrase",
      pin: "1234",
      action: command,
      work_item_id: workItemId,
      args: {},
    });
    setResult(JSON.stringify(res, null, 2));
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Voice Gateway</h2>
      <Card>
        <CardHeader><CardTitle>Simulate Voice Action</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input value={command} onChange={(e) => setCommand(e.target.value)} placeholder="status|list_approvals|doctor" />
          <Input value={workItemId} onChange={(e) => setWorkItemId(e.target.value)} placeholder="work_item_id" />
          <Button onClick={run}>Run</Button>
          <pre className="text-xs whitespace-pre-wrap">{result}</pre>
        </CardContent>
      </Card>
    </div>
  );
}
