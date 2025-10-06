import { Card } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

const Settings = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            Settings
          </h1>
          <p className="text-muted-foreground">
            Configure agent behavior and preferences
          </p>
        </div>

        <Card className="p-12 bg-card/50 backdrop-blur-sm text-center">
          <SettingsIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">Settings Panel Coming Soon</h3>
          <p className="text-muted-foreground">
            Model selection, cloud sync, and safety settings will appear here
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Settings;