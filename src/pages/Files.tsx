import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FolderTree, Upload, FileText, Code, Download, RefreshCw, Clock, ScrollText } from "lucide-react";

interface FileEntry {
  name: string;
  path: string;
  size: number;
  modified: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}

function FileList({ files, loading }: { files: FileEntry[]; loading: boolean }) {
  if (loading) return (
    <div className="flex items-center gap-2 py-6 text-muted-foreground text-sm justify-center">
      <RefreshCw className="h-4 w-4 animate-spin" /> Loading...
    </div>
  );
  if (!files.length) return (
    <div className="py-6 text-center text-muted-foreground text-sm">No files found</div>
  );
  return (
    <div className="space-y-1">
      {files.map(f => (
        <div key={f.path} className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-accent/30 transition-colors">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs font-mono truncate">{f.name}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <span className="text-[0.65rem] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />{new Date(f.modified).toLocaleDateString()}
            </span>
            <Badge variant="outline" className="text-[0.6rem] h-4 px-1">{formatSize(f.size)}</Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

const Files = () => {
  const [blueprints, setBlueprints] = useState<FileEntry[]>([]);
  const [configs, setConfigs] = useState<FileEntry[]>([]);
  const [reports, setReports] = useState<FileEntry[]>([]);
  const [loadingBlueprints, setLoadingBlueprints] = useState(true);
  const [loadingConfigs, setLoadingConfigs] = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoadingBlueprints(true); setLoadingConfigs(true); setLoadingReports(true);

    fetch('/api/files/blueprints')
      .then(r => r.ok ? r.json() : { blueprints: [] })
      .then(d => setBlueprints(d.blueprints ?? []))
      .catch(() => setBlueprints([]))
      .finally(() => setLoadingBlueprints(false));

    fetch('/api/files/configs')
      .then(r => r.ok ? r.json() : { configs: [] })
      .then(d => setConfigs(d.configs ?? []))
      .catch(() => setConfigs([]))
      .finally(() => setLoadingConfigs(false));

    fetch('/api/files/reports')
      .then(r => r.ok ? r.json() : { reports: [] })
      .then(d => setReports(d.reports ?? []))
      .catch(() => setReports([]))
      .finally(() => setLoadingReports(false));
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wide uppercase text-primary font-heading">Files</p>
          <h2 className="mt-1 text-2xl font-semibold font-heading">Files & Artifacts</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Blueprints, configs, and exports from your agent workflows.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
          <Button disabled size="sm" title="Upload via CLI or drag-drop to ops/reports/">
            <Upload className="h-4 w-4 mr-1.5" /> Upload
          </Button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-lg">
              <FileText className="h-4 w-4 text-primary" /> Blueprints
              <Badge variant="secondary" className="ml-auto text-xs">{blueprints.length}</Badge>
            </CardTitle>
            <CardDescription>PRDs + plan docs from plans/</CardDescription>
          </CardHeader>
          <CardContent><FileList files={blueprints} loading={loadingBlueprints} /></CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-lg">
              <Code className="h-4 w-4 text-accent" /> Configs
              <Badge variant="secondary" className="ml-auto text-xs">{configs.length}</Badge>
            </CardTitle>
            <CardDescription>YAML/JSON from archonx/config/</CardDescription>
          </CardHeader>
          <CardContent><FileList files={configs} loading={loadingConfigs} /></CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-lg">
              <ScrollText className="h-4 w-4 text-green-500" /> Reports
              <Badge variant="secondary" className="ml-auto text-xs">{reports.length}</Badge>
            </CardTitle>
            <CardDescription>JSON/JSONL from ops/reports/</CardDescription>
          </CardHeader>
          <CardContent><FileList files={reports} loading={loadingReports} /></CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Files;
