import { Card } from "@/components/ui/card";
import { FolderTree } from "lucide-react";

const Files = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            File System
          </h1>
          <p className="text-muted-foreground">
            Browse and manage indexed files
          </p>
        </div>

        <Card className="p-12 bg-card/50 backdrop-blur-sm text-center">
          <FolderTree className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">File Explorer Coming Soon</h3>
          <p className="text-muted-foreground">
            The file system visualizer will display your indexed files here
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Files;