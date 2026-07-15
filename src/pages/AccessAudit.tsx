import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { accessKernelApi } from "@/services/accessKernelApi";

export default function AccessAudit() {
  const [audit, setAudit] = useState("");

  const load = async () => {
    const data = await accessKernelApi.exportAudit();
    setAudit(data.data || "");
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Audit</h2>
      <Card>
        <CardHeader><CardTitle>Audit Timeline + Export</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={load}>Load JSONL</Button>
          <pre className="text-xs whitespace-pre-wrap max-h-[420px] overflow-auto">{audit}</pre>
        </CardContent>
      </Card>
    </div>
  );
}
