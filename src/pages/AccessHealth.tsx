import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { accessKernelApi } from "@/services/accessKernelApi";

export default function AccessHealth() {
  const [health, setHealth] = useState("");

  const load = async () => {
    const h = await accessKernelApi.health();
    setHealth(JSON.stringify(h, null, 2));
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Access Kernel Health</h2>
      <Card>
        <CardHeader><CardTitle>Service Status</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={load}>Refresh</Button>
          <pre className="text-xs whitespace-pre-wrap">{health}</pre>
        </CardContent>
      </Card>
    </div>
  );
}
