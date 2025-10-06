import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mic, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

export function CommandInput() {
  const [command, setCommand] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;

    toast.success("Command received", {
      description: `Processing: ${command}`,
    });

    setCommand("");
  };

  return (
    <Card className="p-6 bg-card/50 backdrop-blur-sm border-primary/20">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Natural Language Interface</h3>
      </div>
      
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="Tell me what to do... (e.g., 'organize my downloads folder')"
          className="flex-1 bg-secondary/50 border-border font-mono"
        />
        
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="border-accent/50 hover:bg-accent/10"
        >
          <Mic className="h-4 w-4" />
        </Button>
        
        <Button
          type="submit"
          className="bg-gradient-primary hover:shadow-glow-primary transition-all"
        >
          <Send className="h-4 w-4 mr-2" />
          Send
        </Button>
      </form>
      
      <div className="mt-4 flex flex-wrap gap-2">
        {["Organize files", "Clean duplicates", "Backup to cloud", "Analyze usage"].map((suggestion) => (
          <Button
            key={suggestion}
            variant="outline"
            size="sm"
            onClick={() => setCommand(suggestion)}
            className="text-xs font-mono border-muted hover:border-primary/50"
          >
            {suggestion}
          </Button>
        ))}
      </div>
    </Card>
  );
}