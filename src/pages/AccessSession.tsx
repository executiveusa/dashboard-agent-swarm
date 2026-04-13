import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { accessKernelApi } from "@/services/accessKernelApi";

export default function AccessSession() {
  const [principal, setPrincipal] = useState("dashboard-user");
  const [result, setResult] = useState("");

  const login = async () => {
    const data = await accessKernelApi.loginMock(principal);
    setResult(JSON.stringify(data, null, 2));
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Login and Session</h2>
      <Card>
        <CardHeader><CardTitle>Mock Login</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input value={principal} onChange={(e) => setPrincipal(e.target.value)} placeholder="principal" />
          <Button onClick={login}>Login</Button>
          <pre className="text-xs whitespace-pre-wrap">{result}</pre>
        </CardContent>
      </Card>
    </div>
  );
}
