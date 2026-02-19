import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderTree, Upload, FileText, Code } from "lucide-react";

const Files = () => {
  return (
    <div className="space-y-6 p-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wide uppercase text-primary font-heading">
            Files
          </p>
          <h2 className="mt-1 text-2xl font-semibold font-heading">Files & Artifacts</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Blueprints, configs, and exports from your agent workflows.
          </p>
        </div>
        <Button disabled className="gap-2">
          <Upload className="h-4 w-4" />
          Upload File
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border ">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-lg">
              <FileText className="h-4 w-4 text-primary" />
              Blueprints
            </CardTitle>
            <CardDescription>Project specifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border bg-secondary p-6 text-center text-muted-foreground">
              <p className="text-sm">No blueprints yet</p>
              <p className="mt-1 text-xs">Generated from /darya/blueprint</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border ">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-lg">
              <Code className="h-4 w-4 text-accent" />
              Configs
            </CardTitle>
            <CardDescription>Agent YAML configurations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border bg-secondary p-6 text-center text-muted-foreground">
              <p className="text-sm">No configs yet</p>
              <p className="mt-1 text-xs">From config/agents/</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border ">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-lg">
              <FolderTree className="h-4 w-4 text-success" />
              Exports
            </CardTitle>
            <CardDescription>Downloaded artifacts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border bg-secondary p-6 text-center text-muted-foreground">
              <p className="text-sm">No exports yet</p>
              <p className="mt-1 text-xs">CSV, JSON, YAML exports</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Files;